namespace SideLink.Core.Models;

public enum SigningMethodType
{
    PersonalTeam,   // 7-day free Apple ID developer certificate
    PaidDeveloper,  // 365-day Apple Developer Program certificate
    CustomP12,      // Enterprise / Custom Ad-Hoc P12 + Mobileprovision
    PreserveExisting// Keep existing signature in IPA
}

public enum AppLifecycleStatus
{
    Active,
    ExpiringSoon, // <= 3 days remaining
    Expired,
    Failed,
    PendingRefresh
}

public record ManagedApp
{
    public string Id { get; init; } = Guid.NewGuid().ToString("N");
    public string BundleIdentifier { get; init; } = string.Empty;
    public string AppName { get; init; } = string.Empty;
    public string Version { get; init; } = string.Empty;
    public string? OriginalIpaPath { get; init; }
    public string? IconBase64 { get; init; }
    public DateTimeOffset InstalledAt { get; init; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? LastRefreshedAt { get; init; }
    public SigningMethodType SigningMethod { get; init; } = SigningMethodType.PersonalTeam;
    public DateTimeOffset? ExpirationDate { get; init; }
    public AppLifecycleStatus Status { get; init; } = AppLifecycleStatus.Active;
    public string DeviceUdid { get; init; } = string.Empty;
    public string? LastErrorMessage { get; init; }

    public string? ResolvedIpaPath
    {
        get
        {
            if (!string.IsNullOrWhiteSpace(OriginalIpaPath) && File.Exists(OriginalIpaPath))
            {
                return OriginalIpaPath;
            }

            try
            {
                string cacheDir = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "SideLink",
                    "AppCache");

                if (Directory.Exists(cacheDir))
                {
                    string byBundle = Path.Combine(cacheDir, $"{BundleIdentifier}.ipa");
                    if (File.Exists(byBundle)) return byBundle;

                    string byName = Path.Combine(cacheDir, $"{AppName}.ipa");
                    if (File.Exists(byName)) return byName;
                }
            }
            catch { }

            return null;
        }
    }

    public bool IsEligibleForRefresh =>
        ResolvedIpaPath != null &&
        (Status == AppLifecycleStatus.Expired || Status == AppLifecycleStatus.ExpiringSoon || Status == AppLifecycleStatus.PendingRefresh);

    public double DaysUntilExpiration =>
        ExpirationDate.HasValue ? Math.Max(0, (ExpirationDate.Value - DateTimeOffset.UtcNow).TotalDays) : 999.0;

    public string ExpirationStatusBadge
    {
        get
        {
            if (!ExpirationDate.HasValue) return "شهادة غير محددة";
            var remaining = ExpirationDate.Value - DateTimeOffset.UtcNow;
            if (remaining.TotalSeconds <= 0)
                return "منتهي الصلاحية ⚠️ (بحاجة لتجديد)";
            if (remaining.TotalHours <= 24)
                return $"باقي {Math.Max(1, (int)remaining.TotalHours)} ساعة ⚠️ (جدد الآن)";
            var days = (int)Math.Ceiling(remaining.TotalDays);
            if (days <= 3)
                return $"باقي {days} أيام ⏳ (يُفضل التجديد)";
            return $"باقي {days} أيام ✓ (نشط)";
        }
    }

    public string ExpirationBadgeColor
    {
        get
        {
            if (!ExpirationDate.HasValue) return "#64748B";
            var remaining = ExpirationDate.Value - DateTimeOffset.UtcNow;
            if (remaining.TotalSeconds <= 0) return "#EF4444"; // Red
            if (remaining.TotalDays <= 3) return "#F59E0B";    // Amber
            return "#10B981";                                  // Emerald
        }
    }
}

public record SigningConfiguration
{
    public string? AppleId { get; init; }
    public string? TeamId { get; init; }
    public string? TeamName { get; init; }
    public string? P12Path { get; init; }
    public string? P12Password { get; init; } = "sidelink";
    public string? MobileProvisionPath { get; init; }
    public SigningMethodType Method { get; init; } = SigningMethodType.PersonalTeam;
    public string? CustomBundleId { get; init; }
    public bool ModifyBundleId { get; init; } = true;
    public string? CustomDisplayName { get; init; }
}

public enum DiagnosticSeverity
{
    Info,
    Success,
    Warning,
    Error
}

public record DiagnosticCheckResult
{
    public string Name { get; init; } = string.Empty;
    public string Category { get; init; } = "General";
    public bool Passed { get; init; }
    public string Message { get; init; } = string.Empty;
    public string? ActionableGuidance { get; init; }
    public DiagnosticSeverity Severity { get; init; } = DiagnosticSeverity.Info;
}

public record AppOperationProgress
{
    public string OperationId { get; init; } = Guid.NewGuid().ToString("N");
    public string Title { get; init; } = string.Empty;
    public string CurrentStep { get; init; } = string.Empty;
    public int PercentComplete { get; init; }
    public bool IsIndeterminate { get; init; }
    public bool IsCompleted { get; init; }
    public bool HasError { get; init; }
    public string? ErrorMessage { get; init; }
}
