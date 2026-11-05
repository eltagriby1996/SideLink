using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using SideLink.Core.Interfaces;
using SideLink.Core.Models;

namespace SideLink.App.ViewModels;

public partial class MainViewModel : ObservableObject
{
    private readonly IDeviceDiscoveryService _deviceService;
    private readonly ITelemetryClient _telemetryClient;
    private System.Threading.Timer? _authWatchdogTimer;

    [ObservableProperty]
    private string _currentPage = "Dashboard";

    [ObservableProperty]
    private bool _isAppUnlocked;

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
                // Key was revoked/deactivated by admin! Lock app and notify user.
                App.Current?.Dispatcher?.Invoke(() =>
                {
                    IsAppUnlocked = false;
                    LinkUnlock.IsUnlocked = false;
                    LinkUnlock.HasError = true;
                    LinkUnlock.ErrorMessage = "تم إلغاء أو تعطيل كود التحقق من قبل الإدارة في لوحة التحكم.";
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

    private void StartAuthWatchdog()
    {
        _authWatchdogTimer?.Dispose();
        _authWatchdogTimer = new System.Threading.Timer(async _ =>
        {
            if (!IsAppUnlocked) return;

            try
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
                        _ = LinkUnlock.InitializeSessionAsync();
                    });
                }
            }
            catch
            {
                // Ignore transient network errors
            }
        }, null, TimeSpan.FromSeconds(15), TimeSpan.FromSeconds(15));
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
    }
}
