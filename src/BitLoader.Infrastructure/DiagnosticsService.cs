using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.ServiceProcess;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using BitLoader.Core.Interfaces;
using BitLoader.Core.Models;

namespace BitLoader.Infrastructure;

public static class SensitiveDataRedactor
{
    private static readonly Regex TokenRegex = new(@"(ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})", RegexOptions.Compiled);
    private static readonly Regex PasswordRegex = new(@"(password|pwd|secret|token|authorization)\s*[:=]\s*[""']?([^""'\s,]+)[""']?", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static string Redact(string input)
    {
        if (string.IsNullOrEmpty(input)) return input;

        // Redact JWT tokens
        string redacted = TokenRegex.Replace(input, "ey***[REDACTED_TOKEN]***");

        // Redact passwords & secrets
        redacted = PasswordRegex.Replace(redacted, m => $"{m.Groups[1].Value}=***[REDACTED]***");

        return redacted;
    }
}

public class DiagnosticsService : IDiagnosticsService
{
    private readonly ILogger<DiagnosticsService> _logger;
    private readonly string _backendBaseUrl;

    public DiagnosticsService(string backendBaseUrl, ILogger<DiagnosticsService> logger)
    {
        _backendBaseUrl = backendBaseUrl;
        _logger = logger;
    }

    public async Task<IReadOnlyList<DiagnosticCheckResult>> RunAllDiagnosticsAsync(CancellationToken cancellationToken = default)
    {
        var results = new List<DiagnosticCheckResult>();

        // 1. Windows OS & Architecture
        results.Add(CheckOperatingSystem());

        // 2. Apple Mobile Device Service (Windows Service)
        results.Add(CheckAppleMobileDeviceService());

        // 3. Usbmuxd TCP Port 27015
        results.Add(await CheckUsbmuxdPortAsync(cancellationToken));

        // 4. Apple Support Files & Drivers
        results.Add(CheckAppleDrivers());

        // 5. Verification Backend Connectivity
        results.Add(await CheckBackendConnectivityAsync(cancellationToken));

        // 6. Local Disk Space
        results.Add(CheckDiskSpace());

        return results;
    }

    public async Task<string> GenerateDiagnosticReportAsync(CancellationToken cancellationToken = default)
    {
        var checks = await RunAllDiagnosticsAsync(cancellationToken);
        var sb = new StringBuilder();

        sb.AppendLine("=== BitLoader Diagnostic System Report ===");
        sb.AppendLine($"Timestamp (UTC): {DateTimeOffset.UtcNow:O}");
        sb.AppendLine($"Machine Architecture: {RuntimeInformation.OSArchitecture}");
        sb.AppendLine($"OS Description: {RuntimeInformation.OSDescription}");
        sb.AppendLine($"Runtime: .NET {Environment.Version}");
        sb.AppendLine("------------------------------------------");

        foreach (var c in checks)
        {
            string statusIcon = c.Passed ? "[PASS]" : (c.Severity == DiagnosticSeverity.Warning ? "[WARN]" : "[FAIL]");
            sb.AppendLine($"{statusIcon} {c.Category} - {c.Name}: {c.Message}");
            if (!string.IsNullOrWhiteSpace(c.ActionableGuidance))
            {
                sb.AppendLine($"       Guidance: {c.ActionableGuidance}");
            }
        }

        sb.AppendLine("==========================================");
        return SensitiveDataRedactor.Redact(sb.ToString());
    }

    private static DiagnosticCheckResult CheckOperatingSystem()
    {
        bool isWindows = RuntimeInformation.IsOSPlatform(OSPlatform.Windows);
        bool is64Bit = Environment.Is64BitOperatingSystem;

        if (isWindows && is64Bit)
        {
            return new DiagnosticCheckResult
            {
                Name = "Windows Architecture",
                Category = "System",
                Passed = true,
                Severity = DiagnosticSeverity.Success,
                Message = $"{RuntimeInformation.OSDescription} (x64) - Supported."
            };
        }

        return new DiagnosticCheckResult
        {
            Name = "Windows Architecture",
            Category = "System",
            Passed = false,
            Severity = DiagnosticSeverity.Error,
            Message = "BitLoader requires 64-bit Windows 10 or Windows 11.",
            ActionableGuidance = "Run BitLoader on a 64-bit version of Windows 10/11."
        };
    }

    private static DiagnosticCheckResult CheckAppleMobileDeviceService()
    {
        try
        {
            var services = ServiceController.GetServices();
            var amds = services.FirstOrDefault(s => s.ServiceName.Contains("Apple Mobile Device", StringComparison.OrdinalIgnoreCase));

            if (amds != null)
            {
                bool isRunning = amds.Status == ServiceControllerStatus.Running;
                return new DiagnosticCheckResult
                {
                    Name = "Apple Mobile Device Service",
                    Category = "Apple Drivers",
                    Passed = isRunning,
                    Severity = isRunning ? DiagnosticSeverity.Success : DiagnosticSeverity.Warning,
                    Message = $"Service is {amds.Status}.",
                    ActionableGuidance = isRunning ? null : "Start the 'Apple Mobile Device Service' in Windows Services (services.msc)."
                };
            }
        }
        catch { }

        return new DiagnosticCheckResult
        {
            Name = "Apple Mobile Device Service",
            Category = "Apple Drivers",
            Passed = false,
            Severity = DiagnosticSeverity.Warning,
            Message = "Apple Mobile Device Service was not detected in Windows Services.",
            ActionableGuidance = "Install iTunes (64-bit non-Microsoft Store version) or Apple Mobile Device Support."
        };
    }

    private static async Task<DiagnosticCheckResult> CheckUsbmuxdPortAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var client = new TcpClient();
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(2));

            await client.ConnectAsync("127.0.0.1", 27015, cts.Token);
            return new DiagnosticCheckResult
            {
                Name = "Usbmuxd Loopback Port (27015)",
                Category = "Communication",
                Passed = true,
                Severity = DiagnosticSeverity.Success,
                Message = "Port 27015 is open and accepting device connections."
            };
        }
        catch (Exception ex)
        {
            return new DiagnosticCheckResult
            {
                Name = "Usbmuxd Loopback Port (27015)",
                Category = "Communication",
                Passed = false,
                Severity = DiagnosticSeverity.Warning,
                Message = $"Cannot connect to usbmux daemon on 127.0.0.1:27015 ({ex.Message}).",
                ActionableGuidance = "Ensure Apple Mobile Device Service is running so BitLoader can detect USB connected iPhones."
            };
        }
    }

    private static DiagnosticCheckResult CheckAppleDrivers()
    {
        string p64 = @"C:\Program Files\Common Files\Apple\Mobile Device Support\MobileDevice.dll";
        string p86 = @"C:\Program Files (x86)\Common Files\Apple\Mobile Device Support\MobileDevice.dll";

        if (File.Exists(p64) || File.Exists(p86))
        {
            return new DiagnosticCheckResult
            {
                Name = "Apple Mobile Device Support Files",
                Category = "Apple Drivers",
                Passed = true,
                Severity = DiagnosticSeverity.Success,
                Message = $"MobileDevice.dll found at {(File.Exists(p64) ? p64 : p86)}."
            };
        }

        return new DiagnosticCheckResult
        {
            Name = "Apple Mobile Device Support Files",
            Category = "Apple Drivers",
            Passed = false,
            Severity = DiagnosticSeverity.Warning,
            Message = "Apple Mobile Device Support files were not found in standard directories.",
            ActionableGuidance = "Install iTunes from apple.com/itunes to ensure full USB driver support."
        };
    }

    private async Task<DiagnosticCheckResult> CheckBackendConnectivityAsync(CancellationToken cancellationToken)
    {
        try
        {
            using var client = new HttpClient { Timeout = TimeSpan.FromSeconds(3) };
            var uri = new Uri(new Uri(_backendBaseUrl), "/api/health");
            var response = await client.GetAsync(uri, cancellationToken);

            return new DiagnosticCheckResult
            {
                Name = "Link Unlock Backend Server",
                Category = "Network",
                Passed = response.IsSuccessStatusCode,
                Severity = response.IsSuccessStatusCode ? DiagnosticSeverity.Success : DiagnosticSeverity.Warning,
                Message = $"Backend responded with HTTP {(int)response.StatusCode} {response.ReasonPhrase}."
            };
        }
        catch (Exception ex)
        {
            return new DiagnosticCheckResult
            {
                Name = "Link Unlock Backend Server",
                Category = "Network",
                Passed = false,
                Severity = DiagnosticSeverity.Info,
                Message = $"Backend check: {ex.Message}.",
                ActionableGuidance = "Verify network connection or ensure the verification backend server is running."
            };
        }
    }

    private static DiagnosticCheckResult CheckDiskSpace()
    {
        try
        {
            var appDataPath = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            var driveInfo = new DriveInfo(Path.GetPathRoot(appDataPath) ?? "C:\\");
            long freeMb = driveInfo.AvailableFreeSpace / (1024 * 1024);

            return new DiagnosticCheckResult
            {
                Name = "Available Disk Space",
                Category = "System",
                Passed = freeMb > 500,
                Severity = freeMb > 500 ? DiagnosticSeverity.Success : DiagnosticSeverity.Warning,
                Message = $"{freeMb:N0} MB available on drive {driveInfo.Name}."
            };
        }
        catch
        {
            return new DiagnosticCheckResult
            {
                Name = "Available Disk Space",
                Category = "System",
                Passed = true,
                Severity = DiagnosticSeverity.Info,
                Message = "Disk space check skipped."
            };
        }
    }
}
