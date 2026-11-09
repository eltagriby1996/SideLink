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

    bool IsMachineAlreadyAuthorized();
    void SavePersistentVipLicense(string vipKey);
    string? GetSavedVipKey();
    void RevokeLocalVipLicense();
    Task<(bool IsValid, string? Reason)> ValidateSavedLicenseOnlineAsync(CancellationToken cancellationToken = default);
    Task<VerificationSession> CreateSessionAsync(CancellationToken cancellationToken = default);
    Task<VerificationStatus> CheckSessionStatusAsync(string sessionId, CancellationToken cancellationToken = default);
    Task<bool> AuthorizeAndUnlockAsync(string sessionId, CancellationToken cancellationToken = default);
    void InvalidateCurrentSession();
    string GetVerificationBrowserUrl(string sessionId);
    Task<RemoteConfigDto?> FetchRemoteConfigAsync(CancellationToken cancellationToken = default);
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
    Task<IReadOnlyList<string>> GetAllSavedAppleIdsAsync();
}

public interface IAppleAuthService
{
    Task<(bool Success, bool Requires2Fa, string Message)> AuthenticateAsync(string appleId, string password, CancellationToken cancellationToken = default);
    Task<(bool Success, string Message)> VerifyTwoFactorCodeAsync(string appleId, string code, CancellationToken cancellationToken = default);
}

public class AppleIdentityInfo
{
    public string AppleId { get; set; } = string.Empty;
    public string? CertificateSubject { get; set; }
    public string? TeamId { get; set; }
    public DateTime? ExpirationDate { get; set; }
    public string? MobileProvisionPath { get; set; }
    public string? P12Path { get; set; }
    public List<string> ProvisionedDevices { get; set; } = new();
    public List<string> DeveloperCertificatesThumbprints { get; set; } = new();
    public string? AllowedBundleId { get; set; }
    public bool IsMatchingCurrentDevice { get; set; }
    public bool IsExpired => ExpirationDate.HasValue && ExpirationDate.Value <= DateTime.UtcNow;
    public bool IsReadyToSign => !string.IsNullOrEmpty(MobileProvisionPath) && 
                                 System.IO.File.Exists(MobileProvisionPath) &&
                                 !string.IsNullOrEmpty(P12Path) &&
                                 System.IO.File.Exists(P12Path) &&
                                 !IsExpired;
}

public interface IAppleIdentityService
{
    Task<IReadOnlyList<string>> DiscoverSystemAppleAccountsAsync();
    Task<AppleIdentityInfo?> GetIdentityForAccountAsync(string appleId, string? deviceUdid = null, string? bundleId = null);
    Task<AppleIdentityInfo> AutoConfigureIdentityForAccountAsync(string appleId, string deviceUdid, string? bundleId = null);
    Task<string?> GetSystemSavedPasswordAsync(string appleId);
}

public class MobilePairingInfo
{
    public string Udid { get; set; } = string.Empty;
    public string PairingFilePath { get; set; } = string.Empty;
    public bool Exists => !string.IsNullOrEmpty(PairingFilePath) && System.IO.File.Exists(PairingFilePath);
    public long FileSizeBytes { get; set; }
    public DateTime? LastModified { get; set; }
}

public interface IMobileCompanionService
{
    MobilePairingInfo DetectPairingFile(string udid);

    Task<(bool Success, string Message, string? DownloadUrl)> SyncPairingToCloudAsync(
        string udid,
        string deviceName,
        string appleId,
        CancellationToken cancellationToken = default);

    string GenerateWireGuardConfig();

    Task<bool> PrepareAndInstallCompanionAsync(
        IosDevice device,
        string appleId,
        IProgress<AppOperationProgress>? progress = null,
        CancellationToken cancellationToken = default);
}



