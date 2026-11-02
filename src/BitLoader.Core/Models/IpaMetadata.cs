namespace BitLoader.Core.Models;

public record IpaMetadata
{
    public string BundleIdentifier { get; init; } = string.Empty;
    public string BundleName { get; init; } = string.Empty;
    public string DisplayName { get; init; } = string.Empty;
    public string Version { get; init; } = string.Empty;
    public string BuildNumber { get; init; } = string.Empty;
    public string MinimumOsVersion { get; init; } = "14.0";
    public string ExecutableName { get; init; } = string.Empty;
    public string FilePath { get; init; } = string.Empty;
    public long FileSizeBytes { get; init; }
    public string? IconBase64 { get; init; }
    public bool HasMobileProvision { get; init; }
    public MobileProvisionInfo? ProvisioningProfile { get; init; }

    public string EffectiveTitle => !string.IsNullOrWhiteSpace(DisplayName) 
        ? DisplayName 
        : (!string.IsNullOrWhiteSpace(BundleName) ? BundleName : Path.GetFileNameWithoutExtension(FilePath));

    public string FormattedFileSize
    {
        get
        {
            if (FileSizeBytes < 1024) return $"{FileSizeBytes} B";
            if (FileSizeBytes < 1024 * 1024) return $"{FileSizeBytes / 1024.0:F1} KB";
            if (FileSizeBytes < 1024 * 1024 * 1024) return $"{FileSizeBytes / (1024.0 * 1024.0):F1} MB";
            return $"{FileSizeBytes / (1024.0 * 1024.0 * 1024.0):F2} GB";
        }
    }
}

public record MobileProvisionInfo
{
    public string Name { get; init; } = string.Empty;
    public string AppIdName { get; init; } = string.Empty;
    public string TeamIdentifier { get; init; } = string.Empty;
    public string TeamName { get; init; } = string.Empty;
    public DateTimeOffset CreationDate { get; init; }
    public DateTimeOffset ExpirationDate { get; init; }
    public List<string> ProvisionedDevices { get; init; } = new();
    public Dictionary<string, string> Entitlements { get; init; } = new();

    public bool IsExpired => DateTimeOffset.UtcNow >= ExpirationDate;
    public double DaysRemaining => Math.Max(0, (ExpirationDate - DateTimeOffset.UtcNow).TotalDays);
    public TimeSpan TimeRemaining => ExpirationDate > DateTimeOffset.UtcNow ? ExpirationDate - DateTimeOffset.UtcNow : TimeSpan.Zero;

    public string ExpirationStatusText
    {
        get
        {
            if (IsExpired) return "Expired";
            if (DaysRemaining < 1.0)
            {
                var hours = (int)TimeRemaining.TotalHours;
                return $"Expires in {hours}h {TimeRemaining.Minutes}m";
            }
            return $"Expires in {(int)DaysRemaining} days";
        }
    }
}
