namespace SideLink.Core.Interfaces;

public interface ITelemetryClient
{
    Task TrackEventAsync(
        string action,
        string status,
        string? deviceModel = null,
        string? iosVersion = null,
        string? errorCode = null,
        string? errorMessage = null);
}

