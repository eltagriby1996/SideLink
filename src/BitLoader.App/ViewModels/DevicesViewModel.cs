using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Extensions.Logging;
using BitLoader.Core.Interfaces;
using BitLoader.Core.Models;

namespace BitLoader.App.ViewModels;

public partial class DevicesViewModel : ObservableObject
{
    private readonly IDeviceDiscoveryService _deviceService;
    private readonly ILogger<DevicesViewModel> _logger;

    public ObservableCollection<IosDevice> Devices { get; } = new();

    [ObservableProperty]
    private IosDevice? _selectedDevice;

    [ObservableProperty]
    private bool _isScanning;

    [ObservableProperty]
    private string _statusMessage = "Monitoring USB connections...";

    public DevicesViewModel(IDeviceDiscoveryService deviceService, ILogger<DevicesViewModel> logger)
    {
        _deviceService = deviceService;
        _logger = logger;

        _deviceService.DeviceStateChanged += OnDeviceStateChanged;
    }

    public async Task InitializeAsync()
    {
        await RefreshDevicesAsync();
    }

    private void OnDeviceStateChanged(object? sender, IosDevice? device)
    {
        App.Current?.Dispatcher?.Invoke(() =>
        {
            Devices.Clear();
            foreach (var d in _deviceService.ConnectedDevices)
            {
                Devices.Add(d);
            }
            SelectedDevice = _deviceService.CurrentDevice;
            StatusMessage = Devices.Count > 0 
                ? $"Detected {Devices.Count} connected Apple device(s)." 
                : "No Apple devices detected over USB. Check cable connection.";
        });
    }

    [RelayCommand]
    public async Task RefreshDevicesAsync()
    {
        IsScanning = true;
        StatusMessage = "Scanning for connected iOS devices via usbmuxd...";

        try
        {
            var refreshed = await _deviceService.RefreshDevicesAsync();
            Devices.Clear();
            foreach (var d in refreshed)
            {
                Devices.Add(d);
            }
            SelectedDevice = _deviceService.CurrentDevice;
            StatusMessage = Devices.Count > 0 
                ? $"Found {Devices.Count} device(s)." 
                : "No devices found. Ensure iPhone is connected via USB and unlocked.";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Device scan failed");
            StatusMessage = "Scan error: " + ex.Message;
        }
        finally
        {
            IsScanning = false;
        }
    }
}
