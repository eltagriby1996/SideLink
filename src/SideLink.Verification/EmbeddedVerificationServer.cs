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
<html lang=""ar"" dir=""rtl"">
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>SideLink — تأكيد جلسة التشغيل</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
        body { background: #030712; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
        .card { background: #0f172a; border: 1px solid #1e293b; border-radius: 24px; padding: 36px 28px; max-width: 440px; width: 100%; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7); position: relative; overflow: hidden; }
        .accent-bar { position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #3b82f6, #6366f1, #06b6d4); }
        .icon-circle { width: 68px; height: 68px; background: rgba(59,130,246,0.12); border: 1px solid rgba(59,130,246,0.3); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 30px; margin-bottom: 18px; }
        h1 { font-size: 22px; font-weight: 800; margin-bottom: 8px; color: #ffffff; }
        p { font-size: 13px; color: #94a3b8; line-height: 1.6; margin-bottom: 20px; }
        .session-box { background: #020617; border: 1px solid #1e293b; border-radius: 10px; padding: 10px; font-size: 11px; color: #64748b; font-family: monospace; margin-bottom: 22px; word-break: break-all; }
        .btn { background: linear-gradient(to right, #2563eb, #4f46e5); color: white; border: 1px solid rgba(147,197,253,0.3); border-radius: 14px; padding: 14px 20px; font-size: 14px; font-weight: 700; width: 100%; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 14px rgba(37,99,235,0.4); display: flex; align-items: center; justify-content: center; gap: 8px; }
        .btn:hover { opacity: 0.95; transform: scale(0.99); }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .success-box { display: none; padding: 10px 0; text-align: center; }
        .success-icon { width: 72px; height: 72px; background: rgba(16,185,129,0.18); border: 2px solid rgba(52,211,153,0.6); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 34px; margin: 0 auto 16px; color: #34d399; }
        .footer { font-size: 11px; color: #475569; margin-top: 24px; }
        .progress-bar { height: 4px; background: #1e293b; border-radius: 2px; overflow: hidden; margin-bottom: 16px; display: none; }
        .progress-fill { height: 100%; width: 0%; background: #38bdf8; transition: width 0.4s ease; }
    </style>
</head>
<body>
    <div class=""card"">
        <div class=""accent-bar""></div>
        <div id=""verifyView"">
            <div class=""icon-circle"">🛡️</div>
            <h1>تأكيد جلسة تشغيل SideLink</h1>
            <p>يلزم إجراء خطوة تحقق سريعة لمرة واحدة لتأمين جلسة العمل وفتح البرنامج على الكمبيوتر.</p>
            <div class=""session-box"" id=""sessionDisplay"">جاري قراءة معرّف الجلسة...</div>
            <div class=""progress-bar"" id=""progBar""><div class=""progress-fill"" id=""progFill""></div></div>
            <button class=""btn"" id=""verifyBtn"" onclick=""handleVerify()"">
                <span>🛡️ تأكيد التحقق وفتح البرنامج الآن</span>
            </button>
        </div>
        <div id=""successView"" class=""success-box"">
            <div class=""success-icon"">✓</div>
            <h2 style=""font-size:20px; font-weight:800; color:#fff; margin-bottom:8px;"">تم تأكيد الجلسة بنجاح!</h2>
            <p style=""color:#a7f3d0;"">تم التحقق وفك قفل البرنامج محلياً. يمكنك الآن إغلاق هذه الصفحة والبدء في استخدام SideLink فوراً.</p>
        </div>
        <div class=""footer"">SideLink &bull; أمان مشفر محلي بالكامل &bull; ترخيص دائم لهذا الجهاز</div>
    </div>
    <script>
        const params = new URLSearchParams(window.location.search);
        const session = params.get('session') || '';
        const nonce = params.get('nonce') || '';
        document.getElementById('sessionDisplay').innerText = 'Session ID: ' + (session ? session.slice(0, 24) + '...' : 'Local');

        async function handleVerify() {
            const btn = document.getElementById('verifyBtn');
            const pBar = document.getElementById('progBar');
            const pFill = document.getElementById('progFill');
            btn.disabled = true;
            btn.innerHTML = 'جاري التحقق والمصادقة المشفرة...';
            pBar.style.display = 'block';
            pFill.style.width = '35%';

            setTimeout(() => { pFill.style.width = '70%'; }, 350);

            try {
                const res = await fetch('/api/verification/sessions/' + session + '/complete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ nonce })
                });
                pFill.style.width = '100%';
                const data = await res.json();
                if (res.ok && data.success) {
                    setTimeout(() => {
                        document.getElementById('verifyView').style.display = 'none';
                        document.getElementById('successView').style.display = 'block';
                    }, 400);
                } else {
                    alert('تعذر التحقق: ' + (data.error || 'Server rejected'));
                    btn.disabled = false;
                    btn.innerHTML = 'إعادة المحاولة';
                    pBar.style.display = 'none';
                }
            } catch (err) {
                alert('حدث خطأ أثناء الاتصال بمحرك التحقق المحلي.');
                btn.disabled = false;
                btn.innerHTML = 'إعادة المحاولة';
                pBar.style.display = 'none';
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
