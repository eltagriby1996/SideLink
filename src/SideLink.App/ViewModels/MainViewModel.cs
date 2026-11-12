using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using SideLink.Core.Interfaces;
using SideLink.Core.Models;

namespace SideLink.App.ViewModels;

public partial class MainViewModel : ObservableObject
{
    public const string CurrentAppVersion = "1.0.0";

    private readonly IDeviceDiscoveryService _deviceService;
    private readonly ITelemetryClient _telemetryClient;
    private System.Threading.Timer? _authWatchdogTimer;

    [ObservableProperty]
    private string _currentPage = "Dashboard";

    [ObservableProperty]
    private bool _isAppUnlocked;

    [ObservableProperty]
    private bool _isEmergencyLocked;

    [ObservableProperty]
    private string _emergencyLockMessage = "تم إيقاف تشغيل الأداة مؤقتاً لأعمال الصيانة والتطوير الأمني.";

    [ObservableProperty]
    private bool _isForceUpdateRequired;

    [ObservableProperty]
    private string _forceUpdateVersion = "1.0.0";

    [ObservableProperty]
    private string _forceUpdateNotes = string.Empty;

    [ObservableProperty]
    private string _forceUpdateUrl = "https://www.sidelinktool.me";

    [ObservableProperty]
    private IosDevice? _currentDevice;

    public DashboardViewModel Dashboard { get; }
    public DevicesViewModel Devices { get; }
    public IpaLibraryViewModel IpaLibrary { get; }
    public InstalledAppsViewModel InstalledApps { get; }
    public SigningRefreshViewModel SigningRefresh { get; }
    public DiagnosticsViewModel Diagnostics { get; }
    public LogsViewModel Logs { get; }
    public SettingsViewModel Settings { get; }
    public LinkUnlockViewModel LinkUnlock { get; }
    public MobileCompanionViewModel MobileCompanion { get; }

    public MainViewModel(
        DashboardViewModel dashboard,
        DevicesViewModel devices,
        IpaLibraryViewModel ipaLibrary,
        InstalledAppsViewModel installedApps,
        SigningRefreshViewModel signingRefresh,
        DiagnosticsViewModel diagnostics,
        LogsViewModel logs,
        SettingsViewModel settings,
        LinkUnlockViewModel linkUnlock,
        MobileCompanionViewModel mobileCompanion,
        IDeviceDiscoveryService deviceService,
        ITelemetryClient telemetryClient)
    {
        Dashboard = dashboard;
        Devices = devices;
        IpaLibrary = ipaLibrary;
        InstalledApps = installedApps;
        SigningRefresh = signingRefresh;
        Diagnostics = diagnostics;
        Logs = logs;
        Settings = settings;
        LinkUnlock = linkUnlock;
        MobileCompanion = mobileCompanion;
        _deviceService = deviceService;
        _telemetryClient = telemetryClient;

        // Start in unlocked state only if machine already has a valid local license, preventing UI flicker
        _isAppUnlocked = linkUnlock.CheckMachineAuthorized();

        Dashboard.NavigationRequested += Navigate;
        LinkUnlock.VerificationCompleted += OnVerificationCompleted;
        _deviceService.DeviceStateChanged += (s, d) =>
        {
            App.Current?.Dispatcher?.Invoke(() => CurrentDevice = d);
            if (d != null)
            {
                _ = _telemetryClient.TrackEventAsync("device_connected", "success", d.DeviceName, d.ProductVersion);
            }
        };
    }

    public async Task InitializeAsync()
    {
        _ = _telemetryClient.TrackEventAsync("app_launch", "success");

        // Check if this machine has a saved license
        // 1. Mandatory Remote Governance Check (Kill Switch & Forced Update)
        bool govOk = await CheckRemoteGovernanceAsync();
        if (!govOk)
        {
            // App locked by Kill Switch or Forced Update
            StartAuthWatchdog();
            return;
        }

        // 2. Check if this machine has a saved license
        if (LinkUnlock.CheckMachineAuthorized())
        {
            // Verify online with server to ensure key wasn't revoked or deleted in admin panel
            bool onlineValid = await LinkUnlock.ValidateAuthorizationOnlineAsync();
            if (onlineValid)
            {
                App.Current?.Dispatcher?.Invoke(() => IsAppUnlocked = true);
                await _deviceService.StartMonitoringAsync();
                App.Current?.Dispatcher?.Invoke(() => CurrentDevice = _deviceService.CurrentDevice);
                _ = Dashboard.InitializeAsync();
                _ = InstalledApps.InitializeAsync();
                _ = SigningRefresh.InitializeAsync();
                StartAuthWatchdog();
                return;
            }
            else
            {
                // Key was revoked/expired or deactivated by admin! Lock app and notify user.
                App.Current?.Dispatcher?.Invoke(() =>
                {
                    IsAppUnlocked = false;
                    LinkUnlock.IsUnlocked = false;
                    LinkUnlock.HasError = true;
                    if (string.IsNullOrWhiteSpace(LinkUnlock.ErrorMessage))
                    {
                        LinkUnlock.ErrorMessage = "انتهت صلاحية كود التحقق أو تم إلغاؤه من قبل الإدارة في لوحة التحكم.";
                    }
                    LinkUnlock.VipStatusMessage = LinkUnlock.ErrorMessage;
                });
            }
        }

        // First launch on new machine or license revoked by admin requires unlock
        App.Current?.Dispatcher?.Invoke(() => IsAppUnlocked = false);

        // Start device monitoring in background
        await _deviceService.StartMonitoringAsync();
        App.Current?.Dispatcher?.Invoke(() => CurrentDevice = _deviceService.CurrentDevice);

        // Initialize verification session
        await LinkUnlock.InitializeSessionAsync();

        // Initialize signing & accounts in background
        _ = SigningRefresh.InitializeAsync();

        StartAuthWatchdog();
    }

    public async Task<bool> CheckRemoteGovernanceAsync()
    {
        try
        {
            var config = await LinkUnlock.FetchRemoteConfigAsync();
            if (config == null) return true;

            bool isKillActive = config.EmergencyKillSwitch;
            string killMsg = string.IsNullOrWhiteSpace(config.KillSwitchMessage)
                ? "تم إيقاف تشغيل الأداة مؤقتاً من قبل الإدارة لأعمال الصيانة والتطوير الأمني."
                : config.KillSwitchMessage;

            bool isForced = false;
            if (config.ForceUpdate && !string.IsNullOrWhiteSpace(config.LatestVersion))
            {
                if (IsVersionNewer(config.LatestVersion, CurrentAppVersion))
                {
                    isForced = true;
                }
            }

            App.Current?.Dispatcher?.Invoke(() =>
            {
                if (isKillActive)
                {
                    IsEmergencyLocked = true;
                    EmergencyLockMessage = killMsg;
                    IsAppUnlocked = false;
                }
                else
                {
                    IsEmergencyLocked = false;
                }

                if (isForced)
                {
                    IsForceUpdateRequired = true;
                    ForceUpdateVersion = config.LatestVersion;
                    ForceUpdateNotes = !string.IsNullOrWhiteSpace(config.ReleaseNotes)
                        ? config.ReleaseNotes
                        : "يتضمن هذا التحديث تحسينات أمنية وإصلاحات ضرورية لا غنى عنها لعمل الأداة بكفاءة.";
                    ForceUpdateUrl = !string.IsNullOrWhiteSpace(config.DownloadUrl)
                        ? config.DownloadUrl
                        : "https://www.sidelinktool.me";
                    IsAppUnlocked = false;
                }
                else
                {
                    IsForceUpdateRequired = false;
                }
            });

            return !isKillActive && !isForced;
        }
        catch
        {
            return true;
        }
    }

    private static bool IsVersionNewer(string remoteVerStr, string localVerStr)
    {
        try
        {
            string cleanRemote = remoteVerStr.TrimStart('v', 'V').Trim();
            string cleanLocal = localVerStr.TrimStart('v', 'V').Trim();

            if (Version.TryParse(cleanRemote, out var remote) && Version.TryParse(cleanLocal, out var local))
            {
                return remote > local;
            }

            return string.Compare(cleanRemote, cleanLocal, StringComparison.OrdinalIgnoreCase) > 0;
        }
        catch
        {
            return false;
        }
    }

    [RelayCommand]
    public void OpenForceUpdateUrl()
    {
        try
        {
            string url = !string.IsNullOrWhiteSpace(ForceUpdateUrl) ? ForceUpdateUrl : "https://www.sidelinktool.me";
            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(url) { UseShellExecute = true });
        }
        catch { }
    }

    [RelayCommand]
    public void ExitApplication()
    {
        System.Windows.Application.Current?.Shutdown();
    }

    [RelayCommand]
    public async Task RetryGovernanceCheckAsync()
    {
        bool ok = await CheckRemoteGovernanceAsync();
        if (ok && LinkUnlock.CheckMachineAuthorized())
        {
            bool onlineValid = await LinkUnlock.ValidateAuthorizationOnlineAsync();
            if (onlineValid)
            {
                App.Current?.Dispatcher?.Invoke(() => IsAppUnlocked = true);
            }
        }
    }

    private void StartAuthWatchdog()
    {
        _authWatchdogTimer?.Dispose();
        _authWatchdogTimer = new System.Threading.Timer(async _ =>
        {
            if (!IsAppUnlocked) return;

            try
            {
                // Immediate local expiration check: If VIP key has reached its expiration timestamp
                if (LinkUnlock.IsVipExpired())
                {
                    App.Current?.Dispatcher?.Invoke(() =>
                    {
                        IsAppUnlocked = false;
                        LinkUnlock.IsUnlocked = false;
                        LinkUnlock.HasError = true;
                        LinkUnlock.ErrorMessage = "انتهت صلاحية كود التحقق. يرجى تجديد الترخيص أو إعادة التحقق للمتابعة.";
                        LinkUnlock.VipStatusMessage = LinkUnlock.ErrorMessage;
                        LinkUnlock.RevokeLocalLicense();
                        _ = LinkUnlock.InitializeSessionAsync(preserveError: true);
                    });
                    return;
                }

                // Check remote governance first
                bool govOk = await CheckRemoteGovernanceAsync();
                if (!govOk)
                {
                    return;
                }

                if (!IsAppUnlocked) return;

                // Validate VIP key if machine is authorized via VIP
                string? vipKey = LinkUnlock.GetSavedVipKey();
                if (!string.IsNullOrEmpty(vipKey))
                {
                    bool valid = await LinkUnlock.ValidateAuthorizationOnlineAsync();
                    if (!valid)
                    {
                        App.Current?.Dispatcher?.Invoke(() =>
                        {
                            IsAppUnlocked = false;
                            LinkUnlock.IsUnlocked = false;
                            LinkUnlock.HasError = true;
                            if (string.IsNullOrWhiteSpace(LinkUnlock.ErrorMessage))
                            {
                                LinkUnlock.ErrorMessage = "انتهت صلاحية كود التحقق أو تم إلغاؤه من قبل الإدارة في لوحة التحكم.";
                            }
                            LinkUnlock.VipStatusMessage = LinkUnlock.ErrorMessage;
                            LinkUnlock.RevokeLocalLicense();
                            _ = LinkUnlock.InitializeSessionAsync(preserveError: true);
                        });
                    }
                }
                else
                {
                    // For normal browser-verified sessions, check emergency kill switch
                    bool killSwitchActive = await LinkUnlock.CheckEmergencyKillSwitchAsync();
                    if (killSwitchActive)
                    {
                        App.Current?.Dispatcher?.Invoke(() =>
                        {
                            IsAppUnlocked = false;
                            LinkUnlock.IsUnlocked = false;
                            LinkUnlock.HasError = true;
                            LinkUnlock.ErrorMessage = "تم إيقاف التطبيق مؤقتاً بواسطة زر الطوارئ من لوحة التحكم.";
                            _ = LinkUnlock.InitializeSessionAsync(preserveError: true);
                        });
                    }
                }
            }
            catch
            {
                // Ignore transient network errors
            }
        }, null, TimeSpan.FromSeconds(2), TimeSpan.FromSeconds(3));
    }

    private void OnVerificationCompleted()
    {
        App.Current?.Dispatcher?.Invoke(() => IsAppUnlocked = true);
        _ = Dashboard.InitializeAsync();
        _ = InstalledApps.InitializeAsync();
        _ = SigningRefresh.InitializeAsync();
        StartAuthWatchdog();
    }

    [RelayCommand]
    public void Navigate(string pageName)
    {
        CurrentPage = pageName;
        if (pageName == "SigningRefresh")
        {
            _ = SigningRefresh.InitializeAsync();
        }

        // Real-time enforcement on navigation
        if (IsAppUnlocked)
        {
            _ = Task.Run(async () =>
            {
                string? vipKey = LinkUnlock.GetSavedVipKey();
                if (!string.IsNullOrEmpty(vipKey))
                {
                    bool valid = await LinkUnlock.ValidateAuthorizationOnlineAsync();
                    if (!valid)
                    {
                        App.Current?.Dispatcher?.Invoke(() =>
                        {
                            IsAppUnlocked = false;
                            LinkUnlock.IsUnlocked = false;
                            LinkUnlock.HasError = true;
                            LinkUnlock.ErrorMessage = "تم إلغاء أو تعطيل كود التحقق من قبل الإدارة في لوحة التحكم.";
                            LinkUnlock.VipStatusMessage = LinkUnlock.ErrorMessage;
                            _ = LinkUnlock.InitializeSessionAsync(preserveError: true);
                        });
                    }
                }
            });
        }
    }
}
