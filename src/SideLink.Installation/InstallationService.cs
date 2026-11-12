using Microsoft.Extensions.Logging;
using SideLink.Core.Interfaces;
using SideLink.Core.Models;

namespace SideLink.Installation;

public class InstallationService : IInstallationService
{
    private readonly IIpaInspectorService _ipaInspector;
    private readonly IAppRepository _appRepository;
    private readonly ILogger<InstallationService> _logger;

    public InstallationService(
        IIpaInspectorService ipaInspector,
        IAppRepository appRepository,
        ILogger<InstallationService> logger)
    {
        _ipaInspector = ipaInspector;
        _appRepository = appRepository;
        _logger = logger;
    }

    public async Task<bool> InstallIpaAsync(
        string signedIpaPath,
        IosDevice targetDevice,
        IProgress<AppOperationProgress>? progress = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(signedIpaPath) || !File.Exists(signedIpaPath))
        {
            ReportProgress(progress, "Installation failed: IPA file not found.", 0, hasError: true, errorMessage: "IPA file not found.");
            return false;
        }

        if (targetDevice == null || !targetDevice.IsConnected)
        {
            ReportProgress(progress, "Installation failed: No device connected.", 0, hasError: true, errorMessage: "No device connected.");
            return false;
        }

        if (targetDevice.IsLocked)
        {
            ReportProgress(progress, "Device is locked with passcode. Please unlock your iPhone.", 0, hasError: true, errorMessage: "Device is locked with passcode. Please unlock your iPhone.");
            return false;
        }

        if (!targetDevice.IsTrusted)
        {
            ReportProgress(progress, "Device is untrusted. Please unlock your iPhone and tap 'Trust This Computer'.", 0, hasError: true, errorMessage: "Device untrusted.");
            return false;
        }

        try
        {
            // 1. Inspect IPA metadata
            ReportProgress(progress, "فحص بيانات حزمة التطبيق (IPA)...", 10);
            var metadata = await _ipaInspector.InspectIpaAsync(signedIpaPath, cancellationToken);
            _logger.LogInformation("Beginning installation of {App} ({BundleId}) version {Version} to device {UDID}", 
                metadata.EffectiveTitle, metadata.BundleIdentifier, metadata.Version, targetDevice.DeviceId);

            // 2. Real Native iOS Installation via Apple Mobile Device
            var (success, errorMessage) = await NativeMobileDevice.InstallIpaAsync(
                signedIpaPath, 
                targetDevice.DeviceId, 
                progress, 
                _logger, 
                cancellationToken);

            if (!success)
            {
                _logger.LogWarning("Real iOS installation rejected: {Error}", errorMessage);
                ReportProgress(progress, errorMessage ?? "فشل تثبيت التطبيق على جهاز الآيفون.", 0, hasError: true, errorMessage: errorMessage);
                return false;
            }

            // 3. Cache the IPA permanently for instant 1-click in-place renewals
            string persistentIpaPath = signedIpaPath;
            try
            {
                string cacheDir = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "SideLink",
                    "AppCache");
                Directory.CreateDirectory(cacheDir);

                string cachePath = Path.Combine(cacheDir, $"{metadata.BundleIdentifier}.ipa");
                File.Copy(signedIpaPath, cachePath, overwrite: true);
                persistentIpaPath = cachePath;
                _logger.LogInformation("Cached IPA package for {BundleId} at {Path}", metadata.BundleIdentifier, cachePath);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not cache IPA package locally for {BundleId}", metadata.BundleIdentifier);
            }

            // 4. Record to repository on verified success
            DateTimeOffset? expiration = metadata.ProvisioningProfile?.ExpirationDate;
            var managedApp = new ManagedApp
            {
                BundleIdentifier = metadata.BundleIdentifier,
                AppName = metadata.EffectiveTitle,
                Version = metadata.Version,
                OriginalIpaPath = persistentIpaPath,
                IconBase64 = metadata.IconBase64,
                InstalledAt = DateTimeOffset.UtcNow,
                LastRefreshedAt = DateTimeOffset.UtcNow,
                SigningMethod = metadata.ProvisioningProfile != null ? SigningMethodType.PersonalTeam : SigningMethodType.PreserveExisting,
                ExpirationDate = expiration,
                Status = AppLifecycleStatus.Active,
                DeviceUdid = targetDevice.DeviceId
            };

            await _appRepository.SaveAppAsync(managedApp);

            ReportProgress(progress, "تم تثبيت التطبيق بنجاح على الآيفون!", 100, isCompleted: true);
            _logger.LogInformation("Successfully installed {App} on {Device}", metadata.EffectiveTitle, targetDevice.FriendlyModelName);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Installation failed for {Ipa}", signedIpaPath);
            ReportProgress(progress, "حدث خطأ أثناء التثبيت: " + ex.Message, 0, hasError: true, errorMessage: ex.Message);
            return false;
        }
    }

    public async Task<bool> InstallProvisioningProfileAsync(
        byte[] profileData,
        IosDevice targetDevice,
        CancellationToken cancellationToken = default)
    {
        if (profileData == null || profileData.Length == 0)
        {
            _logger.LogWarning("InstallProvisioningProfileAsync: profileData is empty.");
            return false;
        }

        if (targetDevice == null || !targetDevice.IsConnected)
        {
            _logger.LogWarning("InstallProvisioningProfileAsync: No device connected.");
            return false;
        }

        var (success, errorMessage) = await NativeMobileDevice.InstallProvisioningProfileAsync(
            profileData,
            targetDevice.DeviceId,
            _logger,
            cancellationToken);

        if (!success)
        {
            _logger.LogWarning("Failed to install provisioning profile via misagent: {Error}", errorMessage);
            return false;
        }

        _logger.LogInformation("Successfully installed provisioning profile ({Bytes} bytes) directly via com.apple.misagent.", profileData.Length);
        return true;
    }

    public async Task<bool> UninstallAppAsync(string bundleIdentifier, IosDevice targetDevice, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Requesting uninstallation of {BundleId} from {UDID}", bundleIdentifier, targetDevice.DeviceId);
        
        bool nativeSuccess = await NativeMobileDevice.UninstallAppAsync(bundleIdentifier, targetDevice.DeviceId, _logger, cancellationToken);
        
        var existing = await _appRepository.GetAppByBundleIdAsync(bundleIdentifier, targetDevice.DeviceId);
        if (existing != null)
        {
            await _appRepository.DeleteAppAsync(existing.Id);
        }

        return nativeSuccess;
    }

    private static void ReportProgress(IProgress<AppOperationProgress>? progress, string step, int percent, bool isCompleted = false, bool hasError = false, string? errorMessage = null)
    {
        progress?.Report(new AppOperationProgress
        {
            Title = "Installing Application",
            CurrentStep = step,
            PercentComplete = percent,
            IsCompleted = isCompleted,
            HasError = hasError,
            ErrorMessage = errorMessage
        });
    }
}
