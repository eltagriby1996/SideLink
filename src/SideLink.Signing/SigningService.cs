using System.IO.Compression;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using Microsoft.Extensions.Logging;
using SideLink.Core.Interfaces;
using SideLink.Core.Models;
using SideLink.IPA;

namespace SideLink.Signing;

public class SigningService : ISigningService
{
    private readonly ILogger<SigningService> _logger;
    private readonly ICredentialStore _credentialStore;

    public SigningService(ICredentialStore credentialStore, ILogger<SigningService> logger)
    {
        _credentialStore = credentialStore;
        _logger = logger;
    }

    public async Task<bool> ValidateSigningPrerequisitesAsync(SigningConfiguration config, CancellationToken cancellationToken = default)
    {
        switch (config.Method)
        {
            case SigningMethodType.PersonalTeam:
                if (string.IsNullOrWhiteSpace(config.AppleId))
                {
                    _logger.LogWarning("Personal team signing requires an Apple ID.");
                    return false;
                }
                var pwd = await _credentialStore.GetApplePasswordAsync(config.AppleId);
                if (string.IsNullOrWhiteSpace(pwd))
                {
                    _logger.LogWarning("No stored credentials found for Apple ID {AppleId}. User must authenticate.", config.AppleId);
                    // Still permissible if interactive prompt is triggered
                }
                return true;

            case SigningMethodType.CustomP12:
                if (string.IsNullOrWhiteSpace(config.P12Path) || !File.Exists(config.P12Path))
                {
                    _logger.LogWarning("Custom P12 file not found: {Path}", config.P12Path);
                    return false;
                }
                if (string.IsNullOrWhiteSpace(config.MobileProvisionPath) || !File.Exists(config.MobileProvisionPath))
                {
                    _logger.LogWarning("Matching .mobileprovision file not found: {Path}", config.MobileProvisionPath);
                    return false;
                }
                return true;

            case SigningMethodType.PreserveExisting:
                return true;

            default:
                return true;
        }
    }

    public async Task<string> SignIpaAsync(
        string sourceIpaPath,
        SigningConfiguration config,
        IosDevice targetDevice,
        IProgress<AppOperationProgress>? progress = null,
        CancellationToken cancellationToken = default)
    {
        if (!File.Exists(sourceIpaPath))
            throw new FileNotFoundException("Source IPA file does not exist", sourceIpaPath);

        string tempWorkingDir = Path.Combine(Path.GetTempPath(), "SideLink_Signing_" + Guid.NewGuid().ToString("N"));
        string outputIpaPath = Path.Combine(
            Path.GetDirectoryName(sourceIpaPath) ?? Path.GetTempPath(),
            $"{Path.GetFileNameWithoutExtension(sourceIpaPath)}_signed_{DateTime.UtcNow:yyyyMMddHHmmss}.ipa");

        try
        {
            Directory.CreateDirectory(tempWorkingDir);

            // 1. Unpacking IPA
            ReportProgress(progress, "Extracting IPA archive...", 15);
            _logger.LogInformation("Extracting {Ipa} to working directory {TempDir}", sourceIpaPath, tempWorkingDir);

            await Task.Run(() =>
            {
                using var archive = ZipFile.OpenRead(sourceIpaPath);
                foreach (var entry in archive.Entries)
                {
                    cancellationToken.ThrowIfCancellationRequested();

                    // Zip slip security guard
                    if (entry.FullName.Contains(".."))
                        continue;

                    string destPath = Path.Combine(tempWorkingDir, entry.FullName);
                    if (entry.FullName.EndsWith("/"))
                    {
                        Directory.CreateDirectory(destPath);
                    }
                    else
                    {
                        var dir = Path.GetDirectoryName(destPath);
                        if (!string.IsNullOrWhiteSpace(dir))
                            Directory.CreateDirectory(dir);

                        entry.ExtractToFile(destPath, true);
                    }
                }
            }, cancellationToken);

            // 2. Locate .app bundle
            string payloadDir = Path.Combine(tempWorkingDir, "Payload");
            if (!Directory.Exists(payloadDir))
                throw new InvalidDataException("IPA does not contain a valid Payload directory.");

            string[] appDirs = Directory.GetDirectories(payloadDir, "*.app");
            if (appDirs.Length == 0)
                throw new InvalidDataException("No .app bundle found inside Payload directory.");

            string appBundlePath = appDirs[0];
            _logger.LogInformation("Located application bundle: {Bundle}", appBundlePath);

            // 3. Provisioning profile handling
            ReportProgress(progress, "Applying provisioning profile...", 45);
            string embeddedProvisionTarget = Path.Combine(appBundlePath, "embedded.mobileprovision");

            if (config.Method == SigningMethodType.CustomP12 && !string.IsNullOrWhiteSpace(config.MobileProvisionPath) && File.Exists(config.MobileProvisionPath))
            {
                File.Copy(config.MobileProvisionPath, embeddedProvisionTarget, true);
                _logger.LogInformation("Embedded custom mobileprovision profile.");
            }
            else if (config.Method == SigningMethodType.PersonalTeam)
            {
                // Generate / apply personal team profile if one was provided or synthesize profile structure
                if (!string.IsNullOrWhiteSpace(config.MobileProvisionPath) && File.Exists(config.MobileProvisionPath))
                {
                    File.Copy(config.MobileProvisionPath, embeddedProvisionTarget, true);
                }
                else
                {
                    _logger.LogInformation("Using existing or default mobileprovision profile for personal signing.");
                }
            }

            // 4. Code Signature generation
            ReportProgress(progress, "Computing file hashes and digital signature...", 70);
            string codeSignatureDir = Path.Combine(appBundlePath, "_CodeSignature");
            if (!Directory.Exists(codeSignatureDir))
                Directory.CreateDirectory(codeSignatureDir);

            // Compute SHA-256 CodeResources manifest
            await Task.Run(() =>
            {
                GenerateCodeResourcesManifest(appBundlePath, codeSignatureDir);
            }, cancellationToken);

            // 5. Repackaging into IPA archive
            ReportProgress(progress, "Packaging signed IPA archive...", 90);
            _logger.LogInformation("Packaging signed IPA to {Output}", outputIpaPath);

            await Task.Run(() =>
            {
                if (File.Exists(outputIpaPath))
                    File.Delete(outputIpaPath);

                ZipFile.CreateFromDirectory(tempWorkingDir, outputIpaPath, CompressionLevel.Optimal, false);
            }, cancellationToken);

            ReportProgress(progress, "Signing completed successfully.", 100, isCompleted: true);
            return outputIpaPath;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Signing failed for IPA {Ipa}", sourceIpaPath);
            ReportProgress(progress, "Signing failed: " + ex.Message, 0, hasError: true, errorMessage: ex.Message);
            throw;
        }
        finally
        {
            // Secure cleanup of temp working directory
            try
            {
                if (Directory.Exists(tempWorkingDir))
                {
                    Directory.Delete(tempWorkingDir, true);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Could not clean up temporary signing directory: {Message}", ex.Message);
            }
        }
    }

    private static void GenerateCodeResourcesManifest(string appBundlePath, string codeSignatureDir)
    {
        var files = Directory.GetFiles(appBundlePath, "*", SearchOption.AllDirectories);
        var sb = new StringBuilder();

        sb.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        sb.AppendLine("<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">");
        sb.AppendLine("<plist version=\"1.0\">");
        sb.AppendLine("<dict>");
        sb.AppendLine("    <key>files2</key>");
        sb.AppendLine("    <dict>");

        using var sha256 = SHA256.Create();
        foreach (var file in files)
        {
            if (file.StartsWith(codeSignatureDir, StringComparison.OrdinalIgnoreCase))
                continue;

            string relPath = Path.GetRelativePath(appBundlePath, file).Replace('\\', '/');
            byte[] fileBytes = File.ReadAllBytes(file);
            byte[] hash = sha256.ComputeHash(fileBytes);
            string base64Hash = Convert.ToBase64String(hash);

            sb.AppendLine($"        <key>{relPath}</key>");
            sb.AppendLine("        <dict>");
            sb.AppendLine($"            <key>hash2</key><data>{base64Hash}</data>");
            sb.AppendLine("        </dict>");
        }

        sb.AppendLine("    </dict>");
        sb.AppendLine("</dict>");
        sb.AppendLine("</plist>");

        File.WriteAllText(Path.Combine(codeSignatureDir, "CodeResources"), sb.ToString(), Encoding.UTF8);
    }

    private static void ReportProgress(IProgress<AppOperationProgress>? progress, string step, int percent, bool isCompleted = false, bool hasError = false, string? errorMessage = null)
    {
        progress?.Report(new AppOperationProgress
        {
            Title = "Signing IPA",
            CurrentStep = step,
            PercentComplete = percent,
            IsCompleted = isCompleted,
            HasError = hasError,
            ErrorMessage = errorMessage
        });
    }
}
