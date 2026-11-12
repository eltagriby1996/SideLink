using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SideLink.App.ViewModels;
using SideLink.Core.Interfaces;
using SideLink.Core.Models;

namespace SideLink.App.Services;

public class WiFiAutoRefreshService : IHostedService, IDisposable
{
    private readonly IDeviceDiscoveryService _deviceDiscovery;
    private readonly IRefreshService _refreshService;
    private readonly IAppRepository _appRepository;
    private readonly ICredentialStore _credentialStore;
    private readonly SettingsViewModel _settings;
    private readonly ILogger<WiFiAutoRefreshService> _logger;

    private Timer? _periodicTimer;
    private readonly SemaphoreSlim _refreshLock = new(1, 1);
    private bool _isDisposed;

    public WiFiAutoRefreshService(
        IDeviceDiscoveryService deviceDiscovery,
        IRefreshService refreshService,
        IAppRepository appRepository,
        ICredentialStore credentialStore,
        SettingsViewModel settings,
        ILogger<WiFiAutoRefreshService> logger)
    {
        _deviceDiscovery = deviceDiscovery;
        _refreshService = refreshService;
        _appRepository = appRepository;
        _credentialStore = credentialStore;
        _settings = settings;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Starting Background Wi-Fi Auto-Refresh Service...");

        // Listen for new device connections (USB or Wi-Fi)
        _deviceDiscovery.DeviceStateChanged += OnDeviceStateChanged;

        // Periodic check every 15 minutes (with initial check after 30 seconds)
        _periodicTimer = new Timer(
            async _ => await CheckAndRefreshEligibleAppsAsync(),
            null,
            TimeSpan.FromSeconds(30),
            TimeSpan.FromMinutes(15));

        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Stopping Background Wi-Fi Auto-Refresh Service...");
        _periodicTimer?.Change(Timeout.Infinite, 0);
        _deviceDiscovery.DeviceStateChanged -= OnDeviceStateChanged;
        return Task.CompletedTask;
    }

    private void OnDeviceStateChanged(object? sender, IosDevice? device)
    {
        if (device != null && device.IsConnected && !device.IsLocked)
        {
            _logger.LogInformation("Device detected ({Medium}): {Title}. Triggering auto-refresh check...", device.ConnectionMedium, device.DisplayTitle);
            _ = Task.Run(async () =>
            {
                await Task.Delay(2000); // Allow handshake to settle
                await CheckAndRefreshEligibleAppsAsync();
            });
        }
    }

    public async Task CheckAndRefreshEligibleAppsAsync()
    {
        if (!await _refreshLock.WaitAsync(0))
        {
            return; // Another refresh check is already running
        }

        try
        {
            var connectedDevices = _deviceDiscovery.ConnectedDevices;
            if (connectedDevices.Count == 0)
            {
                return;
            }

            // 1. Check all app statuses
            var allApps = await _refreshService.CheckAppExpirationsAsync();
            var expiringApps = allApps
                .Where(a => a.Status == AppLifecycleStatus.ExpiringSoon || a.Status == AppLifecycleStatus.Expired)
                .ToList();

            if (expiringApps.Count == 0)
            {
                return;
            }

            _logger.LogInformation("Found {Count} app(s) needing renewal. Checking connected devices...", expiringApps.Count);

            string? activeAppleId = await _credentialStore.GetLastAppleIdAsync();

            foreach (var app in expiringApps)
            {
                // Find matching device or fallback to current connected device
                var targetDevice = connectedDevices.FirstOrDefault(d => 
                    string.Equals(d.DeviceId, app.DeviceUdid, StringComparison.OrdinalIgnoreCase)) 
                    ?? connectedDevices.FirstOrDefault();

                if (targetDevice == null || !targetDevice.IsConnected || targetDevice.IsLocked)
                {
                    continue;
                }

                // Avoid re-refreshing if already refreshed in the last 6 hours
                if (app.LastRefreshedAt.HasValue && (DateTimeOffset.UtcNow - app.LastRefreshedAt.Value).TotalHours < 6)
                {
                    continue;
                }

                _logger.LogInformation("⚡ [Auto-Refresh] Starting background renewal for {App} over {Medium}...", app.AppName, targetDevice.ConnectionMedium);

                try
                {
                    var config = new SigningConfiguration
                    {
                        Method = app.SigningMethod,
                        AppleId = activeAppleId ?? string.Empty,
                        CustomBundleId = app.BundleIdentifier,
                        ModifyBundleId = false
                    };

                    var refreshed = await _refreshService.RefreshAppAsync(app, targetDevice, config);
                    
                    string logMsg = $"📶 [Wi-Fi Auto-Refresh] تم تجديد شهادة {refreshed.AppName} بنجاح عبر شبكة {targetDevice.ConnectionMedium}! الصلاحية: 7 أيام جديدة حتى {refreshed.ExpirationDate:yyyy-MM-dd}.";
                    _logger.LogInformation("{Msg}", logMsg);
                    LogsViewModel.AddLog(logMsg);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning("Background auto-refresh failed for {App}: {Msg}", app.AppName, ex.Message);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in WiFiAutoRefreshService loop");
        }
        finally
        {
            _refreshLock.Release();
        }
    }

    public void Dispose()
    {
        if (_isDisposed) return;
        _isDisposed = true;
        _periodicTimer?.Dispose();
        _refreshLock.Dispose();
        _deviceDiscovery.DeviceStateChanged -= OnDeviceStateChanged;
    }
}

