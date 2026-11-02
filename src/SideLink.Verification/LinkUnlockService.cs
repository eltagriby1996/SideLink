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

public class LinkUnlockService : ILinkUnlockService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<LinkUnlockService> _logger;
    private string _baseUrl;
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
        _verificationKey = verificationKey;
        _logger = logger;
        _issuer = issuer;
        _audience = audience;

        _embeddedServer = new EmbeddedVerificationServer(_verificationKey, logger);
        _embeddedServer.Start();
    }

    public async Task<VerificationSession> CreateSessionAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Creating new Link Unlock verification session via {BaseUrl}...", _baseUrl);

            HttpResponseMessage response;
            try
            {
                using var quickCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                quickCts.CancelAfter(TimeSpan.FromSeconds(2));
                response = await _httpClient.PostAsJsonAsync(
                    $"{_baseUrl}/api/verification/sessions",
                    new { clientVersion = "1.0.0", platform = "windows-x64" },
                    quickCts.Token);

                response.EnsureSuccessStatusCode();
            }
            catch (Exception)
            {
                // If remote server unreachable, seamlessly fallback to built-in local verification server
                _logger.LogInformation("Remote server unreachable, seamlessly using embedded verification server at {Url}", _embeddedServer.BaseUrl);
                _baseUrl = _embeddedServer.BaseUrl;
                response = await _httpClient.PostAsJsonAsync(
                    $"{_baseUrl}/api/verification/sessions",
                    new { clientVersion = "1.0.0", platform = "windows-x64" },
                    cancellationToken);
                response.EnsureSuccessStatusCode();
            }

            var result = await response.Content.ReadFromJsonAsync<CreateSessionApiResponse>(cancellationToken: cancellationToken);
            if (result == null || string.IsNullOrWhiteSpace(result.SessionId))
            {
                throw new InvalidOperationException("Invalid session creation response from backend.");
            }

            var session = new VerificationSession
            {
                SessionId = result.SessionId,
                VerificationUrl = string.IsNullOrWhiteSpace(result.VerificationUrl) 
                    ? $"{_baseUrl}/verify?session={result.SessionId}" 
                    : result.VerificationUrl,
                ExpiresAt = result.ExpiresAt,
                Status = VerificationStatus.Pending,
                CreatedAt = DateTimeOffset.UtcNow
            };

            lock (_lock)
            {
                _currentSession = session;
                _isUnlocked = false; // Always lock on new session
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

        return $"{_baseUrl}/verify?session={sessionId}";
    }

    public async Task<VerificationStatus> CheckSessionStatusAsync(string sessionId, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _httpClient.GetAsync($"{_baseUrl}/api/verification/sessions/{sessionId}/status", cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                    return VerificationStatus.Expired;

                return VerificationStatus.Failed;
            }

            var data = await response.Content.ReadFromJsonAsync<VerificationStatusResponse>(cancellationToken: cancellationToken);
            if (data == null) return VerificationStatus.Pending;

            var status = data.Status.ToLowerInvariant() switch
            {
                "verified" => VerificationStatus.Verified,
                "expired" => VerificationStatus.Expired,
                "failed" => VerificationStatus.Failed,
                _ => VerificationStatus.Pending
            };

            lock (_lock)
            {
                if (_currentSession != null && _currentSession.SessionId == sessionId)
                {
                    _currentSession = _currentSession with { Status = status };
                }
            }

            return status;
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

    private record CreateSessionApiResponse
    {
        public string SessionId { get; init; } = string.Empty;
        public string? VerificationUrl { get; init; }
        public DateTimeOffset ExpiresAt { get; init; }
    }
}
