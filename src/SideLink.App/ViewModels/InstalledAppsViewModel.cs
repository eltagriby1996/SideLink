using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Extensions.Logging;
using SideLink.Core.Interfaces;
using SideLink.Core.Models;

namespace SideLink.App.ViewModels;

public partial class InstalledAppsViewModel : ObservableObject
{
    private readonly IAppRepository _appRepository;
    private readonly IRefreshService _refreshService;
    private readonly IInstallationService _installationService;
    private readonly IDeviceDiscoveryService _deviceService;
    private readonly ILogger<InstalledAppsViewModel> _logger;

    public ObservableCollection<ManagedApp> Apps { get; } = new();

    [ObservableProperty]
    private ManagedApp? _selectedApp;

    [ObservableProperty]
    private bool _isLoading;

    [ObservableProperty]
    private bool _isRefreshing;

    [ObservableProperty]
    private string _statusMessage = "Loading managed applications...";

    [ObservableProperty]
    private string _filterQuery = string.Empty;

    public InstalledAppsViewModel(
        IAppRepository appRepository,
        IRefreshService refreshService,
        IInstallationService installationService,
        IDeviceDiscoveryService deviceService,
        ILogger<InstalledAppsViewModel> logger)
    {
        _appRepository = appRepository;
        _refreshService = refreshService;
        _installationService = installationService;
        _deviceService = deviceService;
        _logger = logger;
    }

    public async Task InitializeAsync()
    {
        await LoadAppsAsync();
    }

    [RelayCommand]
    public async Task LoadAppsAsync()
    {
        IsLoading = true;
        try
        {
            var apps = await _refreshService.CheckAppExpirationsAsync();
            Apps.Clear();
            foreach (var a in apps)
            {
                if (string.IsNullOrWhiteSpace(FilterQuery) || 
                    a.AppName.Contains(FilterQuery, StringComparison.OrdinalIgnoreCase) || 
                    a.BundleIdentifier.Contains(FilterQuery, StringComparison.OrdinalIgnoreCase))
                {
                    Apps.Add(a);
                }
            }

            SelectedApp = Apps.FirstOrDefault();
            StatusMessage = Apps.Count > 0 ? $"Managing {Apps.Count} application(s)." : "No applications currently managed by SideLink.";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load apps");
            StatusMessage = "Error loading apps: " + ex.Message;
        }
        finally
        {
            IsLoading = false;
        }
    }

    [RelayCommand]
    public async Task RefreshSingleAppAsync(ManagedApp? app)
    {
        var target = app ?? SelectedApp;
        if (target == null) return;

        var device = _deviceService.CurrentDevice;
        if (device == null || !device.IsConnected)
        {
            StatusMessage = "Cannot refresh: Connect iPhone via USB first.";
            return;
        }

        IsRefreshing = true;
        StatusMessage = $"Refreshing {target.AppName}...";

        try
        {
            var config = new SigningConfiguration { Method = target.SigningMethod };
            var refreshed = await _refreshService.RefreshAppAsync(target, device, config);

            // Replace in collection
            int idx = Apps.IndexOf(target);
            if (idx >= 0)
            {
                Apps[idx] = refreshed;
            }
            SelectedApp = refreshed;

            StatusMessage = $"Successfully refreshed {target.AppName}. New expiration: {refreshed.ExpirationDate:g}";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to refresh {App}", target.AppName);
            StatusMessage = $"Refresh failed: {ex.Message}";
        }
        finally
        {
            IsRefreshing = false;
        }
    }

    [RelayCommand]
    public async Task UninstallAppAsync(ManagedApp? app)
    {
        var target = app ?? SelectedApp;
        if (target == null) return;

        var device = _deviceService.CurrentDevice;
        if (device == null || !device.IsConnected)
        {
            StatusMessage = "Cannot uninstall: Connect device first.";
            return;
        }

        try
        {
            bool success = await _installationService.UninstallAppAsync(target.BundleIdentifier, device);
            if (success)
            {
                Apps.Remove(target);
                if (SelectedApp == target)
                    SelectedApp = Apps.FirstOrDefault();

                StatusMessage = $"Removed {target.AppName} from SideLink.";
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to uninstall {App}", target.AppName);
            StatusMessage = $"Uninstall failed: {ex.Message}";
        }
    }
}
