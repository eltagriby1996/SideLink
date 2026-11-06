using System.Diagnostics;
using System.IO;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using SideLink.Core.Interfaces;

namespace SideLink.Signing;

public class AppleAuthService : IAppleAuthService
{
    private readonly ICredentialStore _credentialStore;
    private readonly ILogger<AppleAuthService> _logger;

    public AppleAuthService(ICredentialStore credentialStore, ILogger<AppleAuthService> logger)
    {
        _credentialStore = credentialStore;
        _logger = logger;
    }

    public static string GetProvisionerPath()
    {
        var candidates = new[]
        {
            Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "tools", "sidelink-provisioner.exe"),
            Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "sidelink-provisioner.exe"),
            @"C:\Users\HD\Desktop\SideLink\tools\sidelink-provisioner.exe"
        };
        foreach (var c in candidates)
        {
            if (File.Exists(c)) return c;
        }
        return candidates[0];
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
            return (false, false, "يرجى كتابة كلمة مرور Apple ID.");
        }

        string trimmedId = appleId.Trim();
        string trimmedPwd = password.Trim();

        _logger.LogInformation("Attempting GrandSlam SRP authentication for {Account} via SideLink Provisioner", trimmedId);

        try
        {
            string provisionerPath = GetProvisionerPath();
            if (!File.Exists(provisionerPath))
            {
                return (false, false, $"تعذر العثور على محرك التوقيع sidelink-provisioner.exe في المسار: {provisionerPath}");
            }

            var psi = new ProcessStartInfo
            {
                FileName = provisionerPath,
                Arguments = $"login --apple-id \"{trimmedId}\" --password \"{trimmedPwd}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
                StandardOutputEncoding = Encoding.UTF8
            };

            using var proc = Process.Start(psi);
            if (proc == null)
            {
                return (false, false, "فشل بدء تشغيل محرك تسجيل الدخول.");
            }

            string stdout = await proc.StandardOutput.ReadToEndAsync(cancellationToken);
            string stderr = await proc.StandardError.ReadToEndAsync(cancellationToken);
            await proc.WaitForExitAsync(cancellationToken);

            _logger.LogInformation("Provisioner login exit code: {Code}, output: {Out}", proc.ExitCode, stdout);

            if (!string.IsNullOrWhiteSpace(stdout))
            {
                try
                {
                    using var doc = JsonDocument.Parse(stdout);
                    var root = doc.RootElement;
                    bool success = root.TryGetProperty("success", out var sProp) && sProp.GetBoolean();
                    bool requires2Fa = root.TryGetProperty("requires_2fa", out var rProp) && rProp.GetBoolean();
                    string message = root.TryGetProperty("message", out var mProp) ? mProp.GetString() ?? "" : "";
                    string error = root.TryGetProperty("error", out var eProp) ? eProp.GetString() ?? "" : "";

                    if (requires2Fa)
                    {
                        await _credentialStore.SaveApplePasswordAsync(trimmedId, trimmedPwd);
                        return (false, true, !string.IsNullOrWhiteSpace(message) ? message : "📱 تم بدء إجراء التحقق بخطوتين (2FA) بنجاح من خوادم Apple!\nيرجى التحقق من جهاز الآيفون الخاص بك، ثم إدخال الرمز المكون من 6 أرقام أدناه والضغط على 'تأكيد الرمز'.");
                    }

                    if (success)
                    {
                        await _credentialStore.SaveApplePasswordAsync(trimmedId, trimmedPwd);
                        return (true, false, !string.IsNullOrWhiteSpace(message) ? message : "✓ تم تسجيل الدخول والتحقق من حساب Apple ID بنجاح!");
                    }

                    return (false, false, !string.IsNullOrWhiteSpace(error) ? error : "فشل تسجيل الدخول لدى خوادم Apple.");
                }
                catch (JsonException)
                {
                    _logger.LogWarning("Failed to parse provisioner JSON: {Out}", stdout);
                }
            }

            string errOut = !string.IsNullOrWhiteSpace(stderr) ? stderr : stdout;
            return (false, false, $"❌ خطأ أثناء الاتصال بخوادم Apple: {errOut}");
        }
        catch (OperationCanceledException)
        {
            return (false, false, "تم إلغاء عملية الاتصال بخوادم Apple.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Authentication failure for {Account}", appleId);
            return (false, false, $"❌ خطأ أثناء محاولة تسجيل الدخول: {ex.Message}");
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

        string trimmedId = appleId.Trim();
        string cleanCode = code.Trim();

        string? savedPassword = await _credentialStore.GetApplePasswordAsync(trimmedId);
        if (string.IsNullOrWhiteSpace(savedPassword))
        {
            return (false, "يرجى إعادة إدخال كلمة المرور مع رمز التحقق.");
        }

        _logger.LogInformation("Submitting 2FA verification code to Apple for account {Account}", trimmedId);

        try
        {
            string provisionerPath = GetProvisionerPath();
            if (!File.Exists(provisionerPath))
            {
                return (false, $"تعذر العثور على محرك التوقيع sidelink-provisioner.exe في المسار: {provisionerPath}");
            }

            var psi = new ProcessStartInfo
            {
                FileName = provisionerPath,
                Arguments = $"login --apple-id \"{trimmedId}\" --password \"{savedPassword}\" --code \"{cleanCode}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
                StandardOutputEncoding = Encoding.UTF8
            };

            using var proc = Process.Start(psi);
            if (proc == null)
            {
                return (false, "فشل بدء تشغيل محرك التحقق.");
            }

            string stdout = await proc.StandardOutput.ReadToEndAsync(cancellationToken);
            string stderr = await proc.StandardError.ReadToEndAsync(cancellationToken);
            await proc.WaitForExitAsync(cancellationToken);

            _logger.LogInformation("Provisioner 2FA exit code: {Code}, output: {Out}", proc.ExitCode, stdout);

            if (!string.IsNullOrWhiteSpace(stdout))
            {
                try
                {
                    using var doc = JsonDocument.Parse(stdout);
                    var root = doc.RootElement;
                    bool success = root.TryGetProperty("success", out var sProp) && sProp.GetBoolean();
                    string message = root.TryGetProperty("message", out var mProp) ? mProp.GetString() ?? "" : "";
                    string error = root.TryGetProperty("error", out var eProp) ? eProp.GetString() ?? "" : "";

                    if (success)
                    {
                        return (true, !string.IsNullOrWhiteSpace(message) ? message : "✓ تم تأكيد رمز 2FA بنجاح من خوادم Apple! الحساب موثق وجاهز لتوقيع التطبيقات.");
                    }

                    return (false, !string.IsNullOrWhiteSpace(error) ? error : "رمز التحقق غير صحيح أو منتهي الصلاحية.");
                }
                catch (JsonException)
                {
                    _logger.LogWarning("Failed to parse 2FA response JSON: {Out}", stdout);
                }
            }

            string errOut = !string.IsNullOrWhiteSpace(stderr) ? stderr : stdout;
            return (false, $"❌ خطأ أثناء تأكيد رمز 2FA: {errOut}");
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
