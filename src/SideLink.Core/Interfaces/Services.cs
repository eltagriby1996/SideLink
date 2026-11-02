using SideLink.Core.Models;

namespace SideLink.Core.Interfaces;

public interface IDeviceDiscoveryService : IDisposable
{
    event EventHandler<IosDevice?>? DeviceStateChanged;
    IosDevice? CurrentDevice { get; }
    IReadOnlyList<IosDevice> ConnectedDevices { get; }
    bool IsMonitoring { get; }
    Task StartMonitoringAsync(CancellationToken cancellationToken = default);
    Task StopMonitoringAsync();
    Task<IReadOnlyList<IosDevice>> RefreshDevicesAsync(CancellationToken cancellationToken = default);
}

public interface IIpaInspectorService
{
    Task<IpaMetadata> InspectIpaAsync(string ipaFilePath, CancellationToken cancellationToken = default);
    Task<bool> ValidateIpaArchiveAsync(string ipaFilePath, CancellationToken cancellationToken = default);
    Task<MobileProvisionInfo?> ExtractProvisioningProfileAsync(string ipaFilePath, CancellationToken cancellationToken = default);
}

public interface ISigningService
{
    Task<string> SignIpaAsync(
        string sourceIpaPath,
        SigningConfiguration config,
        IosDevice targetDevice,
        IProgress<AppOperationProgress>? progress = null,
        CancellationToken cancellationToken = default);

    Task<bool> ValidateSigningPrerequisitesAsync(
        SigningConfiguration config,
        CancellationToken cancellationToken = default);
}

public interface IInstallationService
{
    Task<bool> InstallIpaAsync(
        string signedIpaPath,
        IosDevice targetDevice,
        IProgress<AppOperationProgress>? progress = null,
        CancellationToken cancellationToken = default);

    Task<bool> UninstallAppAsync(
        string bundleIdentifier,
        IosDevice targetDevice,
        CancellationToken cancellationToken = default);
}

public interface IRefreshService
{
    Task<ManagedApp> RefreshAppAsync(
        ManagedApp app,
        IosDevice device,
        SigningConfiguration config,
        IProgress<AppOperationProgress>? progress = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ManagedApp>> RefreshAllEligibleAppsAsync(
        IosDevice device,
        SigningConfiguration config,
        IProgress<AppOperationProgress>? progress = null,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ManagedApp>> CheckAppExpirationsAsync(CancellationToken cancellationToken = default);
}

public interface ILinkUnlockService
{
    bool IsSessionUnlocked { get; }
    VerificationSession? CurrentSession { get; }
    event EventHandler<bool>? SessionUnlockStateChanged;

    Task<VerificationSession> CreateSessionAsync(CancellationToken cancellationToken = default);
    Task<VerificationStatus> CheckSessionStatusAsync(string sessionId, CancellationToken cancellationToken = default);
    Task<bool> AuthorizeAndUnlockAsync(string sessionId, CancellationToken cancellationToken = default);
    void InvalidateCurrentSession();
    string GetVerificationBrowserUrl(string sessionId);
}

public interface IAppRepository
{
    Task<IReadOnlyList<ManagedApp>> GetAllAppsAsync();
    Task<ManagedApp?> GetAppByIdAsync(string id);
    Task<ManagedApp?> GetAppByBundleIdAsync(string bundleId, string deviceUdid);
    Task SaveAppAsync(ManagedApp app);
    Task DeleteAppAsync(string id);
    Task UpdateStatusAsync(string id, AppLifecycleStatus status, string? errorMessage = null);
}

public interface IDiagnosticsService
{
    Task<IReadOnlyList<DiagnosticCheckResult>> RunAllDiagnosticsAsync(CancellationToken cancellationToken = default);
    Task<string> GenerateDiagnosticReportAsync(CancellationToken cancellationToken = default);
}

public interface ICredentialStore
{
    Task SaveApplePasswordAsync(string appleId, string password);
    Task<string?> GetApplePasswordAsync(string appleId);
    Task DeleteApplePasswordAsync(string appleId);
    Task<string?> GetLastAppleIdAsync();
}
