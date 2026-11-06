using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using SideLink.Core.Interfaces;

namespace SideLink.Signing;

public class AppleAuthService : IAppleAuthService
{
    private readonly ILogger<AppleAuthService> _logger;
    private readonly IAnisetteClient _anisetteClient;
    private readonly CookieContainer _cookieContainer = new();
    private string? _currentSessionToken;

    public AppleAuthService(IAnisetteClient anisetteClient, ILogger<AppleAuthService> logger)
    {
        _anisetteClient = anisetteClient;
        _logger = logger;
    }

    public async Task<(bool Success, bool Requires2Fa, string Message)> AuthenticateAsync(
        string appleId, 
        string password, 
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(appleId) || !appleId.Contains("@"))
        {
            return (false, false, "يرجى إدخال بريد Apple ID صحيح (مثال: user@icloud.com).");
        }

        if (string.IsNullOrWhiteSpace(password))
        {
            return (false, false, "يرجى كتابة كلمة مرور Apple ID أو كلمة السر الخاصة بالتطبيق (App-Specific Password).");
        }

        string trimmedId = appleId.Trim();
        string trimmedPwd = password.Trim();

        // Standard Apple ID Authentication against Apple Auth Server
        return await PerformAppleWebAuthAsync(trimmedId, trimmedPwd, cancellationToken);
    }

    private async Task<(bool Success, bool Requires2Fa, string Message)> PerformAppleWebAuthAsync(
        string appleId, 
        string password, 
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("Attempting Apple ID web authentication for {Account}", appleId);

        try
        {
            using var handler = new HttpClientHandler
            {
                CookieContainer = _cookieContainer,
                AllowAutoRedirect = true
            };
            using var client = new HttpClient(handler);
            client.Timeout = TimeSpan.FromSeconds(20);

            // 1. Fetch real Anisette device attestation headers
            try
            {
                var aniHeaders = await _anisetteClient.GetAnisetteHeadersAsync(cancellationToken);
                foreach (var kvp in aniHeaders)
                {
                    client.DefaultRequestHeaders.TryAddWithoutValidation(kvp.Key, kvp.Value);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Anisette provider warning: {Message}", ex.Message);
            }

            client.DefaultRequestHeaders.TryAddWithoutValidation("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            client.DefaultRequestHeaders.TryAddWithoutValidation("Accept", "application/json, text/javascript");
            client.DefaultRequestHeaders.TryAddWithoutValidation("X-Apple-Domain-Id", "1");
            client.DefaultRequestHeaders.TryAddWithoutValidation("X-Requested-With", "XMLHttpRequest");
            client.DefaultRequestHeaders.TryAddWithoutValidation("Origin", "https://appleid.apple.com");
            client.DefaultRequestHeaders.TryAddWithoutValidation("Referer", "https://appleid.apple.com/");

            var payload = new
            {
                accountName = appleId,
                password = password,
                rememberMe = false
            };
            string json = JsonSerializer.Serialize(payload);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await client.PostAsync("https://idmsa.apple.com/appleauth/auth/signin", content, cancellationToken);
            int statusCode = (int)response.StatusCode;
            string body = await response.Content.ReadAsStringAsync(cancellationToken);

            _logger.LogInformation("Apple signin responded with HTTP {Status}", statusCode);

            if (statusCode == 409 || body.Contains("trustedDevice") || body.Contains("securityCode") || body.Contains("2sv") || body.Contains("2fa"))
            {
                // Capture session header if present
                if (response.Headers.TryGetValues("scnt", out var scntValues))
                {
                    _currentSessionToken = scntValues.FirstOrDefault();
                }

                _logger.LogInformation("2FA challenge received from Apple for {Account}", appleId);
                return (false, true, "📱 بيانات الحساب صحيحة! تم بدء إجراء التحقق بخطوتين (2FA) من Apple.\nتحقق الآن من ظهور الإشعار على جهاز الآيفون الخاص بك، ثم أدخل الرمز المكون من 6 أرقام أدناه واضغط 'تأكيد الرمز'.");
            }

            if (statusCode == 401 || statusCode == 400 || body.Contains("auth.error") || body.Contains("invalid") || body.Contains("notFound"))
            {
                _logger.LogWarning("Apple rejected credentials for {Account}: {Body}", appleId, body);
                return (false, false, "❌ فشل تسجيل الدخول: تم رفض بيانات الاعتماد من قبل خوادم Apple.\nاسم المستخدم أو كلمة المرور غير صحيحة.");
            }

            if (statusCode == 200 || statusCode == 204)
            {
                _logger.LogInformation("Apple web authentication successful for {Account}", appleId);
                return (true, false, "✓ تم التحقق من حساب Apple ID بنجاح من خوادم Apple!");
            }

            if (statusCode == 503)
            {
                _logger.LogWarning("Apple signin blocked by Apple anti-bot / service restriction (HTTP 503)");
                return (false, false, 
                    "⚠️ خوادم Apple حظرت تسجيل الدخول المباشر (رمز 503: Service Temporarily Unavailable).\n" +
                    "Apple تفرض حماية مشددة على واجهة تسجيل الدخول المباشر.\n" +
                    "💡 لتوقيع وتثبيت تطبيقاتك فوراً يمكنك استخدام:\n" +
                    "1. خيار (شهادة P12 مخصصة) لاختيار ملف P12 و Mobileprovision صالحين.\n" +
                    "2. أو قم بتسجيل الدخول عبر أداة iloader ليتم استخراج الشهادة تلقائياً إلى نظام ويندوز، وسيلتقطها SideLink فوراً.");
            }

            _logger.LogWarning("Apple signin responded with unexpected status {Status}: {Body}", statusCode, body);
            return (false, false, $"❌ فشل تسجيل الدخول لدى خوادم Apple (رمز الاستجابة: {statusCode}). يرجى التأكد من كتابة البريد وكلمة المرور بشكل صحيح.");
        }
        catch (OperationCanceledException)
        {
            return (false, false, "تم إلغاء عملية الاتصال بخوادم Apple.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to connect to Apple auth servers for {Account}", appleId);
            return (false, false, $"❌ تعذر الاتصال بخوادم Apple: {ex.Message}. يرجى التأكد من اتصال الإنترنت وحاول مجدداً.");
        }
    }

    public async Task<(bool Success, string Message)> VerifyTwoFactorCodeAsync(
        string appleId, 
        string code, 
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(code) || code.Trim().Length < 6)
        {
            return (false, "يرجى إدخال رمز التحقق المكون من 6 أرقام بالكامل.");
        }

        string cleanCode = code.Trim();
        _logger.LogInformation("Verifying 2FA code with Apple for account {Account}", appleId);

        try
        {
            using var handler = new HttpClientHandler
            {
                CookieContainer = _cookieContainer,
                AllowAutoRedirect = true
            };
            using var client = new HttpClient(handler);
            client.Timeout = TimeSpan.FromSeconds(20);

            try
            {
                var aniHeaders = await _anisetteClient.GetAnisetteHeadersAsync(cancellationToken);
                foreach (var kvp in aniHeaders)
                {
                    client.DefaultRequestHeaders.TryAddWithoutValidation(kvp.Key, kvp.Value);
                }
            }
            catch { }

            client.DefaultRequestHeaders.TryAddWithoutValidation("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
            client.DefaultRequestHeaders.TryAddWithoutValidation("Accept", "application/json, text/javascript");
            client.DefaultRequestHeaders.TryAddWithoutValidation("X-Apple-Domain-Id", "1");
            client.DefaultRequestHeaders.TryAddWithoutValidation("X-Requested-With", "XMLHttpRequest");
            client.DefaultRequestHeaders.TryAddWithoutValidation("Origin", "https://appleid.apple.com");
            client.DefaultRequestHeaders.TryAddWithoutValidation("Referer", "https://appleid.apple.com/");

            if (!string.IsNullOrEmpty(_currentSessionToken))
            {
                client.DefaultRequestHeaders.TryAddWithoutValidation("scnt", _currentSessionToken);
            }

            var payload = new
            {
                securityCode = new { code = cleanCode }
            };
            string json = JsonSerializer.Serialize(payload);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await client.PostAsync("https://idmsa.apple.com/appleauth/auth/verify/trusteddevice", content, cancellationToken);
            int statusCode = (int)response.StatusCode;

            if (statusCode != 200 && statusCode != 204)
            {
                // Fallback attempt: SMS / Phone verification endpoint
                try
                {
                    using var phoneContent = new StringContent(json, Encoding.UTF8, "application/json");
                    var phoneResponse = await client.PostAsync("https://idmsa.apple.com/appleauth/auth/verify/phone", phoneContent, cancellationToken);
                    if (phoneResponse.IsSuccessStatusCode)
                    {
                        statusCode = (int)phoneResponse.StatusCode;
                    }
                }
                catch { }
            }

            if (statusCode == 200 || statusCode == 204)
            {
                _logger.LogInformation("2FA code accepted by Apple for account {Account}", appleId);
                return (true, "✓ تم التحقق من رمز المصادقة الثنائية (2FA) بنجاح من خوادم Apple! الحساب مفعل وجاهز للتوقيع.");
            }

            _logger.LogWarning("Apple rejected 2FA code: HTTP {Status}", statusCode);
            return (false, "❌ رمز التحقق غير صحيح أو انتهت صلاحيته لدى خوادم Apple. يرجى التأكد من كتابة الأرقام الستة بشكل صحيح أو طلب رمز جديد.");
        }
        catch (OperationCanceledException)
        {
            return (false, "تم إلغاء عملية التحقق.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to verify 2FA code with Apple for {Account}", appleId);
            return (false, "❌ خطأ أثناء تأكيد الرمز مع خوادم Apple: " + ex.Message);
        }
    }
}
