using System.Net.Http.Json;
using Microsoft.Extensions.Logging;
using SideLink.Core.Interfaces;

namespace SideLink.Infrastructure;

public class TelemetryClient : ITelemetryClient
{
    private readonly HttpClient _httpClient;
    private readonly string _telemetryUrl;
    private readonly ILogger<TelemetryClient> _logger;

    public TelemetryClient(HttpClient httpClient, ILogger<TelemetryClient> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        string baseUrl = Environment.GetEnvironmentVariable("SIDELINK_WEB_URL") ?? "https://www.sidelinktool.me";
        _telemetryUrl = $"{baseUrl.TrimEnd('/')}/api/app/telemetry";
    }

    public Task TrackEventAsync(
        string action,
        string status,
        string? deviceModel = null,
        string? iosVersion = null,
        string? errorCode = null,
        string? errorMessage = null)
    {
        _ = Task.Run(async () =>
        {
            try
            {
                var payload = new
                {
                    clientVersion = "1.0.0",
                    deviceModel = string.IsNullOrWhiteSpace(deviceModel) ? "Windows Client Device" : deviceModel,
                    iosVersion = string.IsNullOrWhiteSpace(iosVersion) ? "iOS Device" : iosVersion,
                    action,
                    status,
                    errorCode,
                    errorMessage
                };

                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
                await _httpClient.PostAsJsonAsync(_telemetryUrl, payload, cts.Token);
                _logger.LogDebug("Telemetry event sent: {Action} - {Status}", action, status);
            }
            catch (Exception ex)
            {
                _logger.LogDebug("Telemetry delivery skipped: {Msg}", ex.Message);
            }
        });

        return Task.CompletedTask;
    }
}

