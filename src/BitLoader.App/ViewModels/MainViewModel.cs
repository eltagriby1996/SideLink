using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using BitLoader.Core.Interfaces;
using BitLoader.Core.Models;

namespace BitLoader.App.ViewModels;

public partial class MainViewModel : ObservableObject
{
    private readonly IDeviceDiscoveryService _deviceService;

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
        IDeviceDiscoveryService deviceService)
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

        Dashboard.NavigationRequested += Navigate;
        LinkUnlock.VerificationCompleted += OnVerificationCompleted;
        _deviceService.DeviceStateChanged += (s, d) =>
        {
            App.Current?.Dispatcher?.Invoke(() => CurrentDevice = d);
        };
    }

    public async Task InitializeAsync()
    {
        // Fresh launch always requires verification
        IsAppUnlocked = false;

        // Start device monitoring in background
        await _deviceService.StartMonitoringAsync();
        CurrentDevice = _deviceService.CurrentDevice;

        // Initialize verification session
        await LinkUnlock.InitializeSessionAsync();
    }

    private void OnVerificationCompleted()
    {
        IsAppUnlocked = true;
        _ = Dashboard.InitializeAsync();
        _ = InstalledApps.InitializeAsync();
    }

    [RelayCommand]
    public void Navigate(string pageName)
    {
        CurrentPage = pageName;
    }
}
