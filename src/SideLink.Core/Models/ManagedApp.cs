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

    public bool IsEligibleForRefresh =>
        !string.IsNullOrWhiteSpace(OriginalIpaPath) &&
        File.Exists(OriginalIpaPath) &&
        (Status == AppLifecycleStatus.Expired || Status == AppLifecycleStatus.ExpiringSoon || Status == AppLifecycleStatus.PendingRefresh);

    public double DaysUntilExpiration =>
        ExpirationDate.HasValue ? Math.Max(0, (ExpirationDate.Value - DateTimeOffset.UtcNow).TotalDays) : 999.0;
}

public record SigningConfiguration
{
    public string? AppleId { get; init; }
    public string? TeamId { get; init; }
    public string? TeamName { get; init; }
    public string? P12Path { get; init; }
    public string? MobileProvisionPath { get; init; }
    public SigningMethodType Method { get; init; } = SigningMethodType.PersonalTeam;
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
