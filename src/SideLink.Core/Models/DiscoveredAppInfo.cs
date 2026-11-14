namespace SideLink.Core.Models;

/// <summary>
/// Represents an application discovered on a connected iOS device via MobileDevice installation proxy.
/// </summary>
public record DiscoveredAppInfo
{
    public string BundleIdentifier { get; init; } = string.Empty;
    public string AppName { get; init; } = string.Empty;
    public string Version { get; init; } = "1.0";
    public string? SignerIdentity { get; init; }
    public bool IsAppStore { get; init; }
    public bool IsSideLinkManaged { get; init; }
    public string? CachedIpaPath { get; init; }

    public bool HasCachedIpa => !string.IsNullOrWhiteSpace(CachedIpaPath) && System.IO.File.Exists(CachedIpaPath);

    public string AppSourceBadge => IsAppStore ? "متجر App Store" : "تطبيق مخصص (SideLink)";
    public string AppSourceBadgeColor => IsAppStore ? "#38BDF8" : "#10B981";
}

