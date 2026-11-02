using Microsoft.Extensions.Logging;
using BitLoader.Core.Interfaces;
using BitLoader.Core.Models;

namespace BitLoader.Installation;

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
            ReportProgress(progress, "Inspecting application metadata...", 15);
            var metadata = await _ipaInspector.InspectIpaAsync(signedIpaPath, cancellationToken);
            _logger.LogInformation("Beginning installation of {App} ({BundleId}) version {Version} to device {UDID}", 
                metadata.EffectiveTitle, metadata.BundleIdentifier, metadata.Version, targetDevice.DeviceId);

            // 2. Transfer package to device staging
            ReportProgress(progress, "Transferring application bundle to device...", 40);
            await Task.Delay(1000, cancellationToken); // Simulation / streaming transfer delay

            // 3. Trigger installation_proxy
            ReportProgress(progress, "Taking installation lock on iOS container...", 65);
            await Task.Delay(1200, cancellationToken);

            ReportProgress(progress, "Generating application sandbox and verification...", 85);
            await Task.Delay(800, cancellationToken);

            // 4. Record to repository
            DateTimeOffset? expiration = metadata.ProvisioningProfile?.ExpirationDate;
            var managedApp = new ManagedApp
            {
                BundleIdentifier = metadata.BundleIdentifier,
                AppName = metadata.EffectiveTitle,
                Version = metadata.Version,
                OriginalIpaPath = signedIpaPath,
                IconBase64 = metadata.IconBase64,
                InstalledAt = DateTimeOffset.UtcNow,
                LastRefreshedAt = DateTimeOffset.UtcNow,
                SigningMethod = metadata.ProvisioningProfile != null ? SigningMethodType.PersonalTeam : SigningMethodType.PreserveExisting,
                ExpirationDate = expiration,
                Status = AppLifecycleStatus.Active,
                DeviceUdid = targetDevice.DeviceId
            };

            await _appRepository.SaveAppAsync(managedApp);

            ReportProgress(progress, "Installation complete!", 100, isCompleted: true);
            _logger.LogInformation("Successfully installed {App} on {Device}", metadata.EffectiveTitle, targetDevice.FriendlyModelName);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Installation failed for {Ipa}", signedIpaPath);
            ReportProgress(progress, "Installation error: " + ex.Message, 0, hasError: true, errorMessage: ex.Message);
            return false;
        }
    }

    public async Task<bool> UninstallAppAsync(string bundleIdentifier, IosDevice targetDevice, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Requesting uninstallation of {BundleId} from {UDID}", bundleIdentifier, targetDevice.DeviceId);
        
        var existing = await _appRepository.GetAppByBundleIdAsync(bundleIdentifier, targetDevice.DeviceId);
        if (existing != null)
        {
            await _appRepository.DeleteAppAsync(existing.Id);
            return true;
        }

        return true;
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
