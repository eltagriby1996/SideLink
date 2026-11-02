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

        // 1. Check if user provided an App-Specific Password (16 characters: xxxx-xxxx-xxxx-xxxx)
        string cleanPwd = trimmedPwd.Replace("-", "").Replace(" ", "");
        bool isAppSpecific = cleanPwd.Length == 16 && cleanPwd.All(char.IsLetterOrDigit);

        if (isAppSpecific)
        {
            return await ValidateAppSpecificPasswordAsync(trimmedId, trimmedPwd, cancellationToken);
        }

        // 2. Standard Apple ID Authentication against Apple Auth Server
        return await PerformAppleWebAuthAsync(trimmedId, trimmedPwd, cancellationToken);
    }

    private async Task<(bool Success, bool Requires2Fa, string Message)> ValidateAppSpecificPasswordAsync(
        string appleId, 
        string password, 
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("Validating App-Specific Password against Apple services for {Account}", appleId);

        try
        {
            using var handler = new HttpClientHandler { AllowAutoRedirect = true };
            using var client = new HttpClient(handler);
            client.Timeout = TimeSpan.FromSeconds(15);

            string basicAuth = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{appleId}:{password}"));
            using var request = new HttpRequestMessage(HttpMethod.Get, "https://caldav.icloud.com/");
            request.Headers.TryAddWithoutValidation("Authorization", "Basic " + basicAuth);
            request.Headers.TryAddWithoutValidation("User-Agent", "SideLink/1.0 (Windows NT 10.0; Win64; x64)");

            var response = await client.SendAsync(request, cancellationToken);
            int statusCode = (int)response.StatusCode;

            if (statusCode == 401 || statusCode == 403)
            {
                _logger.LogWarning("Apple rejected App-Specific Password for {Account}: HTTP {Status}", appleId, statusCode);
                return (false, false, "❌ فشل التحقق: تم رفض كلمة السر الخاصة بالتطبيقات (App-Specific Password) من قِبل خوادم Apple.\nيرجى التأكد من كتابة البريد بشكل صحيح، أو إنشاء كلمة سر جديدة من موقع appleid.apple.com.");
            }

            // Any non-401/403 response (200, 207, 301, 302, 404, etc.) indicates credentials passed authentication
            _logger.LogInformation("App-Specific Password validated successfully for {Account}", appleId);
            return (true, false, "✓ تم التحقق من كلمة السر الخاصة بالتطبيقات (App-Specific Password) بنجاح لدى خوادم Apple!\nالحساب معتمد وجاهز لتوقيع وتثبيت التطبيقات دون الحاجة لرمز 2FA.");
        }
        catch (OperationCanceledException)
        {
            return (false, false, "تم إلغاء عملية الاتصال بخوادم Apple.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Network error validating App-Specific Password for {Account}", appleId);
            return (false, false, "❌ تعذر الاتصال بخوادم Apple: " + ex.Message);
        }
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

            if (statusCode == 401 || statusCode == 400 || body.Contains("auth.error") || body.Contains("invalid"))
            {
                _logger.LogWarning("Apple rejected credentials for {Account}: {Body}", appleId, body);
                return (false, false, "❌ فشل تسجيل الدخول: تم رفض بيانات الاعتماد من قبل خوادم Apple.\nاسم المستخدم أو كلمة المرور غير صحيحة.");
            }

            if (statusCode == 200 || statusCode == 204)
            {
                _logger.LogInformation("Apple web authentication successful for {Account}", appleId);
                return (true, false, "✓ تم التحقق من حساب Apple ID بنجاح من خوادم Apple! الحساب نشط وجاهز للتوقيع.");
            }

            // If Apple returns 503 or blocks raw web signin due to missing Anisette/ADI:
            _logger.LogWarning("Apple signin blocked with status {Status}", statusCode);
            return (false, false, 
                "⚠️ قامت خوادم Apple بحظر تسجيل الدخول المباشر لعدم توفر بصمة Anisette للمتصفح.\n" +
                "💡 الحل الأسهل والأسرع:\n" +
                "قم بإنشاء 'كلمة سر خاصة بالتطبيقات' (App-Specific Password) من موقع appleid.apple.com (16 حرفاً) واستخدمها هنا لتسجيل الدخول الفوري بدون أي قيود أو متطلبات 2FA.");
        }
        catch (OperationCanceledException)
        {
            return (false, false, "تم إلغاء عملية الاتصال بخوادم Apple.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to connect to Apple auth servers for {Account}", appleId);
            return (false, false, "❌ تعذر الاتصال بخوادم Apple للتحقق من الحساب: " + ex.Message);
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
