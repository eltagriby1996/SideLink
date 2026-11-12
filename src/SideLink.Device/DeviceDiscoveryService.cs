using System.Net.Sockets;
using System.Text.RegularExpressions;
using System.Xml.Linq;
using Microsoft.Extensions.Logging;
using SideLink.Core.Interfaces;
using SideLink.Core.Models;

namespace SideLink.Device;

public class DeviceDiscoveryService : IDeviceDiscoveryService
{
    private readonly ILogger<DeviceDiscoveryService> _logger;
    private readonly List<IosDevice> _connectedDevices = new();
    private readonly object _lock = new();
    private CancellationTokenSource? _monitoringCts;
    private Task? _monitoringTask;
    private bool _isDisposed;

    public event EventHandler<IosDevice?>? DeviceStateChanged;

    public IosDevice? CurrentDevice
    {
        get
        {
            lock (_lock)
            {
                return _connectedDevices.FirstOrDefault();
            }
        }
    }

    public IReadOnlyList<IosDevice> ConnectedDevices
    {
        get
        {
            lock (_lock)
            {
                return _connectedDevices.ToList().AsReadOnly();
            }
        }
    }

    public bool IsMonitoring => _monitoringTask != null && !_monitoringTask.IsCompleted;

    public DeviceDiscoveryService(ILogger<DeviceDiscoveryService> logger)
    {
        _logger = logger;
    }

    public Task StartMonitoringAsync(CancellationToken cancellationToken = default)
    {
        if (IsMonitoring)
            return Task.CompletedTask;

        _monitoringCts = new CancellationTokenSource();
        _monitoringTask = Task.Run(() => MonitorUsbmuxdLoopAsync(_monitoringCts.Token), CancellationToken.None);
        _logger.LogInformation("Started iOS device discovery monitoring.");
        _ = RefreshDevicesAsync(CancellationToken.None);
        return Task.CompletedTask;
    }

    public async Task StopMonitoringAsync()
    {
        if (_monitoringCts != null)
        {
            _monitoringCts.Cancel();
            if (_monitoringTask != null)
            {
                try
                {
                    await _monitoringTask;
                }
                catch (OperationCanceledException) { }
            }
            _monitoringCts.Dispose();
            _monitoringCts = null;
            _monitoringTask = null;
        }

        lock (_lock)
        {
            _connectedDevices.Clear();
        }
        DeviceStateChanged?.Invoke(this, null);
        _logger.LogInformation("Stopped iOS device discovery monitoring.");
    }

    public async Task<IReadOnlyList<IosDevice>> RefreshDevicesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            using var client = new TcpClient();
            await client.ConnectAsync("127.0.0.1", UsbmuxdProtocol.UsbmuxdPort, cancellationToken);
            using var stream = client.GetStream();

            string listXml = UsbmuxdProtocol.CreateListDevicesRequest();
            byte[] packet = UsbmuxdProtocol.CreateUsbmuxPacket(listXml);
            await stream.WriteAsync(packet, cancellationToken);
            await stream.FlushAsync(cancellationToken);

            using var shortCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            shortCts.CancelAfter(TimeSpan.FromMilliseconds(2000));

            try
            {
                string? response = await UsbmuxdProtocol.ReadUsbmuxMessageAsync(stream, shortCts.Token);
                if (!string.IsNullOrWhiteSpace(response))
                {
                    ProcessUsbmuxMessage(response);
                }
            }
            catch (OperationCanceledException) { }

            return ConnectedDevices;
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Failed to query usbmuxd devices: {Message}", ex.Message);
            return ConnectedDevices;
        }
    }

    private async Task MonitorUsbmuxdLoopAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            TcpClient? client = null;
            try
            {
                client = new TcpClient();
                await client.ConnectAsync("127.0.0.1", UsbmuxdProtocol.UsbmuxdPort, cancellationToken);
                using var stream = client.GetStream();

                string listenXml = UsbmuxdProtocol.CreateListenRequest();
                byte[] packet = UsbmuxdProtocol.CreateUsbmuxPacket(listenXml);
                await stream.WriteAsync(packet, cancellationToken);
                await stream.FlushAsync(cancellationToken);

                _logger.LogInformation("Connected to Apple usbmuxd service on port {Port}.", UsbmuxdProtocol.UsbmuxdPort);

                _ = RefreshDevicesAsync(cancellationToken);

                using var pollCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                _ = Task.Run(async () =>
                {
                    while (!pollCts.Token.IsCancellationRequested)
                    {
                        try
                        {
                            await Task.Delay(3500, pollCts.Token);
                            if (ConnectedDevices.Count == 0)
                            {
                                await RefreshDevicesAsync(pollCts.Token);
                            }
                        }
                        catch { break; }
                    }
                }, pollCts.Token);

                try
                {
                    while (!cancellationToken.IsCancellationRequested)
                    {
                        string? msg = await UsbmuxdProtocol.ReadUsbmuxMessageAsync(stream, cancellationToken);
                        if (msg == null) break; // Disconnected from daemon

                        ProcessUsbmuxMessage(msg);
                    }
                }
                finally
                {
                    pollCts.Cancel();
                }
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Usbmuxd connection loop issue: {Message}. Retrying in 4s...", ex.Message);
            }
            finally
            {
                client?.Dispose();
            }

            try
            {
                await Task.Delay(4000, cancellationToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }
    }

    private void ProcessUsbmuxMessage(string xml)
    {
        try
        {
            var doc = XDocument.Parse(xml);
            var rootDict = doc.Root?.Element("dict");
            if (rootDict == null) return;

            if (xml.Contains("<key>DeviceList</key>"))
            {
                var array = doc.Descendants("array").FirstOrDefault();
                if (array != null)
                {
                    foreach (var devDict in array.Elements("dict"))
                    {
                        int dId = 0;
                        string sNum = string.Empty;
                        int cSpeed = 0;
                        string connType = "USB";
                        var dElements = devDict.Elements().ToList();
                        for (int k = 0; k < dElements.Count - 1; k += 2)
                        {
                            if (dElements[k].Value.Equals("DeviceID", StringComparison.OrdinalIgnoreCase))
                                int.TryParse(dElements[k + 1].Value, out dId);
                            else if (dElements[k].Value.Equals("ConnectionType", StringComparison.OrdinalIgnoreCase))
                                connType = dElements[k + 1].Value;
                            else if (dElements[k].Value.Equals("Properties", StringComparison.OrdinalIgnoreCase) && dElements[k + 1].Name.LocalName == "dict")
                            {
                                var pList = dElements[k + 1].Elements().ToList();
                                for (int m = 0; m < pList.Count - 1; m += 2)
                                {
                                    if (pList[m].Value.Equals("SerialNumber", StringComparison.OrdinalIgnoreCase))
                                        sNum = pList[m + 1].Value;
                                    else if (pList[m].Value.Equals("ConnectionSpeed", StringComparison.OrdinalIgnoreCase))
                                        int.TryParse(pList[m + 1].Value, out cSpeed);
                                    else if (pList[m].Value.Equals("ConnectionType", StringComparison.OrdinalIgnoreCase))
                                        connType = pList[m + 1].Value;
                                }
                            }
                        }

                        if (!string.IsNullOrWhiteSpace(sNum))
                        {
                            bool isWifi = connType.Equals("Network", StringComparison.OrdinalIgnoreCase) || connType.Equals("WiFi", StringComparison.OrdinalIgnoreCase);
                            _logger.LogInformation("Discovered existing iOS Device: UDID={UDID}, DeviceID={ID}, WiFi={IsWifi}", sNum, dId, isWifi);
                            _ = Task.Run(async () => await HandleDeviceAttachedAsync(dId, sNum, cSpeed, isWifi));
                        }
                    }
                }
                return;
            }

            string messageType = string.Empty;
            int deviceId = 0;
            string serialNumber = string.Empty;
            int connectionSpeed = 0;
            string attachedConnType = "USB";

            var elements = rootDict.Elements().ToList();
            for (int i = 0; i < elements.Count - 1; i += 2)
            {
                if (elements[i].Name.LocalName == "key")
                {
                    string key = elements[i].Value;
                    var val = elements[i + 1];

                    if (key.Equals("MessageType", StringComparison.OrdinalIgnoreCase))
                    {
                        messageType = val.Value;
                    }
                    else if (key.Equals("DeviceID", StringComparison.OrdinalIgnoreCase))
                    {
                        int.TryParse(val.Value, out deviceId);
                    }
                    else if (key.Equals("ConnectionType", StringComparison.OrdinalIgnoreCase))
                    {
                        attachedConnType = val.Value;
                    }
                    else if (key.Equals("Properties", StringComparison.OrdinalIgnoreCase) && val.Name.LocalName == "dict")
                    {
                        var propElements = val.Elements().ToList();
                        for (int j = 0; j < propElements.Count - 1; j += 2)
                        {
                            if (propElements[j].Name.LocalName == "key")
                            {
                                string pKey = propElements[j].Value;
                                string pVal = propElements[j + 1].Value;

                                if (pKey.Equals("SerialNumber", StringComparison.OrdinalIgnoreCase))
                                {
                                    serialNumber = pVal;
                                }
                                else if (pKey.Equals("ConnectionSpeed", StringComparison.OrdinalIgnoreCase))
                                {
                                    int.TryParse(pVal, out connectionSpeed);
                                }
                                else if (pKey.Equals("ConnectionType", StringComparison.OrdinalIgnoreCase))
                                {
                                    attachedConnType = pVal;
                                }
                            }
                        }
                    }
                }
            }

            if (messageType.Equals("Attached", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(serialNumber))
            {
                bool isWifi = attachedConnType.Equals("Network", StringComparison.OrdinalIgnoreCase) || attachedConnType.Equals("WiFi", StringComparison.OrdinalIgnoreCase);
                _logger.LogInformation("iOS Device attached: UDID={UDID}, DeviceID={ID}, WiFi={IsWifi}", serialNumber, deviceId, isWifi);
                _ = Task.Run(async () => await HandleDeviceAttachedAsync(deviceId, serialNumber, connectionSpeed, isWifi));
            }
            else if (messageType.Equals("Detached", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogInformation("iOS Device detached: DeviceID={ID}", deviceId);
                HandleDeviceDetached(deviceId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse usbmuxd message");
        }
    }

    private async Task HandleDeviceAttachedAsync(int deviceId, string udid, int speed, bool isWifi)
    {
        IosDevice? device = null;

        // Attempt lockdown query to get device details
        try
        {
            using var tunnelClient = new TcpClient();
            await tunnelClient.ConnectAsync("127.0.0.1", UsbmuxdProtocol.UsbmuxdPort);
            using var tunnelStream = tunnelClient.GetStream();

            // Connect packet for port 62078 (Lockdown)
            string connectXml = UsbmuxdProtocol.CreateConnectRequest(deviceId, UsbmuxdProtocol.LockdownPort);
            byte[] packet = UsbmuxdProtocol.CreateUsbmuxPacket(connectXml);
            await tunnelStream.WriteAsync(packet);
            await tunnelStream.FlushAsync();

            string? connectResp = await UsbmuxdProtocol.ReadUsbmuxMessageAsync(tunnelStream, CancellationToken.None);
            if (!string.IsNullOrWhiteSpace(connectResp) && connectResp.Contains("<integer>0</integer>")) // Result 0 = Success
            {
                device = await LockdownClient.QueryDeviceInfoAsync(tunnelStream, deviceId, udid, speed, CancellationToken.None);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Lockdown query failed for attached device: {Message}", ex.Message);
        }

        device ??= new IosDevice
        {
            DeviceId = udid,
            DeviceName = "iOS Device",
            ProductType = string.Empty,
            ProductVersion = string.Empty,
            ConnectionSpeed = speed,
            IsConnected = true,
            IsTrusted = false,
            IsLocked = false,
            LastSeen = DateTimeOffset.UtcNow
        };

        device = device with { IsWiFiConnection = isWifi };

        lock (_lock)
        {
            _connectedDevices.RemoveAll(d => d.DeviceId.Equals(udid, StringComparison.OrdinalIgnoreCase));
            _connectedDevices.Insert(0, device);
        }

        DeviceStateChanged?.Invoke(this, device);
    }

    public async Task<bool> EnableWiFiSyncAsync(IosDevice device, CancellationToken cancellationToken = default)
    {
        try
        {
            using var client = new TcpClient();
            await client.ConnectAsync("127.0.0.1", UsbmuxdProtocol.UsbmuxdPort, cancellationToken);
            using var stream = client.GetStream();

            string listXml = UsbmuxdProtocol.CreateListDevicesRequest();
            byte[] listPkt = UsbmuxdProtocol.CreateUsbmuxPacket(listXml);
            await stream.WriteAsync(listPkt, cancellationToken);
            await stream.FlushAsync(cancellationToken);

            string? listResp = await UsbmuxdProtocol.ReadUsbmuxMessageAsync(stream, cancellationToken);
            int devId = 0;
            if (!string.IsNullOrWhiteSpace(listResp))
            {
                var doc = XDocument.Parse(listResp);
                foreach (var dDict in doc.Descendants("dict"))
                {
                    var elems = dDict.Elements().ToList();
                    for (int i = 0; i < elems.Count - 1; i += 2)
                    {
                        if (elems[i].Value == "SerialNumber" && string.Equals(elems[i + 1].Value, device.DeviceId, StringComparison.OrdinalIgnoreCase))
                        {
                            var idElem = elems.FirstOrDefault(e => e.PreviousNode is XElement prev && prev.Value == "DeviceID");
                            if (idElem != null) int.TryParse(idElem.Value, out devId);
                        }
                    }
                }
            }

            using var lockClient = new TcpClient();
            await lockClient.ConnectAsync("127.0.0.1", UsbmuxdProtocol.UsbmuxdPort, cancellationToken);
            using var lockStream = lockClient.GetStream();

            string connectXml = UsbmuxdProtocol.CreateConnectRequest(devId, UsbmuxdProtocol.LockdownPort);
            byte[] packet = UsbmuxdProtocol.CreateUsbmuxPacket(connectXml);
            await lockStream.WriteAsync(packet, cancellationToken);
            await lockStream.FlushAsync(cancellationToken);

            string? connectResp = await UsbmuxdProtocol.ReadUsbmuxMessageAsync(lockStream, cancellationToken);
            if (!string.IsNullOrWhiteSpace(connectResp) && connectResp.Contains("<integer>0</integer>"))
            {
                bool ok = await LockdownClient.EnableWiFiSyncAsync(lockStream, cancellationToken);
                _logger.LogInformation("EnableWiFiSync result for {Device}: {Result}", device.DeviceId, ok);
                return ok;
            }

            return false;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to enable WiFi sync for device {UDID}", device.DeviceId);
            return false;
        }
    }

    private void HandleDeviceDetached(int deviceId)
    {
        IosDevice? removed = null;
        lock (_lock)
        {
            if (_connectedDevices.Count > 0)
            {
                removed = _connectedDevices[0];
                _connectedDevices.RemoveAt(0);
            }
        }

        DeviceStateChanged?.Invoke(this, CurrentDevice);
    }

    public void AddSimulatedDeviceForTesting(IosDevice device)
    {
        lock (_lock)
        {
            _connectedDevices.RemoveAll(d => d.DeviceId == device.DeviceId);
            _connectedDevices.Insert(0, device);
        }
        DeviceStateChanged?.Invoke(this, device);
    }

    public void Dispose()
    {
        if (_isDisposed) return;
        _isDisposed = true;
        _monitoringCts?.Cancel();
        _monitoringCts?.Dispose();
    }
}
