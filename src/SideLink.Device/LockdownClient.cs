using System.Buffers.Binary;
using System.Net.Sockets;
using System.Text;
using System.Xml.Linq;
using SideLink.Core.Models;

namespace SideLink.Device;

public static class LockdownClient
{
    public static async Task<IosDevice?> QueryDeviceInfoAsync(NetworkStream lockdownStream, int deviceNumber, string udid, int speed, CancellationToken cancellationToken)
    {
        try
        {
            // 1. Send QueryType
            string queryTypeReq = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
                                  "<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n" +
                                  "<plist version=\"1.0\">\n" +
                                  "<dict>\n" +
                                  "    <key>Request</key>\n" +
                                  "    <string>QueryType</string>\n" +
                                  "    <key>Label</key>\n" +
                                  "    <string>SideLink</string>\n" +
                                  "</dict>\n" +
                                  "</plist>";

            await SendLockdownMessageAsync(lockdownStream, queryTypeReq, cancellationToken);
            string? typeResp = await ReadLockdownMessageAsync(lockdownStream, cancellationToken);
            if (string.IsNullOrWhiteSpace(typeResp))
                return null;

            // 2. Send GetValue to read all device values
            string getValueReq = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
                                 "<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n" +
                                 "<plist version=\"1.0\">\n" +
                                 "<dict>\n" +
                                 "    <key>Request</key>\n" +
                                 "    <string>GetValue</string>\n" +
                                 "    <key>Label</key>\n" +
                                 "    <string>SideLink</string>\n" +
                                 "</dict>\n" +
                                 "</plist>";

            await SendLockdownMessageAsync(lockdownStream, getValueReq, cancellationToken);
            string? valueResp = await ReadLockdownMessageAsync(lockdownStream, cancellationToken);
            if (string.IsNullOrWhiteSpace(valueResp))
                return null;

            return ParseLockdownResponse(valueResp, udid, speed);
        }
        catch
        {
            return new IosDevice
            {
                DeviceId = udid,
                DeviceName = "iOS Device",
                ProductType = string.Empty,
                ProductVersion = string.Empty,
                ConnectionSpeed = speed,
                IsConnected = true,
                IsTrusted = false,
                IsLocked = false
            };
        }
    }

    private static async Task SendLockdownMessageAsync(NetworkStream stream, string xml, CancellationToken cancellationToken)
    {
        byte[] payload = Encoding.UTF8.GetBytes(xml);
        byte[] header = new byte[4];
        BinaryPrimitives.WriteUInt32BigEndian(header, (uint)payload.Length);

        await stream.WriteAsync(header, cancellationToken);
        await stream.WriteAsync(payload, cancellationToken);
        await stream.FlushAsync(cancellationToken);
    }

    private static async Task<string?> ReadLockdownMessageAsync(NetworkStream stream, CancellationToken cancellationToken)
    {
        byte[] header = new byte[4];
        int bytesRead = 0;
        while (bytesRead < 4)
        {
            int read = await stream.ReadAsync(header.AsMemory(bytesRead, 4 - bytesRead), cancellationToken);
            if (read == 0) return null;
            bytesRead += read;
        }

        uint length = BinaryPrimitives.ReadUInt32BigEndian(header);
        if (length == 0 || length > 5 * 1024 * 1024)
            return null;

        byte[] payload = new byte[length];
        bytesRead = 0;
        while (bytesRead < (int)length)
        {
            int read = await stream.ReadAsync(payload.AsMemory(bytesRead, (int)length - bytesRead), cancellationToken);
            if (read == 0) return null;
            bytesRead += read;
        }

        return Encoding.UTF8.GetString(payload);
    }

    private static IosDevice ParseLockdownResponse(string xml, string fallbackUdid, int speed)
    {
        string deviceName = "iOS Device";
        string productType = string.Empty;
        string productVersion = string.Empty;
        string deviceClass = "iPhone";
        string udid = fallbackUdid;
        bool isTrusted = true;
        bool isLocked = false;

        try
        {
            var doc = XDocument.Parse(xml);
            var rootDict = doc.Root?.Element("dict");
            if (rootDict != null)
            {
                var elements = rootDict.Elements().ToList();
                for (int i = 0; i < elements.Count - 1; i += 2)
                {
                    if (elements[i].Name.LocalName == "key")
                    {
                        string key = elements[i].Value;
                        var valElem = elements[i + 1];

                        if (key.Equals("Error", StringComparison.OrdinalIgnoreCase))
                        {
                            string err = valElem.Value;
                            if (err.Contains("PasswordProtected", StringComparison.OrdinalIgnoreCase))
                            {
                                isLocked = true;
                                isTrusted = false;
                            }
                            else if (err.Contains("PairingDialogResponsePending", StringComparison.OrdinalIgnoreCase) ||
                                     err.Contains("InvalidHostID", StringComparison.OrdinalIgnoreCase))
                            {
                                isTrusted = false;
                            }
                        }
                        else if (key.Equals("Value", StringComparison.OrdinalIgnoreCase) && valElem.Name.LocalName == "dict")
                        {
                            var innerElements = valElem.Elements().ToList();
                            for (int j = 0; j < innerElements.Count - 1; j += 2)
                            {
                                if (innerElements[j].Name.LocalName == "key")
                                {
                                    string vKey = innerElements[j].Value;
                                    string vVal = innerElements[j + 1].Value;

                                    switch (vKey)
                                    {
                                        case "DeviceName": deviceName = vVal; break;
                                        case "ProductType": productType = vVal; break;
                                        case "ProductVersion": productVersion = vVal; break;
                                        case "DeviceClass": deviceClass = vVal; break;
                                        case "UniqueDeviceID": udid = vVal; break;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        catch
        {
            // Parse error fallback
        }

        return new IosDevice
        {
            DeviceId = udid,
            DeviceName = deviceName,
            ProductType = productType,
            ProductVersion = productVersion,
            DeviceClass = deviceClass,
            ConnectionSpeed = speed,
            IsConnected = true,
            IsTrusted = isTrusted,
            IsLocked = isLocked,
            LastSeen = DateTimeOffset.UtcNow
        };
    }
}
