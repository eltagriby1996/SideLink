using Microsoft.Extensions.Logging;
using BitLoader.Core.Interfaces;
using BitLoader.Core.Models;

namespace BitLoader.Refresh;

public class RefreshService : IRefreshService
{
    private readonly IAppRepository _appRepository;
    private readonly ISigningService _signingService;
    private readonly IInstallationService _installationService;
    private readonly ILogger<RefreshService> _logger;

    public RefreshService(
        IAppRepository appRepository,
        ISigningService signingService,
        IInstallationService installationService,
        ILogger<RefreshService> logger)
    {
        _appRepository = appRepository;
        _signingService = signingService;
        _installationService = installationService;
        _logger = logger;
    }

    public async Task<IReadOnlyList<ManagedApp>> CheckAppExpirationsAsync(CancellationToken cancellationToken = default)
    {
        var apps = await _appRepository.GetAllAppsAsync();
        var updatedList = new List<ManagedApp>();
        var now = DateTimeOffset.UtcNow;

        foreach (var app in apps)
        {
            if (app.ExpirationDate.HasValue)
            {
                var remaining = app.ExpirationDate.Value - now;
                AppLifecycleStatus newStatus;

                if (remaining.TotalSeconds <= 0)
                {
                    newStatus = AppLifecycleStatus.Expired;
                }
                else if (remaining.TotalDays <= 3.0)
                {
                    newStatus = AppLifecycleStatus.ExpiringSoon;
                }
                else
                {
                    newStatus = AppLifecycleStatus.Active;
                }

                if (newStatus != app.Status)
                {
                    var updatedApp = app with { Status = newStatus };
                    await _appRepository.SaveAppAsync(updatedApp);
                    updatedList.Add(updatedApp);
                    continue;
                }
            }
            updatedList.Add(app);
        }

        return updatedList;
    }

    public async Task<ManagedApp> RefreshAppAsync(
        ManagedApp app,
        IosDevice device,
        SigningConfiguration config,
        IProgress<AppOperationProgress>? progress = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(app.OriginalIpaPath) || !File.Exists(app.OriginalIpaPath))
        {
            string err = $"Original IPA file '{app.OriginalIpaPath}' is not accessible on disk. An IPA file is required to re-sign and refresh.";
            _logger.LogWarning("{Error}", err);
            await _appRepository.UpdateStatusAsync(app.Id, AppLifecycleStatus.Failed, err);
            throw new FileNotFoundException(err);
        }

        _logger.LogInformation("Refreshing application {AppName} ({BundleId}) for device {UDID}", app.AppName, app.BundleIdentifier, device.DeviceId);
        ReportProgress(progress, $"Re-signing {app.AppName}...", 20);

        try
        {
            // 1. Re-sign IPA
            string signedIpa = await _signingService.SignIpaAsync(app.OriginalIpaPath, config, device, progress, cancellationToken);

            // 2. Re-install IPA
            ReportProgress(progress, $"Re-installing {app.AppName} to {device.FriendlyModelName}...", 60);
            bool installed = await _installationService.InstallIpaAsync(signedIpa, device, progress, cancellationToken);
            if (!installed)
            {
                throw new InvalidOperationException($"Re-installation of {app.AppName} failed.");
            }

            // 3. Update records
            var newExpiration = DateTimeOffset.UtcNow.AddDays(7);
            var updatedApp = app with
            {
                LastRefreshedAt = DateTimeOffset.UtcNow,
                ExpirationDate = newExpiration,
                Status = AppLifecycleStatus.Active,
                LastErrorMessage = null
            };

            await _appRepository.SaveAppAsync(updatedApp);
            ReportProgress(progress, $"{app.AppName} refreshed successfully!", 100, isCompleted: true);
            _logger.LogInformation("Successfully refreshed {AppName}. Next expiration: {Exp:g}", app.AppName, newExpiration);

            return updatedApp;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to refresh application {AppName}", app.AppName);
            await _appRepository.UpdateStatusAsync(app.Id, AppLifecycleStatus.Failed, ex.Message);
            ReportProgress(progress, $"Failed to refresh: {ex.Message}", 0, hasError: true, errorMessage: ex.Message);
            throw;
        }
    }

    public async Task<IReadOnlyList<ManagedApp>> RefreshAllEligibleAppsAsync(
        IosDevice device,
        SigningConfiguration config,
        IProgress<AppOperationProgress>? progress = null,
        CancellationToken cancellationToken = default)
    {
        var allApps = await CheckAppExpirationsAsync(cancellationToken);
        var eligible = allApps.Where(a => a.IsEligibleForRefresh && a.DeviceUdid == device.DeviceId).ToList();

        _logger.LogInformation("Found {Count} eligible apps to refresh for device {UDID}", eligible.Count, device.DeviceId);
        var refreshedApps = new List<ManagedApp>();

        for (int i = 0; i < eligible.Count; i++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var app = eligible[i];
            try
            {
                var refreshed = await RefreshAppAsync(app, device, config, progress, cancellationToken);
                refreshedApps.Add(refreshed);
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Skipping app {App} due to refresh failure: {Msg}", app.AppName, ex.Message);
            }
        }

        return refreshedApps;
    }

    private static void ReportProgress(IProgress<AppOperationProgress>? progress, string step, int percent, bool isCompleted = false, bool hasError = false, string? errorMessage = null)
    {
        progress?.Report(new AppOperationProgress
        {
            Title = "Refreshing Application",
            CurrentStep = step,
            PercentComplete = percent,
            IsCompleted = isCompleted,
            HasError = hasError,
            ErrorMessage = errorMessage
        });
    }
}
