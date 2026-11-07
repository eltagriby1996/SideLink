namespace SideLink.Core.Models;

public enum VerificationStatus
{
    Pending,
    Verified,
    Expired,
    Failed
}

public record VerificationSession
{
    public string SessionId { get; init; } = string.Empty;
    public string VerificationUrl { get; init; } = string.Empty;
    public DateTimeOffset ExpiresAt { get; init; }
    public VerificationStatus Status { get; init; } = VerificationStatus.Pending;
    public string? AuthorizationToken { get; init; }
    public DateTimeOffset CreatedAt { get; init; } = DateTimeOffset.UtcNow;

    public bool IsExpired => DateTimeOffset.UtcNow >= ExpiresAt;
}

public record VerificationStatusResponse
{
    public string SessionId { get; init; } = string.Empty;
    public string Status { get; init; } = "pending";
    public DateTimeOffset ExpiresAt { get; init; }
    public string? Message { get; init; }
}

public record AuthorizationResponse
{
    public string SessionId { get; init; } = string.Empty;
    public string Token { get; init; } = string.Empty;
    public DateTimeOffset ExpiresAt { get; init; }
}

public record RemoteConfigDto
{
    public bool EmergencyKillSwitch { get; init; }
    public string KillSwitchMessage { get; init; } = string.Empty;
    public string LatestVersion { get; init; } = "1.0.0";
    public string DownloadUrl { get; init; } = string.Empty;
    public bool ForceUpdate { get; init; }
    public string ReleaseNotes { get; init; } = string.Empty;
}
