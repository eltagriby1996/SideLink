using System.Net.Sockets;
using System.Text;
using System.Xml.Linq;

namespace BitLoader.Device;

public static class UsbmuxdProtocol
{
    public const int UsbmuxdPort = 27015;
    public const int UsbmuxdVersion = 1;
    public const int RequestTypePlist = 8;
    public const ushort LockdownPort = 62078;

    public static byte[] CreateUsbmuxPacket(string xmlPayload, int tag = 1)
    {
        byte[] payloadBytes = Encoding.UTF8.GetBytes(xmlPayload);
        int totalLength = 16 + payloadBytes.Length;

        byte[] packet = new byte[totalLength];
        BitConverter.GetBytes(totalLength).CopyTo(packet, 0); // Length (LE)
        BitConverter.GetBytes(UsbmuxdVersion).CopyTo(packet, 4); // Version = 1
        BitConverter.GetBytes(RequestTypePlist).CopyTo(packet, 8); // Request = 8
        BitConverter.GetBytes(tag).CopyTo(packet, 12); // Tag
        Buffer.BlockCopy(payloadBytes, 0, packet, 16, payloadBytes.Length);

        return packet;
    }

    public static string CreateListenRequest()
    {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
               "<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n" +
               "<plist version=\"1.0\">\n" +
               "<dict>\n" +
               "    <key>MessageType</key>\n" +
               "    <string>Listen</string>\n" +
               "    <key>ClientVersionString</key>\n" +
               "    <string>BitLoader-1.0</string>\n" +
               "    <key>ProgName</key>\n" +
               "    <string>BitLoader</string>\n" +
               "</dict>\n" +
               "</plist>";
    }

    public static string CreateConnectRequest(int deviceId, ushort port)
    {
        // Port needs to be in network byte order (big-endian) converted to integer
        ushort networkPort = (ushort)(((port & 0xFF) << 8) | ((port >> 8) & 0xFF));

        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
               "<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n" +
               "<plist version=\"1.0\">\n" +
               "<dict>\n" +
               "    <key>MessageType</key>\n" +
               "    <string>Connect</string>\n" +
               "    <key>ClientVersionString</key>\n" +
               "    <string>BitLoader-1.0</string>\n" +
               "    <key>DeviceID</key>\n" +
               $"    <integer>{deviceId}</integer>\n" +
               "    <key>PortNumber</key>\n" +
               $"    <integer>{networkPort}</integer>\n" +
               "    <key>ProgName</key>\n" +
               "    <string>BitLoader</string>\n" +
               "</dict>\n" +
               "</plist>";
    }

    public static async Task<string?> ReadUsbmuxMessageAsync(NetworkStream stream, CancellationToken cancellationToken)
    {
        byte[] header = new byte[16];
        int bytesRead = 0;
        while (bytesRead < 16)
        {
            int read = await stream.ReadAsync(header.AsMemory(bytesRead, 16 - bytesRead), cancellationToken);
            if (read == 0) return null;
            bytesRead += read;
        }

        int totalLength = BitConverter.ToInt32(header, 0);
        int payloadLength = totalLength - 16;
        if (payloadLength <= 0 || payloadLength > 10 * 1024 * 1024)
            return null;

        byte[] payload = new byte[payloadLength];
        bytesRead = 0;
        while (bytesRead < payloadLength)
        {
            int read = await stream.ReadAsync(payload.AsMemory(bytesRead, payloadLength - bytesRead), cancellationToken);
            if (read == 0) return null;
            bytesRead += read;
        }

        return Encoding.UTF8.GetString(payload);
    }
}
