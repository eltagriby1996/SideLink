namespace SideLink.Core.Models;

public record IosDevice
{
    public string DeviceId { get; init; } = string.Empty; // UDID
    public string DeviceName { get; init; } = "iOS Device";
    public string ProductType { get; init; } = string.Empty; // e.g. iPhone15,2
    public string ProductVersion { get; init; } = string.Empty; // e.g. 17.5.1
    public string DeviceClass { get; init; } = "iPhone";
    public int ConnectionSpeed { get; init; }
    public bool IsConnected { get; init; }
    public bool IsTrusted { get; init; }
    public bool IsLocked { get; init; }
    public bool IsWiFiConnection { get; init; }
    public DateTimeOffset LastSeen { get; init; } = DateTimeOffset.UtcNow;

    public string ConnectionMedium => IsWiFiConnection ? "📶 Wi-Fi" : "🔌 USB";
    public string FriendlyModelName => ModelLookup.GetFriendlyName(ProductType);
    public string DisplayTitle => string.IsNullOrWhiteSpace(DeviceName) ? $"{FriendlyModelName} ({ConnectionMedium})" : $"{DeviceName} ({FriendlyModelName}) — {ConnectionMedium}";
}

public static class ModelLookup
{
    private static readonly Dictionary<string, string> KnownModels = new(StringComparer.OrdinalIgnoreCase)
    {
        // iPhones
        ["iPhone10,1"] = "iPhone 8",
        ["iPhone10,2"] = "iPhone 8 Plus",
        ["iPhone10,3"] = "iPhone X",
        ["iPhone10,6"] = "iPhone X",
        ["iPhone11,2"] = "iPhone XS",
        ["iPhone11,4"] = "iPhone XS Max",
        ["iPhone11,6"] = "iPhone XS Max",
        ["iPhone11,8"] = "iPhone XR",
        ["iPhone12,1"] = "iPhone 11",
        ["iPhone12,3"] = "iPhone 11 Pro",
        ["iPhone12,5"] = "iPhone 11 Pro Max",
        ["iPhone12,8"] = "iPhone SE (2nd gen)",
        ["iPhone13,1"] = "iPhone 12 mini",
        ["iPhone13,2"] = "iPhone 12",
        ["iPhone13,3"] = "iPhone 12 Pro",
        ["iPhone13,4"] = "iPhone 12 Pro Max",
        ["iPhone14,2"] = "iPhone 13 Pro",
        ["iPhone14,3"] = "iPhone 13 Pro Max",
        ["iPhone14,4"] = "iPhone 13 mini",
        ["iPhone14,5"] = "iPhone 13",
        ["iPhone14,6"] = "iPhone SE (3rd gen)",
        ["iPhone14,7"] = "iPhone 14",
        ["iPhone14,8"] = "iPhone 14 Plus",
        ["iPhone15,2"] = "iPhone 14 Pro",
        ["iPhone15,3"] = "iPhone 14 Pro Max",
        ["iPhone15,4"] = "iPhone 15",
        ["iPhone15,5"] = "iPhone 15 Plus",
        ["iPhone16,1"] = "iPhone 15 Pro",
        ["iPhone16,2"] = "iPhone 15 Pro Max",
        ["iPhone17,1"] = "iPhone 16 Pro",
        ["iPhone17,2"] = "iPhone 16 Pro Max",
        ["iPhone17,3"] = "iPhone 16",
        ["iPhone17,4"] = "iPhone 16 Plus",
        
        // iPads
        ["iPad13,1"] = "iPad Air (4th gen)",
        ["iPad13,2"] = "iPad Air (4th gen)",
        ["iPad13,4"] = "iPad Pro 11-inch (3rd gen)",
        ["iPad13,8"] = "iPad Pro 12.9-inch (5th gen)",
        ["iPad13,16"] = "iPad Air (5th gen)",
        ["iPad13,17"] = "iPad Air (5th gen)",
        ["iPad14,1"] = "iPad mini (6th gen)",
        ["iPad14,3"] = "iPad Pro 11-inch (4th gen)",
        ["iPad14,5"] = "iPad Pro 12.9-inch (6th gen)",
        ["iPad16,3"] = "iPad Pro 11-inch (M4)",
        ["iPad16,5"] = "iPad Pro 13-inch (M4)",
    };

    public static string GetFriendlyName(string productType)
    {
        if (string.IsNullOrWhiteSpace(productType))
            return "iOS Device";

        return KnownModels.TryGetValue(productType, out var name) ? name : productType;
    }
}
