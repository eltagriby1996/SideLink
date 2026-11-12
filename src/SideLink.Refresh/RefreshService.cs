using Microsoft.Extensions.Logging;
using SideLink.Core.Interfaces;
using SideLink.Core.Models;

namespace SideLink.Refresh;

public class RefreshService : IRefreshService
{
    private readonly IAppRepository _appRepository;
    private readonly ISigningService _signingService;
    private readonly IInstallationService _installationService;
    private readonly IAppleIdentityService? _identityService;
    private readonly ICredentialStore? _credentialStore;
    private readonly ILogger<RefreshService> _logger;

    public RefreshService(
        IAppRepository appRepository,
        ISigningService signingService,
        IInstallationService installationService,
        IAppleIdentityService? identityService,
        ICredentialStore? credentialStore,
        ILogger<RefreshService> logger)
    {
        _appRepository = appRepository;
        _signingService = signingService;
        _installationService = installationService;
        _identityService = identityService;
        _credentialStore = credentialStore;
        _logger = logger;
    }

    public RefreshService(
        IAppRepository appRepository,
        ISigningService signingService,
        IInstallationService installationService,
        ILogger<RefreshService> logger)
        : this(appRepository, signingService, installationService, null, null, logger)
    {
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
        _logger.LogInformation("Refreshing application {AppName} ({BundleId}) for device {UDID}", app.AppName, app.BundleIdentifier, device.DeviceId);
        ReportProgress(progress, $"جاري تجديد رخصة {app.AppName} بدون نقل أو حذف أي بيانات...", 15);

        try
        {
            // 1. First: Try INSTANT in-place license renewal via iOS com.apple.misagent (Transfer 10 KB, 1-2 seconds!)
            bool instantRenewSuccess = false;
            string? profilePathToUse = null;

            string appleId = config.AppleId;
            if (string.IsNullOrWhiteSpace(appleId) && _credentialStore != null)
            {
                appleId = await _credentialStore.GetLastAppleIdAsync() ?? string.Empty;
            }

            if (!string.IsNullOrWhiteSpace(appleId) && _identityService != null)
            {
                ReportProgress(progress, $"الاتصال بخوادم Apple لتجديد رخصة الـ 7 أيام لـ {app.AppName}...", 30);
                try
                {
                    var identity = await _identityService.AutoConfigureIdentityForAccountAsync(appleId, device.DeviceId, app.BundleIdentifier, forceRefresh: true);
                    if (identity != null && !string.IsNullOrWhiteSpace(identity.MobileProvisionPath) && File.Exists(identity.MobileProvisionPath))
                    {
                        profilePathToUse = identity.MobileProvisionPath;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Could not auto-configure fresh identity from Apple server: {Msg}", ex.Message);
                }

                // If fresh profile couldn't be fetched online, check if we have a locally stored profile
                if (string.IsNullOrWhiteSpace(profilePathToUse))
                {
                    try
                    {
                        var localIdentity = await _identityService.GetIdentityForAccountAsync(appleId, device.DeviceId, app.BundleIdentifier);
                        if (localIdentity != null && !string.IsNullOrWhiteSpace(localIdentity.MobileProvisionPath) && File.Exists(localIdentity.MobileProvisionPath))
                        {
                            profilePathToUse = localIdentity.MobileProvisionPath;
                            _logger.LogInformation("Using locally cached profile for {Bundle}: {Path}", app.BundleIdentifier, profilePathToUse);
                        }
                    }
                    catch { }
                }
            }
            else if (config.Method == SigningMethodType.CustomP12 && !string.IsNullOrWhiteSpace(config.MobileProvisionPath) && File.Exists(config.MobileProvisionPath))
            {
                profilePathToUse = config.MobileProvisionPath;
            }

            if (!string.IsNullOrWhiteSpace(profilePathToUse) && File.Exists(profilePathToUse))
            {
                ReportProgress(progress, "تجديد رخصة التطبيق فورياً على نظام iOS (خلال ثانيتين فقط بدون نقل حزمة)...", 70);
                try
                {
                    byte[] profileBytes = await File.ReadAllBytesAsync(profilePathToUse, cancellationToken);
                    instantRenewSuccess = await _installationService.InstallProvisioningProfileAsync(profileBytes, device, cancellationToken);
                    if (instantRenewSuccess)
                    {
                        _logger.LogInformation("Instant renewal succeeded via misagent for {App} ({Bundle})!", app.AppName, app.BundleIdentifier);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Instant misagent profile renewal failed: {Msg}", ex.Message);
                }
            }

            if (instantRenewSuccess)
            {
                var newExpiration = DateTimeOffset.UtcNow.AddDays(7);
                var updatedApp = app with
                {
                    LastRefreshedAt = DateTimeOffset.UtcNow,
                    ExpirationDate = newExpiration,
                    Status = AppLifecycleStatus.Active,
                    LastErrorMessage = null
                };

                await _appRepository.SaveAppAsync(updatedApp);
                ReportProgress(progress, $"✓ تم تجديد شهادة {app.AppName} فورياً بدون إعادة تثبيت! الصلاحية: 7 أيام جديدة.", 100, isCompleted: true);
                _logger.LogInformation("Successfully refreshed {AppName} instantly via misagent. Next expiration: {Exp:g}", app.AppName, newExpiration);
                return updatedApp;
            }

            // 2. Fallback: Re-signing and reinstalling if instant renewal is unavailable
            string? ipaPath = app.ResolvedIpaPath;
            if (string.IsNullOrWhiteSpace(ipaPath) || !File.Exists(ipaPath))
            {
                string err = $"فشل تجديد رخصة ({app.AppName}) عبر خدمة iOS، ولم يتم العثور على حزمة التطبيق الأصلية (IPA) في الذاكرة المؤقتة لإعادة التثبيت.";
                _logger.LogWarning("{Error}", err);
                await _appRepository.UpdateStatusAsync(app.Id, AppLifecycleStatus.Failed, err);
                throw new FileNotFoundException(err);
            }

            ReportProgress(progress, $"جاري إعادة توقيع الحزمة للتحديث الشامل لـ {app.AppName}...", 50);
            var appConfig = config with { CustomBundleId = app.BundleIdentifier, ModifyBundleId = false };
            string signedIpa = await _signingService.SignIpaAsync(ipaPath, appConfig, device, progress, cancellationToken);

            ReportProgress(progress, $"تحديث الشهادة على الآيفون والحفاظ على البيانات ({app.AppName})...", 75);
            bool installed = await _installationService.InstallIpaAsync(signedIpa, device, progress, cancellationToken);
            if (!installed)
            {
                throw new InvalidOperationException($"فشل تحديث شهادة {app.AppName} على جهاز الآيفون.");
            }

            var fallbackExpiration = DateTimeOffset.UtcNow.AddDays(7);
            var fallbackUpdatedApp = app with
            {
                LastRefreshedAt = DateTimeOffset.UtcNow,
                ExpirationDate = fallbackExpiration,
                Status = AppLifecycleStatus.Active,
                OriginalIpaPath = ipaPath,
                LastErrorMessage = null
            };

            await _appRepository.SaveAppAsync(fallbackUpdatedApp);
            ReportProgress(progress, $"✓ تم تجديد {app.AppName} بنجاح! الصلاحية: 7 أيام جديدة.", 100, isCompleted: true);
            _logger.LogInformation("Successfully refreshed {AppName} via package fallback. Next expiration: {Exp:g}", app.AppName, fallbackExpiration);
            return fallbackUpdatedApp;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to refresh application {AppName}", app.AppName);
            await _appRepository.UpdateStatusAsync(app.Id, AppLifecycleStatus.Failed, ex.Message);
            ReportProgress(progress, $"فشل التجديد: {ex.Message}", 0, hasError: true, errorMessage: ex.Message);
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
        var eligible = allApps.Where(a => 
            a.ResolvedIpaPath != null && 
            (string.IsNullOrWhiteSpace(a.DeviceUdid) || a.DeviceUdid == device.DeviceId)
        ).ToList();

        _logger.LogInformation("Found {Count} eligible apps to refresh for device {UDID}", eligible.Count, device.DeviceId);
        var refreshedApps = new List<ManagedApp>();

        for (int i = 0; i < eligible.Count; i++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var app = eligible[i];
            try
            {
                ReportProgress(progress, $"جاري تجديد ({i + 1}/{eligible.Count}): {app.AppName}...", (int)((i / (double)eligible.Count) * 100));
                var refreshed = await RefreshAppAsync(app, device, config, progress, cancellationToken);
                refreshedApps.Add(refreshed);
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Skipping app {App} due to refresh failure: {Msg}", app.AppName, ex.Message);
            }
        }

        ReportProgress(progress, $"✓ تم الانتهاء من تجديد {refreshedApps.Count} من أصل {eligible.Count} تطبيق بنجاح!", 100, isCompleted: true);
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
