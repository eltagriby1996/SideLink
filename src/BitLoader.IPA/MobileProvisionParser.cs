using System.Security.Cryptography.Pkcs;
using System.Text;
using BitLoader.Core.Models;

namespace BitLoader.IPA;

public static class MobileProvisionParser
{
    public static MobileProvisionInfo? Parse(byte[] provisionData)
    {
        if (provisionData == null || provisionData.Length == 0)
            return null;

        byte[]? xmlBytes = null;

        // Try standard PKCS#7 / SignedCms decoding
        try
        {
            var signedCms = new SignedCms();
            signedCms.Decode(provisionData);
            xmlBytes = signedCms.ContentInfo.Content;
        }
        catch
        {
            // Fallback: extract XML between <?xml and </plist>
            xmlBytes = ExtractXmlBoundary(provisionData);
        }

        if (xmlBytes == null || xmlBytes.Length == 0)
        {
            xmlBytes = ExtractXmlBoundary(provisionData);
        }

        if (xmlBytes == null || xmlBytes.Length == 0)
            return null;

        var plist = PlistParser.ParseXmlPlist(xmlBytes);
        if (plist.Count == 0)
            return null;

        var info = new MobileProvisionInfo
        {
            Name = plist.TryGetValue("Name", out var n) ? n?.ToString() ?? string.Empty : string.Empty,
            AppIdName = plist.TryGetValue("AppIDName", out var a) ? a?.ToString() ?? string.Empty : string.Empty,
            TeamName = plist.TryGetValue("TeamName", out var tn) ? tn?.ToString() ?? string.Empty : string.Empty,
            CreationDate = plist.TryGetValue("CreationDate", out var cd) && cd is DateTimeOffset dtoC 
                ? dtoC 
                : (DateTimeOffset.TryParse(plist.GetValueOrDefault("CreationDate")?.ToString(), out var parsedCd) ? parsedCd : DateTimeOffset.UtcNow),
            ExpirationDate = plist.TryGetValue("ExpirationDate", out var ed) && ed is DateTimeOffset dtoE 
                ? dtoE 
                : (DateTimeOffset.TryParse(plist.GetValueOrDefault("ExpirationDate")?.ToString(), out var parsedEd) ? parsedEd : DateTimeOffset.UtcNow.AddDays(7))
        };

        // Extract TeamIdentifier
        if (plist.TryGetValue("TeamIdentifier", out var teamIdObj))
        {
            if (teamIdObj is List<object> teamList && teamList.Count > 0)
            {
                info = info with { TeamIdentifier = teamList[0]?.ToString() ?? string.Empty };
            }
            else if (teamIdObj is string teamStr)
            {
                info = info with { TeamIdentifier = teamStr };
            }
        }

        // Extract ProvisionedDevices
        if (plist.TryGetValue("ProvisionedDevices", out var devicesObj) && devicesObj is List<object> devList)
        {
            var devices = devList.Select(d => d?.ToString() ?? string.Empty).Where(s => !string.IsNullOrWhiteSpace(s)).ToList();
            info = info with { ProvisionedDevices = devices };
        }

        // Extract Entitlements
        if (plist.TryGetValue("Entitlements", out var entObj) && entObj is Dictionary<string, object> entDict)
        {
            var entitlements = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            foreach (var kvp in entDict)
            {
                entitlements[kvp.Key] = kvp.Value?.ToString() ?? string.Empty;
            }
            info = info with { Entitlements = entitlements };
        }

        return info;
    }

    private static byte[]? ExtractXmlBoundary(byte[] data)
    {
        string raw = Encoding.UTF8.GetString(data);
        int startIndex = raw.IndexOf("<?xml", StringComparison.OrdinalIgnoreCase);
        if (startIndex == -1)
            startIndex = raw.IndexOf("<plist", StringComparison.OrdinalIgnoreCase);

        if (startIndex == -1)
            return null;

        int endIndex = raw.IndexOf("</plist>", startIndex, StringComparison.OrdinalIgnoreCase);
        if (endIndex == -1)
            return null;

        endIndex += "</plist>".Length;
        string xmlSub = raw.Substring(startIndex, endIndex - startIndex);
        return Encoding.UTF8.GetBytes(xmlSub);
    }
}
