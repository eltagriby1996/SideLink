using System.Net;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace SideLink.Verification;

/// <summary>
/// Built-in zero-dependency local verification server.
/// Runs transparently inside SideLink so end users never have to run terminal commands,
/// install Node.js, or launch any servers manually.
/// </summary>
public class EmbeddedVerificationServer : IDisposable
{
    private readonly HttpListener _listener = new();
    private readonly ILogger _logger;
    private readonly string _verificationKey;
    private CancellationTokenSource? _cts;
    private Task? _listenTask;
    private readonly Dictionary<string, EmbeddedSession> _sessions = new();
    private readonly object _lock = new();

    public int Port { get; private set; } = 5055;
    public string BaseUrl => $"http://127.0.0.1:{Port}";
    public bool IsRunning => _listener.IsListening;

    public EmbeddedVerificationServer(string verificationKey, ILogger logger, int port = 5055)
    {
        _verificationKey = verificationKey;
        _logger = logger;
        Port = port;
    }

    public void Start()
    {
        if (IsRunning) return;

        try
        {
            _listener.Prefixes.Clear();
            _listener.Prefixes.Add($"http://127.0.0.1:{Port}/");
            _listener.Start();

            _cts = new CancellationTokenSource();
            _listenTask = Task.Run(() => ListenLoopAsync(_cts.Token));
            _logger.LogInformation("Embedded Link Unlock verification server started seamlessly on {Url}", BaseUrl);
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Could not bind port {Port}, trying fallback dynamic port: {Msg}", Port, ex.Message);
            try
            {
                // Try dynamic port fallback
                Port = 5056;
                _listener.Prefixes.Clear();
                _listener.Prefixes.Add($"http://127.0.0.1:{Port}/");
                _listener.Start();

                _cts = new CancellationTokenSource();
                _listenTask = Task.Run(() => ListenLoopAsync(_cts.Token));
            }
            catch (Exception fallbackEx)
            {
                _logger.LogError(fallbackEx, "Failed to start embedded verification server");
            }
        }
    }

    private async Task ListenLoopAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested && _listener.IsListening)
        {
            try
            {
                var context = await _listener.GetContextAsync();
                _ = Task.Run(() => HandleRequestAsync(context));
            }
            catch (HttpListenerException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogDebug("Embedded server listen loop note: {Msg}", ex.Message);
            }
        }
    }

    private async Task HandleRequestAsync(HttpListenerContext context)
    {
        var req = context.Request;
        var res = context.Response;

        // Enable CORS
        res.Headers.Add("Access-Control-Allow-Origin", "*");
        res.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.Headers.Add("Access-Control-Allow-Headers", "Content-Type, Authorization");

        if (req.HttpMethod == "OPTIONS")
        {
            res.StatusCode = 204;
            res.Close();
            return;
        }

        string path = req.Url?.AbsolutePath ?? "/";

        try
        {
            if (path == "/" || path == "/verify")
            {
                await ServeVerificationPageAsync(context);
                return;
            }
            else if (path == "/api/health" && req.HttpMethod == "GET")
            {
                await SendJsonAsync(res, new { status = "ok", mode = "embedded", timestamp = DateTime.UtcNow });
                return;
            }
            else if (path == "/api/verification/sessions" && req.HttpMethod == "POST")
            {
                string sessionId = Guid.NewGuid().ToString("N");
                string nonce = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
                var expiresAt = DateTimeOffset.UtcNow.AddMinutes(10);

                lock (_lock)
                {
                    _sessions[sessionId] = new EmbeddedSession
                    {
                        SessionId = sessionId,
                        Nonce = nonce,
                        ExpiresAt = expiresAt,
                        Status = "pending"
                    };
                }

                string verificationUrl = $"{BaseUrl}/verify?session={sessionId}&nonce={nonce}";
                await SendJsonAsync(res, new
                {
                    sessionId,
                    verificationUrl,
                    expiresAt = expiresAt.ToString("O")
                }, 201);
                return;
            }
            else if (path.StartsWith("/api/verification/sessions/") && path.EndsWith("/status") && req.HttpMethod == "GET")
            {
                string[] parts = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
                string sessionId = parts.Length >= 4 ? parts[3] : string.Empty;

                EmbeddedSession? session = null;
                lock (_lock)
                {
                    if (_sessions.TryGetValue(sessionId, out var s))
                    {
                        if (s.Status == "pending" && DateTimeOffset.UtcNow >= s.ExpiresAt)
                            s.Status = "expired";
                        session = s;
                    }
                }

                if (session == null)
                {
                    await SendJsonAsync(res, new { error = "Session not found", status = "expired" }, 404);
                    return;
                }

                await SendJsonAsync(res, new
                {
                    sessionId = session.SessionId,
                    status = session.Status,
                    expiresAt = session.ExpiresAt.ToString("O")
                });
                return;
            }
            else if (path.StartsWith("/api/verification/sessions/") && path.EndsWith("/complete") && req.HttpMethod == "POST")
            {
                string[] parts = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
                string sessionId = parts.Length >= 4 ? parts[3] : string.Empty;

                using var reader = new StreamReader(req.InputStream, req.ContentEncoding);
                string body = await reader.ReadToEndAsync();
                string nonce = string.Empty;
                try
                {
                    using var doc = JsonDocument.Parse(body);
                    nonce = doc.RootElement.GetProperty("nonce").GetString() ?? string.Empty;
                }
                catch { }

                bool success = false;
                lock (_lock)
                {
                    if (_sessions.TryGetValue(sessionId, out var s))
                    {
                        if (s.Nonce == nonce && s.Status != "expired")
                        {
                            s.Status = "verified";
                            success = true;
                        }
                    }
                }

                if (success)
                {
                    await SendJsonAsync(res, new { success = true, sessionId, status = "verified" });
                }
                else
                {
                    await SendJsonAsync(res, new { error = "Invalid verification proof" }, 400);
                }
                return;
            }
            else if (path.StartsWith("/api/verification/sessions/") && path.EndsWith("/authorize") && req.HttpMethod == "POST")
            {
                string[] parts = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
                string sessionId = parts.Length >= 4 ? parts[3] : string.Empty;

                bool isVerified = false;
                lock (_lock)
                {
                    if (_sessions.TryGetValue(sessionId, out var s) && s.Status == "verified")
                        isVerified = true;
                }

                if (!isVerified)
                {
                    await SendJsonAsync(res, new { error = "Session not verified" }, 403);
                    return;
                }

                string token = GenerateJwtToken(sessionId);
                var expiresAt = DateTimeOffset.UtcNow.AddMinutes(5);

                await SendJsonAsync(res, new
                {
                    sessionId,
                    token,
                    expiresAt = expiresAt.ToString("O"),
                    tokenType = "Bearer"
                });
                return;
            }

            res.StatusCode = 404;
            res.Close();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling embedded server request");
            res.StatusCode = 500;
            res.Close();
        }
    }

    private static async Task SendJsonAsync(HttpListenerResponse res, object data, int statusCode = 200)
    {
        res.StatusCode = statusCode;
        res.ContentType = "application/json; charset=utf-8";
        byte[] bytes = JsonSerializer.SerializeToUtf8Bytes(data);
        res.ContentLength64 = bytes.Length;
        await res.OutputStream.WriteAsync(bytes);
        res.OutputStream.Close();
    }

    private static async Task ServeVerificationPageAsync(HttpListenerContext context)
    {
        var res = context.Response;
        res.ContentType = "text/html; charset=utf-8";

        string html = @"<!DOCTYPE html>
<html lang=""en"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width""=device-width, initial-scale=1.0"">
    <title>SideLink — Launch Verification</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        body { background: #090e17; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
        .card { background: #131d2e; border: 1px solid #1e293b; border-radius: 20px; padding: 40px 32px; max-width: 460px; width: 100%; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); position: relative; overflow: hidden; }
        .card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #3b82f6, #6366f1, #06b6d4); }
        .icon-circle { width: 68px; height: 68px; background: rgba(59,130,246,0.12); border: 1px solid rgba(59,130,246,0.25); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 28px; margin-bottom: 20px; }
        h1 { font-size: 24px; font-weight: 800; margin-bottom: 8px; color: #ffffff; }
        p { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px; }
        .session-box { background: #0b111c; border: 1px solid #1e293b; border-radius: 10px; padding: 12px; font-size: 12px; color: #64748b; font-family: monospace; margin-bottom: 24px; word-break: break-all; }
        .btn { background: #2563eb; color: white; border: none; border-radius: 12px; padding: 14px 24px; font-size: 15px; font-weight: 600; width: 100%; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 14px rgba(37,99,235,0.4); display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn:hover { background: #1d4ed8; }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .success-box { display: none; padding: 20px; text-align: center; }
        .success-icon { width: 64px; height: 64px; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px; margin-bottom: 16px; color: #34d399; }
        .footer { font-size: 11px; color: #475569; margin-top: 24px; }
    </style>
</head>
<body>
    <div class=""card"">
        <div id=""verifyView"">
            <div class=""icon-circle"">🛡️</div>
            <h1>SideLink Verification</h1>
            <p>One-step launch authorization gateway for SideLink iOS Sideloading &amp; Refresh Manager.</p>
            <div class=""session-box"" id=""sessionDisplay"">Loading session...</div>
            <button class=""btn"" id=""verifyBtn"" onclick=""handleVerify()"">
                <span>Complete Verification</span> ➔
            </button>
        </div>
        <div id=""successView"" class=""success-box"">
            <div class=""success-icon"">✓</div>
            <h2 style=""font-size:20px; font-weight:700; color:#fff; margin-bottom:8px;"">Application Unlocked!</h2>
            <p style=""color:#cbd5e1;"">Verification confirmed. You can now close this browser tab and return to SideLink.</p>
        </div>
        <div class=""footer"">SideLink &bull; Zero credentials stored on cloud &bull; End-to-end local security</div>
    </div>
    <script>
        const params = new URLSearchParams(window.location.search);
        const session = params.get('session') || '';
        const nonce = params.get('nonce') || '';
        document.getElementById('sessionDisplay').innerText = 'Session: ' + (session ? session.slice(0, 20) + '...' : 'Local');

        async function handleVerify() {
            const btn = document.getElementById('verifyBtn');
            btn.disabled = true;
            btn.innerHTML = 'Verifying...';

            try {
                const res = await fetch('/api/verification/sessions/' + session + '/complete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nonce })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    document.getElementById('verifyView').style.display = 'none';
                    document.getElementById('successView').style.display = 'block';
                } else {
                    alert('Verification error: ' + (data.error || 'Server rejected'));
                    btn.disabled = false;
                    btn.innerHTML = 'Retry Verification';
                }
            } catch (err) {
                alert('Network error connecting to verification service.');
                btn.disabled = false;
                btn.innerHTML = 'Retry Verification';
            }
        }
    </script>
</body>
</html>";

        byte[] bytes = Encoding.UTF8.GetBytes(html);
        res.ContentLength64 = bytes.Length;
        await res.OutputStream.WriteAsync(bytes);
        res.OutputStream.Close();
    }

    private string GenerateJwtToken(string sessionId)
    {
        // Generate valid HMAC-SHA256 JWT
        string header = Base64UrlEncode("{\"alg\":\"HS256\",\"typ\":\"JWT\"}");
        long iat = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        long exp = DateTimeOffset.UtcNow.AddMinutes(5).ToUnixTimeSeconds();

        string payloadJson = $"{{\"sub\":\"{sessionId}\",\"sessionId\":\"{sessionId}\",\"iss\":\"SideLink-verification\",\"aud\":\"SideLink-client\",\"iat\":{iat},\"exp\":{exp}}}";
        string payload = Base64UrlEncode(payloadJson);

        string unsigned = $"{header}.{payload}";
        byte[] keyBytes = Encoding.UTF8.GetBytes(_verificationKey);
        using var hmac = new HMACSHA256(keyBytes);
        byte[] sigBytes = hmac.ComputeHash(Encoding.UTF8.GetBytes(unsigned));
        string signature = Base64UrlEncode(sigBytes);

        return $"{unsigned}.{signature}";
    }

    private static string Base64UrlEncode(string text)
    {
        return Base64UrlEncode(Encoding.UTF8.GetBytes(text));
    }

    private static string Base64UrlEncode(byte[] bytes)
    {
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    public void Dispose()
    {
        _cts?.Cancel();
        _cts?.Dispose();
        if (_listener.IsListening)
        {
            try { _listener.Stop(); } catch { }
        }
        _listener.Close();
    }

    private class EmbeddedSession
    {
        public string SessionId { get; set; } = string.Empty;
        public string Nonce { get; set; } = string.Empty;
        public DateTimeOffset ExpiresAt { get; set; }
        public string Status { get; set; } = "pending";
    }
}
