using System.IO;
using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using SideLink.Core.Interfaces;
using SideLink.Core.Models;

namespace SideLink.Verification;

public class LinkUnlockService : ILinkUnlockService, IDisposable
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<LinkUnlockService> _logger;
    private string _baseUrl;
    private readonly string _remoteWebUrl;
    private readonly string _issuer;
    private readonly string _audience;
    private readonly string _verificationKey;

    private bool _isUnlocked;
    private VerificationSession? _currentSession;
    private readonly object _lock = new();

    public event EventHandler<bool>? SessionUnlockStateChanged;

    public bool IsSessionUnlocked
    {
        get
        {
            lock (_lock)
            {
                return _isUnlocked;
            }
        }
        private set
        {
            lock (_lock)
            {
                _isUnlocked = value;
            }
            SessionUnlockStateChanged?.Invoke(this, value);
        }
    }

    public VerificationSession? CurrentSession
    {
        get
        {
            lock (_lock)
            {
                return _currentSession;
            }
        }
    }

    private readonly EmbeddedVerificationServer _embeddedServer;

    public LinkUnlockService(
        HttpClient httpClient,
        string baseUrl,
        string verificationKey,
        ILogger<LinkUnlockService> logger,
        string issuer = "SideLink-verification",
        string audience = "SideLink-client")
    {
        _httpClient = httpClient;
        _baseUrl = baseUrl.TrimEnd('/');
        _remoteWebUrl = (Environment.GetEnvironmentVariable("SIDELINK_WEB_URL") ?? "https://sidelink-web.vercel.app").TrimEnd('/');
        _verificationKey = verificationKey;
        _logger = logger;
        _issuer = issuer;
        _audience = audience;

        _embeddedServer = new EmbeddedVerificationServer(_verificationKey, logger);
    }

    private static string GetLicenseFilePath()
    {
        string dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "SideLink");
        Directory.CreateDirectory(dir);
        return Path.Combine(dir, "unlocked.lic");
    }

    private static string GetVipLicenseFilePath()
    {
        string dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "SideLink");
        Directory.CreateDirectory(dir);
        return Path.Combine(dir, "vip_license.lic");
    }

    public string? GetSavedVipKey()
    {
        try
        {
            string vipPath = GetVipLicenseFilePath();
            if (File.Exists(vipPath))
            {
                byte[] encrypted = File.ReadAllBytes(vipPath);
                byte[] entropy = Encoding.UTF8.GetBytes("SideLink-VIP-Machine-v1");
                byte[] plainBytes = ProtectedData.Unprotect(encrypted, entropy, DataProtectionScope.CurrentUser);
                string plain = Encoding.UTF8.GetString(plainBytes);

                string[] parts = plain.Split('|');
                if (parts.Length >= 3)
                {
                    string machine = parts[0];
                    string user = parts[1];
                    string key = parts[2];
                    if (string.Equals(machine, Environment.MachineName, StringComparison.OrdinalIgnoreCase) &&
                        string.Equals(user, Environment.UserName, StringComparison.OrdinalIgnoreCase))
                    {
                        return key;
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Error reading saved VIP key: {Msg}", ex.Message);
        }
        return null;
    }

    public void RevokeLocalVipLicense()
    {
        try
        {
            string vipPath = GetVipLicenseFilePath();
            if (File.Exists(vipPath))
            {
                File.Delete(vipPath);
                _logger.LogInformation("Deleted local VIP license file.");
            }
            string licPath = GetLicenseFilePath();
            if (File.Exists(licPath))
            {
                File.Delete(licPath);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Failed to delete local VIP license: {Msg}", ex.Message);
        }
        finally
        {
            _isUnlocked = false;
            _currentSession = null;
            SessionUnlockStateChanged?.Invoke(this, false);
        }
    }

    public async Task<(bool IsValid, string? Reason)> ValidateSavedLicenseOnlineAsync(CancellationToken cancellationToken = default)
    {
        string? key = GetSavedVipKey();
        if (string.IsNullOrWhiteSpace(key))
        {
            _isUnlocked = false;
            return (false, "لا يوجد ترخيص VIP محفوظ على هذا الجهاز.");
        }

        try
        {
            using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(6) };
            string url = $"{_remoteWebUrl}/api/app/vip/status";

            var payload = new
            {
                key = key.Trim(),
                machineName = Environment.MachineName,
                userName = Environment.UserName
            };

            var content = new StringContent(
                JsonSerializer.Serialize(payload),
                Encoding.UTF8,
                "application/json"
            );

            var resp = await http.PostAsync(url, content, cancellationToken);
            if (resp.IsSuccessStatusCode)
            {
                var body = await resp.Content.ReadAsStringAsync(cancellationToken);
                using var doc = JsonDocument.Parse(body);
                var root = doc.RootElement;

                bool valid = root.TryGetProperty("valid", out var v) && v.GetBoolean();
                string? reason = root.TryGetProperty("reason", out var r) ? r.GetString() : null;

                if (!valid)
                {
                    _logger.LogWarning("VIP License revoked or inactive on server ({Key}): {Reason}", key, reason);
                    RevokeLocalVipLicense();
                    return (false, reason ?? "تم تعطيل أو إلغاء صلاحية هذا المفتاح من قبل الإدارة.");
                }

                _isUnlocked = true;
                return (true, null);
            }
            else
            {
                _logger.LogWarning("VIP status check returned status code: {Status}", resp.StatusCode);
                RevokeLocalVipLicense();
                return (false, "تم رفض الترخيص من الخادم.");
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Unable to contact verification server for license check: {Msg}", ex.Message);
            // If offline, check if local file signature is intact
            if (IsMachineAlreadyAuthorized())
            {
                return (true, null);
            }
            return (false, "تعذر الاتصال بخادم التحقق.");
        }
    }

    public bool IsMachineAlreadyAuthorized()
    {
        try
        {
            string vipPath = GetVipLicenseFilePath();
            if (File.Exists(vipPath))
            {
                byte[] encrypted = File.ReadAllBytes(vipPath);
                byte[] entropy = Encoding.UTF8.GetBytes("SideLink-VIP-Machine-v1");
                byte[] plainBytes = ProtectedData.Unprotect(encrypted, entropy, DataProtectionScope.CurrentUser);
                string plain = Encoding.UTF8.GetString(plainBytes);

                string[] parts = plain.Split('|');
                if (parts.Length >= 3)
                {
                    string machine = parts[0];
                    string user = parts[1];
                    string key = parts[2];
                    if (string.Equals(machine, Environment.MachineName, StringComparison.OrdinalIgnoreCase) &&
                        string.Equals(user, Environment.UserName, StringComparison.OrdinalIgnoreCase))
                    {
                        _isUnlocked = true;
                        _logger.LogInformation("Machine permanently authorized via local VIP license ({Key}).", key);
                        return true;
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Error reading VIP license: {Msg}", ex.Message);
        }

        return false;
    }

    public void SavePersistentVipLicense(string vipKey)
    {
        try
        {
            string vipPath = GetVipLicenseFilePath();
            string machineInfo = $"{Environment.MachineName}|{Environment.UserName}|{vipKey}|{DateTime.UtcNow:O}";
            byte[] plainBytes = Encoding.UTF8.GetBytes(machineInfo);
            byte[] entropy = Encoding.UTF8.GetBytes("SideLink-VIP-Machine-v1");
            byte[] encrypted = ProtectedData.Protect(plainBytes, entropy, DataProtectionScope.CurrentUser);
            File.WriteAllBytes(vipPath, encrypted);

            _isUnlocked = true;
            _logger.LogInformation("Persistent VIP license successfully saved on this machine: {Key}", vipKey);
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Failed to save VIP license: {Msg}", ex.Message);
        }
    }

    private void SavePersistentUnlockLicense(string token)
    {
        try
        {
            string licensePath = GetLicenseFilePath();
            string machineInfo = $"{Environment.MachineName}|{Environment.UserName}|{DateTime.UtcNow:O}|{token}";
            byte[] plainBytes = Encoding.UTF8.GetBytes(machineInfo);
            byte[] entropy = Encoding.UTF8.GetBytes("SideLink-Machine-Unlock-v1");
            byte[] encrypted = ProtectedData.Protect(plainBytes, entropy, DataProtectionScope.CurrentUser);
            File.WriteAllBytes(licensePath, encrypted);
            _logger.LogInformation("Persistent machine authorization license saved successfully.");
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Failed to save persistent license: {Msg}", ex.Message);
        }
    }

    public async Task<VerificationSession> CreateSessionAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            // Ensure zero-latency local embedded server is running
            EnsureEmbeddedServerStarted();
            _baseUrl = _embeddedServer.BaseUrl;

            _logger.LogInformation("Creating reliable local verification session via {BaseUrl}...", _baseUrl);

            var response = await _httpClient.PostAsJsonAsync(
                $"{_baseUrl}/api/verification/sessions",
                new { clientVersion = "1.0.0", platform = "windows-x64" },
                cancellationToken);

            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<CreateSessionApiResponse>(cancellationToken: cancellationToken);
            if (result == null || string.IsNullOrWhiteSpace(result.SessionId))
            {
                throw new InvalidOperationException("Invalid session creation response from embedded server.");
            }

            // Extract nonce from local result URL if present
            string nonce = string.Empty;
            if (!string.IsNullOrEmpty(result.VerificationUrl) && result.VerificationUrl.Contains("nonce="))
            {
                try
                {
                    int idx = result.VerificationUrl.IndexOf("nonce=");
                    if (idx >= 0)
                    {
                        nonce = result.VerificationUrl.Substring(idx + 6).Split('&')[0];
                    }
                }
                catch { }
            }

            // Always open the real web domain for official verification and Adsterra monetization
            string liveVerificationUrl = $"{_remoteWebUrl}/verify?session={result.SessionId}&nonce={nonce}";

            var session = new VerificationSession
            {
                SessionId = result.SessionId,
                VerificationUrl = liveVerificationUrl,
                ExpiresAt = result.ExpiresAt,
                Status = VerificationStatus.Pending,
                CreatedAt = DateTimeOffset.UtcNow
            };

            lock (_lock)
            {
                _currentSession = session;
                _isUnlocked = false;
            }

            _logger.LogInformation("Link Unlock session created: {SessionId}, expires at {Expires}", session.SessionId, session.ExpiresAt);
            return session;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create Link Unlock session");
            throw;
        }
    }

    public string GetVerificationBrowserUrl(string sessionId)
    {
        if (_currentSession != null && !string.IsNullOrWhiteSpace(_currentSession.VerificationUrl))
            return _currentSession.VerificationUrl;

        return $"{_remoteWebUrl}/verify?session={sessionId}";
    }

    public async Task<VerificationStatus> CheckSessionStatusAsync(string sessionId, CancellationToken cancellationToken = default)
    {
        try
        {
            // 1. Fast local check (instant response when browser sends local ping)
            try
            {
                var localResp = await _httpClient.GetAsync($"{_baseUrl}/api/verification/sessions/{sessionId}/status", cancellationToken);
                if (localResp.IsSuccessStatusCode)
                {
                    var data = await localResp.Content.ReadFromJsonAsync<VerificationStatusResponse>(cancellationToken: cancellationToken);
                    if (data != null && data.Status.Equals("verified", StringComparison.OrdinalIgnoreCase))
                    {
                        lock (_lock)
                        {
                            if (_currentSession != null && _currentSession.SessionId == sessionId)
                            {
                                _currentSession = _currentSession with { Status = VerificationStatus.Verified };
                            }
                        }
                        return VerificationStatus.Verified;
                    }
                }
            }
            catch { }

            // 2. Remote check on sidelink-web.vercel.app (in case browser blocked localhost ping)
            try
            {
                var remoteResp = await _httpClient.GetAsync($"{_remoteWebUrl}/api/verification/sessions/{sessionId}/status", cancellationToken);
                if (remoteResp.IsSuccessStatusCode)
                {
                    var remoteData = await remoteResp.Content.ReadFromJsonAsync<VerificationStatusResponse>(cancellationToken: cancellationToken);
                    if (remoteData != null && remoteData.Status.Equals("verified", StringComparison.OrdinalIgnoreCase))
                    {
                        // Sync local embedded server so local authorize succeeds
                        try
                        {
                            await _httpClient.GetAsync($"{_baseUrl}/api/ping-complete?session={sessionId}", cancellationToken);
                        }
                        catch { }

                        lock (_lock)
                        {
                            if (_currentSession != null && _currentSession.SessionId == sessionId)
                            {
                                _currentSession = _currentSession with { Status = VerificationStatus.Verified };
                            }
                        }
                        return VerificationStatus.Verified;
                    }
                }
            }
            catch { }

            return VerificationStatus.Pending;
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Status check error for session {SessionId}: {Message}", sessionId, ex.Message);
            return VerificationStatus.Pending;
        }
    }

    public async Task<bool> AuthorizeAndUnlockAsync(string sessionId, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Requesting authorization token for session {SessionId}...", sessionId);

            var response = await _httpClient.PostAsJsonAsync(
                $"{_baseUrl}/api/verification/sessions/{sessionId}/authorize",
                new { sessionId },
                cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Authorization rejected by backend with HTTP {Code}", response.StatusCode);
                return false;
            }

            var authResult = await response.Content.ReadFromJsonAsync<AuthorizationResponse>(cancellationToken: cancellationToken);
            if (authResult == null || string.IsNullOrWhiteSpace(authResult.Token))
            {
                _logger.LogError("Empty authorization token received.");
                return false;
            }

            // Cryptographically validate the token
            bool isValid = ValidateAuthorizationToken(authResult.Token, sessionId);
            if (isValid)
            {
                lock (_lock)
                {
                    if (_currentSession != null && _currentSession.SessionId == sessionId)
                    {
                        _currentSession = _currentSession with 
                        { 
                            Status = VerificationStatus.Verified,
                            AuthorizationToken = authResult.Token
                        };
                    }
                }

                IsSessionUnlocked = true;
                SavePersistentUnlockLicense(authResult.Token);
                _logger.LogInformation("Link Unlock verification validated. Application session is now UNLOCKED.");
                return true;
            }

            _logger.LogWarning("Authorization token failed cryptographic validation.");
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to authorize and unlock session {SessionId}", sessionId);
            return false;
        }
    }

    public bool ValidateAuthorizationToken(string jwtToken, string expectedSessionId)
    {
        try
        {
            var handler = new JwtSecurityTokenHandler();
            if (!handler.CanReadToken(jwtToken))
            {
                _logger.LogWarning("Malformed JWT token string.");
                return false;
            }

            // Prepare key validation
            SecurityKey key;
            if (_verificationKey.Length >= 32)
            {
                key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_verificationKey));
            }
            else
            {
                using var sha = SHA256.Create();
                key = new SymmetricSecurityKey(sha.ComputeHash(Encoding.UTF8.GetBytes(_verificationKey)));
            }

            var validationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = _issuer,
                ValidateAudience = true,
                ValidAudience = _audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromMinutes(2),
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key
            };

            var principal = handler.ValidateToken(jwtToken, validationParameters, out var validatedToken);

            // Verify session binding in sub or sessionId claim
            var subClaim = principal.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier || c.Type == "sub")?.Value;
            var sessionClaim = principal.Claims.FirstOrDefault(c => c.Type == "sessionId")?.Value;

            if (subClaim != expectedSessionId && sessionClaim != expectedSessionId)
            {
                _logger.LogWarning("Token session binding mismatch. Expected: {Expected}, Token has: {TokenSub}", expectedSessionId, subClaim);
                return false;
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "JWT signature or claim validation failed");
            return false;
        }
    }

    public void InvalidateCurrentSession()
    {
        lock (_lock)
        {
            _currentSession = null;
            IsSessionUnlocked = false;
        }
    }

    private void EnsureEmbeddedServerStarted()
    {
        if (!_embeddedServer.IsRunning)
        {
            _embeddedServer.Start();
        }
    }

    public void Dispose()
    {
        _embeddedServer.Dispose();
    }

    private record CreateSessionApiResponse
    {
        public string SessionId { get; init; } = string.Empty;
        public string? VerificationUrl { get; init; }
        public DateTimeOffset ExpiresAt { get; init; }
    }
}
