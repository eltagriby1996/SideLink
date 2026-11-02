using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Extensions.Logging;
using SideLink.Core.Interfaces;
using SideLink.Core.Models;

namespace SideLink.App.ViewModels;

public partial class DashboardViewModel : ObservableObject
{
    private readonly IDeviceDiscoveryService _deviceService;
    private readonly IAppRepository _appRepository;
    private readonly IRefreshService _refreshService;
    private readonly ILogger<DashboardViewModel> _logger;

    [ObservableProperty]
    private IosDevice? _currentDevice;

    [ObservableProperty]
    private int _totalAppsCount;

    [ObservableProperty]
    private int _expiringSoonCount;

    [ObservableProperty]
    private int _expiredCount;

    [ObservableProperty]
    private string _deviceStatusText = "No device connected over USB";

    [ObservableProperty]
    private bool _isDeviceConnected;

    [ObservableProperty]
    private bool _isRefreshing;

    [ObservableProperty]
    private string _operationStatusText = "System Ready";

    public ObservableCollection<string> RecentActivities { get; } = new();

    public event Action<string>? NavigationRequested;

    public DashboardViewModel(
        IDeviceDiscoveryService deviceService,
        IAppRepository appRepository,
        IRefreshService refreshService,
        ILogger<DashboardViewModel> logger)
    {
        _deviceService = deviceService;
        _appRepository = appRepository;
        _refreshService = refreshService;
        _logger = logger;

        _deviceService.DeviceStateChanged += OnDeviceStateChanged;
    }

    public async Task InitializeAsync()
    {
        CurrentDevice = _deviceService.CurrentDevice;
        UpdateDeviceState(CurrentDevice);
        await ReloadAppStatsAsync();
    }

    private void OnDeviceStateChanged(object? sender, IosDevice? device)
    {
        App.Current?.Dispatcher?.Invoke(() =>
        {
            CurrentDevice = device;
            UpdateDeviceState(device);
        });
    }

    private void UpdateDeviceState(IosDevice? device)
    {
        if (device != null && device.IsConnected)
        {
            IsDeviceConnected = true;
            if (device.IsLocked)
            {
                DeviceStatusText = $"{device.FriendlyModelName} connected - Unlock with Passcode";
            }
            else if (!device.IsTrusted)
            {
                DeviceStatusText = $"{device.FriendlyModelName} connected - Tap 'Trust This Computer'";
            }
            else
            {
                DeviceStatusText = $"{device.FriendlyModelName} (iOS {device.ProductVersion}) - Paired & Ready";
            }
            AddActivity($"Device detected: {device.FriendlyModelName}");
        }
        else
        {
            IsDeviceConnected = false;
            DeviceStatusText = "Connect iPhone via USB cable to begin";
        }
    }

    public async Task ReloadAppStatsAsync()
    {
        try
        {
            var apps = await _refreshService.CheckAppExpirationsAsync();
            TotalAppsCount = apps.Count;
            ExpiringSoonCount = apps.Count(a => a.Status == AppLifecycleStatus.ExpiringSoon);
            ExpiredCount = apps.Count(a => a.Status == AppLifecycleStatus.Expired);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load dashboard app statistics");
        }
    }

    [RelayCommand]
    public void NavigateTo(string pageName)
    {
        NavigationRequested?.Invoke(pageName);
    }

    [RelayCommand]
    public async Task RefreshAllAppsAsync()
    {
        if (CurrentDevice == null || !CurrentDevice.IsConnected)
        {
            OperationStatusText = "Cannot refresh: Connect your iPhone over USB first.";
            return;
        }

        try
        {
            IsRefreshing = true;
            OperationStatusText = "Refreshing eligible applications...";
            AddActivity("Started 7-day refresh cycle for all eligible apps");

            var config = new SigningConfiguration { Method = SigningMethodType.PersonalTeam };
            var refreshed = await _refreshService.RefreshAllEligibleAppsAsync(CurrentDevice, config);

            OperationStatusText = $"Refresh complete. Successfully refreshed {refreshed.Count} applications.";
            AddActivity($"Successfully refreshed {refreshed.Count} applications.");
            await ReloadAppStatsAsync();
        }
        catch (Exception ex)
        {
            OperationStatusText = "Refresh error: " + ex.Message;
            AddActivity("Refresh failed: " + ex.Message);
        }
        finally
        {
            IsRefreshing = false;
        }
    }

    public void AddActivity(string text)
    {
        App.Current?.Dispatcher?.Invoke(() =>
        {
            RecentActivities.Insert(0, $"[{DateTime.Now:HH:mm:ss}] {text}");
            while (RecentActivities.Count > 30)
                RecentActivities.RemoveAt(RecentActivities.Count - 1);
        });
    }
}
