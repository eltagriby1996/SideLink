using System.Net.Http;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace SideLink.Signing;

public interface IAnisetteClient
{
    Task<Dictionary<string, string>> GetAnisetteHeadersAsync(CancellationToken cancellationToken = default);
}

public class AnisetteClient : IAnisetteClient
{
    private readonly ILogger<AnisetteClient> _logger;
    private static readonly string[] AnisetteServers = new[]
    {
        "https://mac-ani.jkcoxson.com",
        "https://ani.sidestore.io",
        "https://new.ani.sidestore.io",
        "https://ani.npeg.us",
        "https://ani.idevicehacked.com"
    };

    private Dictionary<string, string>? _cachedHeaders;
    private DateTime _cacheExpiry = DateTime.MinValue;
    private readonly SemaphoreSlim _lock = new(1, 1);

    public AnisetteClient(ILogger<AnisetteClient> logger)
    {
        _logger = logger;
    }

    public async Task<Dictionary<string, string>> GetAnisetteHeadersAsync(CancellationToken cancellationToken = default)
    {
        await _lock.WaitAsync(cancellationToken);
        try
        {
            if (_cachedHeaders != null && DateTime.UtcNow < _cacheExpiry)
            {
                return new Dictionary<string, string>(_cachedHeaders);
            }

            using var httpClient = new HttpClient();
            httpClient.Timeout = TimeSpan.FromSeconds(6);

            foreach (var serverUrl in AnisetteServers)
            {
                try
                {
                    _logger.LogInformation("Attempting to fetch Anisette device attestation from {Server}", serverUrl);
                    string json = await httpClient.GetStringAsync(serverUrl, cancellationToken);
                    using var doc = JsonDocument.Parse(json);
                    
                    var headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                    foreach (var prop in doc.RootElement.EnumerateObject())
                    {
                        string val = prop.Value.ValueKind == JsonValueKind.String 
                            ? prop.Value.GetString() ?? string.Empty 
                            : prop.Value.ToString();
                        headers[prop.Name] = val;
                    }

                    if (headers.ContainsKey("X-Apple-I-MD") && headers.ContainsKey("X-Apple-I-MD-M"))
                    {
                        _logger.LogInformation("Successfully acquired Anisette credentials from {Server}", serverUrl);
                        _cachedHeaders = headers;
                        _cacheExpiry = DateTime.UtcNow.AddMinutes(2);
                        return new Dictionary<string, string>(headers);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning("Anisette server {Server} query failed: {Message}", serverUrl, ex.Message);
                }
            }

            _logger.LogWarning("All remote Anisette servers failed or timed out. Generating fallback machine headers.");
            var fallback = GenerateFallbackHeaders();
            _cachedHeaders = fallback;
            _cacheExpiry = DateTime.UtcNow.AddMinutes(1);
            return fallback;
        }
        finally
        {
            _lock.Release();
        }
    }

    private static Dictionary<string, string> GenerateFallbackHeaders()
    {
        string machineId = Guid.NewGuid().ToString("D").ToUpperInvariant();
        string clientTime = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ");
        return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["X-Apple-I-Client-Time"] = clientTime,
            ["X-Apple-I-MD"] = "AAAABQAAABCQ67rRtfysReSCkZlEEIBOAAAABA==",
            ["X-Apple-I-MD-LU"] = Guid.NewGuid().ToString("N").ToUpperInvariant(),
            ["X-Apple-I-MD-M"] = Convert.ToBase64String(Guid.NewGuid().ToByteArray()),
            ["X-Apple-I-MD-RINFO"] = "17106176",
            ["X-Apple-I-SRL-NO"] = "0",
            ["X-Apple-I-TimeZone"] = "UTC",
            ["X-Apple-Locale"] = "en_US",
            ["X-MMe-Client-Info"] = "<MacBookPro13,2> <macOS;13.1;22C65> <com.apple.AuthKit/1 (com.apple.akd/1.0)>",
            ["X-Mme-Device-Id"] = machineId
        };
    }
}
