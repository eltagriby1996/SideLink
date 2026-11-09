using System;
using System.IO;
using System.IO.Compression;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using SideLink.Core.Interfaces;
using SideLink.Core.Models;

namespace SideLink.Installation;

public class MobileCompanionService : IMobileCompanionService
{
    private readonly ISigningService _signingService;
    private readonly IInstallationService _installationService;
    private readonly IAppleIdentityService _identityService;
    private readonly HttpClient _httpClient;
    private readonly ILogger<MobileCompanionService> _logger;
    private readonly string _cloudApiBaseUrl;

    public MobileCompanionService(
        ISigningService signingService,
        IInstallationService installationService,
        IAppleIdentityService identityService,
        HttpClient httpClient,
        ILogger<MobileCompanionService> logger,
        string? cloudApiBaseUrl = null)
    {
        _signingService = signingService;
        _installationService = installationService;
        _identityService = identityService;
        _httpClient = httpClient;
        _logger = logger;
        _cloudApiBaseUrl = string.IsNullOrWhiteSpace(cloudApiBaseUrl)
            ? (Environment.GetEnvironmentVariable("SIDELINK_CLOUD_URL") ?? "https://sidelink-web.vercel.app")
            : cloudApiBaseUrl;
    }

    public MobilePairingInfo DetectPairingFile(string udid)
    {
        if (string.IsNullOrWhiteSpace(udid))
        {
            return new MobilePairingInfo { Udid = udid ?? string.Empty };
        }

        string cleanUdid = udid.Trim();
        string lockdownDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
            "Apple",
            "Lockdown");

        if (!Directory.Exists(lockdownDir))
        {
            return new MobilePairingInfo { Udid = cleanUdid };
        }

        // Try exact UDID match
        string exactPath = Path.Combine(lockdownDir, $"{cleanUdid}.plist");
        if (File.Exists(exactPath))
        {
            var fi = new FileInfo(exactPath);
            return new MobilePairingInfo
            {
                Udid = cleanUdid,
                PairingFilePath = exactPath,
                FileSizeBytes = fi.Length,
                LastModified = fi.LastWriteTimeUtc
            };
        }

        // Try without hyphens or uppercase/lowercase variations
        string withoutHyphens = cleanUdid.Replace("-", "");
        foreach (var file in Directory.GetFiles(lockdownDir, "*.plist"))
        {
            string fileName = Path.GetFileNameWithoutExtension(file);
            string fileNoHyphens = fileName.Replace("-", "");

            if (string.Equals(fileName, cleanUdid, StringComparison.OrdinalIgnoreCase) ||
                string.Equals(fileNoHyphens, withoutHyphens, StringComparison.OrdinalIgnoreCase))
            {
                var fi = new FileInfo(file);
                return new MobilePairingInfo
                {
                    Udid = cleanUdid,
                    PairingFilePath = file,
                    FileSizeBytes = fi.Length,
                    LastModified = fi.LastWriteTimeUtc
                };
            }
        }

        return new MobilePairingInfo { Udid = cleanUdid };
    }

    public async Task<(bool Success, string Message, string? DownloadUrl)> SyncPairingToCloudAsync(
        string udid,
        string deviceName,
        string appleId,
        CancellationToken cancellationToken = default)
    {
        var pairing = DetectPairingFile(udid);
        if (!pairing.Exists)
        {
            return (false, "ملف الاقتران غير موجود على هذا الكمبيوتر.", null);
        }

        try
        {
            byte[] fileBytes = await File.ReadAllBytesAsync(pairing.PairingFilePath, cancellationToken);
            string base64Data = Convert.ToBase64String(fileBytes);

            var payload = new
            {
                udid = udid.Trim(),
                deviceName = string.IsNullOrWhiteSpace(deviceName) ? "iPhone" : deviceName.Trim(),
                pairingData = base64Data,
                appleId = appleId.Trim()
            };

            string json = JsonSerializer.Serialize(payload);
            using var content = new StringContent(json, Encoding.UTF8, "application/json");

            string requestUrl = $"{_cloudApiBaseUrl.TrimEnd('/')}/api/mobile/pairing";
            var response = await _httpClient.PostAsync(requestUrl, content, cancellationToken);

            if (response.IsSuccessStatusCode)
            {
                string downloadUrl = $"{_cloudApiBaseUrl.TrimEnd('/')}/api/mobile/pairing?udid={Uri.EscapeDataString(udid.Trim())}&format=download";
                _logger.LogInformation("Successfully synced pairing file to cloud for UDID {Udid}", udid);
                return (true, "تمت مزامنة ملف الاقتران بنجاح مع السحابة.", downloadUrl);
            }

            string errContent = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogWarning("Cloud pairing sync failed ({Status}): {Body}", response.StatusCode, errContent);
            return (false, $"فشلت المزامنة السحابية: {response.StatusCode}", null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error syncing pairing file to cloud for UDID {Udid}", udid);
            return (false, $"خطأ في الاتصال بالخادم السحابي: {ex.Message}", null);
        }
    }

    public string GenerateWireGuardConfig()
    {
        // Loopback WireGuard configuration for SideStore iOS on-device signing
        // Redirects local loopback traffic through local virtual interface
        return 
@"[Interface]
PrivateKey = aAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
Address = 10.7.0.1/24
DNS = 127.0.0.1

[Peer]
PublicKey = bBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=
AllowedIPs = 10.7.0.0/24
Endpoint = 127.0.0.1:51820
PersistentKeepalive = 25";
    }

    public async Task<bool> PrepareAndInstallCompanionAsync(
        IosDevice device,
        string appleId,
        IProgress<AppOperationProgress>? progress = null,
        CancellationToken cancellationToken = default)
    {
        Report(progress, "فحص ملف اقتران الآيفون (Lockdown Pairing File)...", 10);

        var pairing = DetectPairingFile(device.DeviceId);
        if (!pairing.Exists)
        {
            Report(progress, "خطأ: لم يتم العثور على ملف اقتران الآيفون. يرجى توصيل الكابل واختيار 'وثوق' على الهاتف.", 0, hasError: true);
            return false;
        }

        // 1. Locate base SideStore companion IPA
        Report(progress, "البحث عن حزمة SideLink Companion...", 20);
        string? sourceIpa = FindCompanionIpa();
        if (sourceIpa == null || !File.Exists(sourceIpa))
        {
            Report(progress, "خطأ: لم يتم العثور على ملف SideStore.ipa داخل مجلد البرنامج.", 0, hasError: true);
            return false;
        }

        string tempDir = Path.Combine(Path.GetTempPath(), "SideLink_Companion_" + Guid.NewGuid().ToString("N")[..8]);
        Directory.CreateDirectory(tempDir);
        string stagedIpaPath = Path.Combine(tempDir, "SideLinkCompanion_staged.ipa");

        try
        {
            // 2. Copy and inject ALTPairingFile.plist into companion IPA
            Report(progress, "حقن ملف الاقتران ALTPairingFile.plist داخل التطبيق...", 35);
            File.Copy(sourceIpa, stagedIpaPath, true);

            byte[] pairingBytes = await File.ReadAllBytesAsync(pairing.PairingFilePath, cancellationToken);
            using (var zip = ZipFile.Open(stagedIpaPath, ZipArchiveMode.Update))
            {
                // Find app folder (e.g. Payload/SideStore.app/)
                string appDir = "Payload/SideStore.app/";
                foreach (var entry in zip.Entries)
                {
                    if (entry.FullName.StartsWith("Payload/", StringComparison.OrdinalIgnoreCase) && 
                        entry.FullName.EndsWith(".app/", StringComparison.OrdinalIgnoreCase))
                    {
                        appDir = entry.FullName;
                        break;
                    }
                }

                string targetEntryName = appDir + "ALTPairingFile.plist";
                var existing = zip.GetEntry(targetEntryName);
                existing?.Delete();

                var newEntry = zip.CreateEntry(targetEntryName, CompressionLevel.Optimal);
                using (var es = newEntry.Open())
                {
                    await es.WriteAsync(pairingBytes, cancellationToken);
                }
            }

            // 3. Digitally sign the companion app with personal Apple ID
            Report(progress, "توقيع تطبيق SideLink بشهادة حسابك الشخصية الرقمية...", 55);
            var signingConfig = new SigningConfiguration
            {
                Method = SigningMethodType.PersonalTeam,
                AppleId = appleId,
                CustomBundleId = "com.sidelink.companion",
                ModifyBundleId = true,
                CustomDisplayName = "SideLink Mobile"
            };

            string signedIpaPath = await _signingService.SignIpaAsync(
                stagedIpaPath,
                signingConfig,
                device,
                progress,
                cancellationToken);

            if (string.IsNullOrWhiteSpace(signedIpaPath) || !File.Exists(signedIpaPath))
            {
                Report(progress, "فشلت عملية توقيع التطبيق الرقمي.", 0, hasError: true);
                return false;
            }

            // 4. Install signed IPA to iPhone
            Report(progress, "تثبيت SideLink Mobile على جهاز الآيفون...", 80);
            bool installed = await _installationService.InstallIpaAsync(
                signedIpaPath,
                device,
                progress,
                cancellationToken);

            if (!installed)
            {
                Report(progress, "فشل تثبيت التطبيق على جهاز الآيفون.", 0, hasError: true);
                return false;
            }

            // 5. Sync pairing file to cloud in background
            Report(progress, "مزامنة ملف الاقتران السحابي للتجديد عن بعد مدى الحياة...", 95);
            _ = Task.Run(() => SyncPairingToCloudAsync(device.DeviceId, device.DeviceName, appleId, CancellationToken.None));

            Report(progress, "🎉 تم تثبيت وتفعيل SideLink Mobile على الآيفون بنجاح!", 100);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to prepare and install companion for device {DeviceId}", device.DeviceId);
            Report(progress, $"حدث خطأ أثناء تثبيت SideLink Mobile: {ex.Message}", 0, hasError: true, errorMessage: ex.Message);
            return false;
        }
        finally
        {
            try
            {
                if (Directory.Exists(tempDir))
                {
                    Directory.Delete(tempDir, true);
                }
            }
            catch { }
        }
    }

    private string? FindCompanionIpa()
    {
        string[] searchPaths = new[]
        {
            Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "assets", "SideStore.ipa"),
            Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "SideStore.ipa"),
            @"C:\Users\HD\Desktop\SideLink\assets\SideStore.ipa",
            @"E:\downloads\SideStore.ipa",
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads", "SideStore.ipa")
        };

        foreach (var path in searchPaths)
        {
            if (File.Exists(path))
            {
                _logger.LogInformation("Found SideStore companion IPA at: {Path}", path);
                return path;
            }
        }

        return null;
    }

    private static void Report(
        IProgress<AppOperationProgress>? progress,
        string step,
        int percentage,
        bool hasError = false,
        string? errorMessage = null)
    {
        progress?.Report(new AppOperationProgress
        {
            CurrentStep = step,
            PercentComplete = percentage,
            HasError = hasError,
            ErrorMessage = errorMessage
        });
    }
}
