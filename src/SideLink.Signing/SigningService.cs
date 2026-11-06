using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Xml;
using System.Xml.Linq;
using Microsoft.Extensions.Logging;
using SideLink.Core.Interfaces;
using SideLink.Core.Models;
using SideLink.IPA;

namespace SideLink.Signing;

public class SigningService : ISigningService
{
    private readonly ILogger<SigningService> _logger;
    private readonly ICredentialStore _credentialStore;
    private readonly IAppleIdentityService _identityService;

    public SigningService(
        ICredentialStore credentialStore,
        IAppleIdentityService identityService,
        ILogger<SigningService> logger)
    {
        _credentialStore = credentialStore;
        _identityService = identityService;
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
            ReportProgress(progress, "فك ضغط حزمة التطبيق (Extracting IPA)...", 15);
            _logger.LogInformation("Extracting {Ipa} to working directory {TempDir}", sourceIpaPath, tempWorkingDir);

            await Task.Run(() =>
            {
                using var archive = ZipFile.OpenRead(sourceIpaPath);
                foreach (var entry in archive.Entries)
                {
                    cancellationToken.ThrowIfCancellationRequested();

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

            // 3. Provisioning profile resolution
            ReportProgress(progress, "تطبيق شهادة وملف تعريف التثبيت (Mobileprovision)...", 30);
            string embeddedProvisionTarget = Path.Combine(appBundlePath, "embedded.mobileprovision");
            string? effectiveProfile = config.MobileProvisionPath;
            string? effectiveP12 = config.P12Path;
            string p12Password = config.P12Password ?? "sidelink";

            if (config.Method == SigningMethodType.PersonalTeam)
            {
                string appleId = config.AppleId;
                if (string.IsNullOrWhiteSpace(appleId))
                {
                    appleId = await _credentialStore.GetLastAppleIdAsync() ?? string.Empty;
                }

                if (!string.IsNullOrWhiteSpace(appleId))
                {
                    var identity = await _identityService.GetIdentityForAccountAsync(appleId, targetDevice.DeviceId);
                    if (identity == null || !identity.IsReadyToSign)
                    {
                        identity = await _identityService.AutoConfigureIdentityForAccountAsync(appleId, targetDevice.DeviceId);
                    }

                    if (identity != null && identity.IsExpired)
                    {
                        throw new InvalidOperationException(
                            $"⚠️ ملف تعريف التثبيت (Mobileprovision) لحساب ({appleId}) انتهت صلاحيته بتاريخ ({identity.ExpirationDate:yyyy-MM-dd HH:mm}).\n" +
                            "صلاحية الحسابات المجانية 7 أيام فقط. يرجى تجديد الحساب أو استخدام شهادة P12 مخصصة صالحة لتجنب رفض نظام iOS (0xe8008015).");
                    }

                    if (identity != null && identity.IsReadyToSign)
                    {
                        effectiveProfile = identity.MobileProvisionPath;
                        effectiveP12 = identity.P12Path;
                        _logger.LogInformation("Resolved personal team identity: Profile={Profile}, P12={P12}", effectiveProfile, effectiveP12);
                    }
                    else
                    {
                        throw new InvalidOperationException(
                            $"لم يتم العثور على شهادة توقيع (P12) أو ملف تعريف صالح لحساب ({appleId}). يرجى التحقق من تسجيل الحساب أو استيراد ملف P12 و Mobileprovision.");
                    }
                }
            }

            string? profileAppId = null;
            string? profileTeamId = null;
            string? entitlementsXml = null;

            if (!string.IsNullOrWhiteSpace(effectiveProfile) && File.Exists(effectiveProfile))
            {
                File.Copy(effectiveProfile, embeddedProvisionTarget, true);
                _logger.LogInformation("Embedded mobileprovision profile to {Target}", embeddedProvisionTarget);

                ExtractProfileDetails(effectiveProfile, out profileAppId, out profileTeamId, out entitlementsXml);
            }

            // 4. Bundle ID Handling & Extension Stripping
            if (config.Method == SigningMethodType.PersonalTeam)
            {
                // Free personal profiles cannot sign App Extensions (PlugIns)
                string pluginsDir = Path.Combine(appBundlePath, "PlugIns");
                if (Directory.Exists(pluginsDir))
                {
                    _logger.LogInformation("Stripping PlugIns/ extensions for personal profile compatibility.");
                    try { Directory.Delete(pluginsDir, true); } catch { }
                }

                // If profile is restricted to a specific App ID (e.g. net.whatsapp.WhatsApp.NHDYBV5658)
                // we must align CFBundleIdentifier to match the profile so iOS installd doesn't reject with ApplicationVerificationFailed.
                string? targetId = config.CustomBundleId;
                if (!string.IsNullOrWhiteSpace(profileAppId) && !profileAppId.Contains('*'))
                {
                    targetId = profileAppId;
                    _logger.LogInformation("Aligning CFBundleIdentifier to profile App ID: {Id}", targetId);
                }

                if (!string.IsNullOrWhiteSpace(targetId) || config.ModifyBundleId)
                {
                    ReportProgress(progress, "تعديل معرّف الحزمة ليتطابق مع ملف التعريف والشهادة...", 45);
                    BundleIdentifierModifier.ModifyBundleIdentifier(appBundlePath, targetId);
                }
            }
            else if (config.ModifyBundleId || !string.IsNullOrWhiteSpace(config.CustomBundleId))
            {
                ReportProgress(progress, "تعديل معرّف الحزمة (Bundle ID)...", 45);
                BundleIdentifierModifier.ModifyBundleIdentifier(appBundlePath, config.CustomBundleId);
            }

            // 5. Code Signature generation
            ReportProgress(progress, "توقيع التطبيق والملفات التنفيذية رقمياً (Code Signing)...", 65);
            string rcodesignPath = FindRcodesignExecutable();

            bool codesignSuccess = false;
            if (!string.IsNullOrWhiteSpace(rcodesignPath) && !string.IsNullOrWhiteSpace(effectiveP12) && File.Exists(effectiveP12))
            {
                codesignSuccess = await Task.Run(() => SignWithRcodesign(rcodesignPath, appBundlePath, effectiveP12, p12Password, entitlementsXml, tempWorkingDir));
            }

            if (!codesignSuccess)
            {
                if (string.IsNullOrWhiteSpace(effectiveP12) || !File.Exists(effectiveP12))
                {
                    throw new InvalidOperationException($"لم يتم العثور على شهادة التوقيع والمفتاح الخاص (P12) لحساب ({config.AppleId}). يرجى التحقق من تسجيل الحساب أو استيراد ملف P12.");
                }
                throw new InvalidOperationException("فشلت عملية التوقيع الرقمي عبر rcodesign. يرجى التحقق من صحة الشهادة والملفات.");
            }

            // 6. Repackaging into IPA archive
            ReportProgress(progress, "إعادة تجميع حزمة التطبيق الموقعة (Packaging IPA)...", 90);
            _logger.LogInformation("Packaging signed IPA to {Output}", outputIpaPath);

            await Task.Run(() =>
            {
                if (File.Exists(outputIpaPath))
                    File.Delete(outputIpaPath);

                using var zip = ZipFile.Open(outputIpaPath, ZipArchiveMode.Create);
                foreach (var file in Directory.GetFiles(payloadDir, "*", SearchOption.AllDirectories))
                {
                    string relPath = Path.GetRelativePath(tempWorkingDir, file).Replace('\\', '/');
                    zip.CreateEntryFromFile(file, relPath, CompressionLevel.Optimal);
                }
            }, cancellationToken);

            ReportProgress(progress, "تم توقيع التطبيق وتجهيزه للتثبيت بنجاح!", 100, isCompleted: true);
            return outputIpaPath;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Signing failed for IPA {Ipa}", sourceIpaPath);
            ReportProgress(progress, "فشل التوقيع: " + ex.Message, 0, hasError: true, errorMessage: ex.Message);
            throw;
        }
        finally
        {
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

    private bool SignWithRcodesign(string rcodesignPath, string appBundlePath, string p12Path, string p12Password, string? entitlementsXml, string tempWorkingDir)
    {
        try
        {
            string entArg = string.Empty;

            if (!string.IsNullOrWhiteSpace(entitlementsXml))
            {
                string entFilePath = Path.Combine(tempWorkingDir, "entitlements.plist");
                string fullEntXml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
                                    "<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n" +
                                    "<plist version=\"1.0\">\n" +
                                    entitlementsXml + "\n" +
                                    "</plist>";
                File.WriteAllText(entFilePath, fullEntXml, Encoding.UTF8);
                // Use relative path so rcodesign on Windows doesn't treat 'C:' drive letter as a subpath specifier
                entArg = "-e entitlements.plist";
            }

            string relAppDir = Path.GetRelativePath(tempWorkingDir, appBundlePath);

            var psi = new ProcessStartInfo
            {
                FileName = rcodesignPath,
                Arguments = $"sign --timestamp-url none --p12-file \"{p12Path}\" --p12-password \"{p12Password}\" {entArg} \"{relAppDir}\"",
                WorkingDirectory = tempWorkingDir,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            };

            using var proc = new Process { StartInfo = psi };
            var stdoutSb = new StringBuilder();
            var stderrSb = new StringBuilder();

            proc.OutputDataReceived += (_, e) => { if (e.Data != null) stdoutSb.AppendLine(e.Data); };
            proc.ErrorDataReceived += (_, e) => { if (e.Data != null) stderrSb.AppendLine(e.Data); };

            proc.Start();
            proc.BeginOutputReadLine();
            proc.BeginErrorReadLine();

            bool finished = proc.WaitForExit(90000);
            if (!finished)
            {
                try { proc.Kill(); } catch { }
                _logger.LogWarning("rcodesign timed out after 90 seconds.");
                return false;
            }

            if (proc.ExitCode == 0)
            {
                _logger.LogInformation("rcodesign signed bundle successfully.");
                return true;
            }

            _logger.LogWarning("rcodesign failed (exit code {Code}): {Err}", proc.ExitCode, stderrSb.ToString());
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing rcodesign: {Message}", ex.Message);
            return false;
        }
    }

    private static string? FindRcodesignExecutable()
    {
        string[] candidates = new[]
        {
            Path.Combine(AppContext.BaseDirectory, "tools", "rcodesign.exe"),
            Path.Combine(AppContext.BaseDirectory, "rcodesign.exe"),
            @"C:\Users\HD\Desktop\Bitloader\tools\rcodesign.exe",
            @"C:\Users\HD\Desktop\SideLink-v1.0.0-win-x64\tools\rcodesign.exe",
            @"C:\Users\HD\Desktop\Bitloader\tools\apple-codesign\apple-codesign-0.29.0-x86_64-pc-windows-msvc\rcodesign.exe"
        };

        foreach (var path in candidates)
        {
            if (File.Exists(path))
                return path;
        }

        return null;
    }

    private static void ExtractProfileDetails(string profilePath, out string? allowedBundleId, out string? teamId, out string? entitlementsXml)
    {
        allowedBundleId = null;
        teamId = null;
        entitlementsXml = null;

        try
        {
            byte[] bytes = File.ReadAllBytes(profilePath);
            string content = Encoding.ASCII.GetString(bytes);

            int xmlStart = content.IndexOf("<?xml", StringComparison.Ordinal);
            int xmlEnd = content.IndexOf("</plist>", StringComparison.Ordinal);
            if (xmlStart == -1 || xmlEnd == -1) return;

            xmlEnd += 8;
            string xml = content.Substring(xmlStart, xmlEnd - xmlStart);

            var doc = XDocument.Parse(xml);
            var rootDict = doc.Root?.Element("dict");
            if (rootDict == null) return;

            var entKey = rootDict.Elements("key").FirstOrDefault(k => k.Value == "Entitlements");
            var entDict = entKey?.ElementsAfterSelf().FirstOrDefault();
            if (entDict != null)
            {
                entitlementsXml = entDict.ToString();

                var appIdKey = entDict.Elements("key").FirstOrDefault(k => k.Value == "application-identifier");
                var appIdVal = appIdKey?.ElementsAfterSelf().FirstOrDefault()?.Value;
                if (!string.IsNullOrWhiteSpace(appIdVal))
                {
                    int dotIdx = appIdVal.IndexOf('.');
                    if (dotIdx > 0)
                    {
                        teamId = appIdVal.Substring(0, dotIdx);
                        allowedBundleId = appIdVal.Substring(dotIdx + 1);
                    }
                    else
                    {
                        allowedBundleId = appIdVal;
                    }
                }
            }
        }
        catch { }
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
