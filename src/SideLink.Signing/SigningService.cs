using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
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

            // 3. Bundle ID & Provisioning profile resolution
            ReportProgress(progress, "تطبيق شهادة وملف تعريف التثبيت (Mobileprovision)...", 30);
            string embeddedProvisionTarget = Path.Combine(appBundlePath, "embedded.mobileprovision");
            string? effectiveProfile = config.MobileProvisionPath;
            string? effectiveP12 = config.P12Path;
            string p12Password = config.P12Password ?? "sidelink";

            string originalBundleId = string.Empty;
            string infoPlistPath = Path.Combine(appBundlePath, "Info.plist");
            if (File.Exists(infoPlistPath))
            {
                try
                {
                    string plistXml = BundleIdentifierModifier.ReadPlistAsXmlString(File.ReadAllBytes(infoPlistPath));
                    var doc = XDocument.Parse(plistXml);
                    var idKey = doc.Root?.Element("dict")?.Elements("key").FirstOrDefault(k => k.Value == "CFBundleIdentifier");
                    originalBundleId = idKey?.ElementsAfterSelf().FirstOrDefault()?.Value ?? string.Empty;
                }
                catch { }
            }

            string requestedBundleId = !string.IsNullOrWhiteSpace(config.CustomBundleId) 
                ? config.CustomBundleId.Trim() 
                : (config.ModifyBundleId ? $"{originalBundleId}.sidelink" : originalBundleId);

            string? profileAppId = null;
            string? profileTeamId = null;
            string? entitlementsXml = null;

            if (config.Method == SigningMethodType.PersonalTeam)
            {
                string appleId = config.AppleId;
                if (string.IsNullOrWhiteSpace(appleId))
                {
                    appleId = await _credentialStore.GetLastAppleIdAsync() ?? string.Empty;
                }

                if (!string.IsNullOrWhiteSpace(appleId))
                {
                    var identity = await _identityService.GetIdentityForAccountAsync(appleId, targetDevice.DeviceId, requestedBundleId);
                    if (identity == null || !identity.IsReadyToSign || identity.IsExpired)
                    {
                        identity = await _identityService.AutoConfigureIdentityForAccountAsync(appleId, targetDevice.DeviceId, requestedBundleId);
                    }

                    if (identity != null && identity.IsExpired)
                    {
                        throw new InvalidOperationException(
                            $"⚠️ ملف تعريف التثبيت (Mobileprovision) لحساب ({appleId}) انتهت صلاحيته بتاريخ ({identity.ExpirationDate:yyyy-MM-dd HH:mm}).\n" +
                            "يرجى الانتقال إلى صفحة 'التوقيع والحسابات' والضغط على زر تسجيل الدخول لتجديد الشهادة مجاناً من خوادم Apple لمدة 7 أيام جديدة.");
                    }

                    if (identity != null && identity.IsReadyToSign)
                    {
                        effectiveProfile = identity.MobileProvisionPath;
                        effectiveP12 = identity.P12Path;
                        profileTeamId = identity.TeamId;
                        _logger.LogInformation("Resolved personal team identity: Profile={Profile}, P12={P12}", effectiveProfile, effectiveP12);
                    }
                    else
                    {
                        throw new InvalidOperationException(
                            $"لم يتم العثور على شهادة توقيع (P12) أو ملف تعريف صالح لحساب ({appleId}). يرجى التحقق من تسجيل الحساب أو استيراد ملف P12 و Mobileprovision.");
                    }
                }
            }

            if (!string.IsNullOrWhiteSpace(effectiveProfile) && File.Exists(effectiveProfile))
            {
                File.Copy(effectiveProfile, embeddedProvisionTarget, true);
                _logger.LogInformation("Embedded mobileprovision profile to {Target}", embeddedProvisionTarget);

                ExtractProfileDetails(effectiveProfile, out profileAppId, out var extractedTeamId, out entitlementsXml);
                if (string.IsNullOrWhiteSpace(profileTeamId))
                {
                    profileTeamId = extractedTeamId;
                }
            }

            // 4. Bundle ID Handling & Extension Stripping
            // Determine effective bundle ID: If profile is bound to a specific App ID (not wildcard),
            // CFBundleIdentifier MUST match that specific App ID so iOS installd accepts the signature.
            string effectiveBundleId = requestedBundleId;
            if (!string.IsNullOrWhiteSpace(profileAppId) && !profileAppId.Contains('*'))
            {
                effectiveBundleId = profileAppId;
                _logger.LogInformation("Aligning CFBundleIdentifier to profile App ID: {Id}", effectiveBundleId);
            }

            if (config.Method == SigningMethodType.PersonalTeam)
            {
                // Free personal profiles cannot sign App Extensions (PlugIns)
                string pluginsDir = Path.Combine(appBundlePath, "PlugIns");
                if (Directory.Exists(pluginsDir))
                {
                    _logger.LogInformation("Stripping PlugIns/ extensions for personal profile compatibility.");
                    try { Directory.Delete(pluginsDir, true); } catch { }
                }

                ReportProgress(progress, "تعديل معرّف الحزمة ليتطابق مع ملف التعريف والشهادة...", 45);
                BundleIdentifierModifier.ModifyBundleIdentifier(appBundlePath, effectiveBundleId);
            }
            else if (config.ModifyBundleId || !string.IsNullOrWhiteSpace(config.CustomBundleId))
            {
                ReportProgress(progress, "تعديل معرّف الحزمة (Bundle ID)...", 45);
                BundleIdentifierModifier.ModifyBundleIdentifier(appBundlePath, effectiveBundleId);
            }

            if (!string.IsNullOrWhiteSpace(config.CustomDisplayName))
            {
                ReportProgress(progress, "تعديل اسم التطبيق المعروض...", 48);
                BundleIdentifierModifier.ModifyAppDisplayName(appBundlePath, config.CustomDisplayName);
            }

            // Sanitize all nested bundles (inject missing CFBundleIdentifier in resource bundles/frameworks, clear old signatures)
            ReportProgress(progress, "تهيئة وتجهيز حزم الموارد والملفات الملحقة للتوقيع...", 55);
            BundleIdentifierModifier.SanitizeNestedBundles(appBundlePath, effectiveBundleId);

            // 5. Code Signature generation
            ReportProgress(progress, "توقيع التطبيق والملفات التنفيذية رقمياً (Code Signing)...", 65);
            string rcodesignPath = FindRcodesignExecutable();

            bool codesignSuccess = false;
            string codesignError = string.Empty;
            if (!string.IsNullOrWhiteSpace(rcodesignPath) && !string.IsNullOrWhiteSpace(effectiveP12) && File.Exists(effectiveP12))
            {
                var signRes = await Task.Run(() => SignWithRcodesign(rcodesignPath, appBundlePath, effectiveP12, p12Password, entitlementsXml, tempWorkingDir, profileTeamId, effectiveBundleId));
                codesignSuccess = signRes.Success;
                codesignError = signRes.Error;
            }

            if (!codesignSuccess)
            {
                if (string.IsNullOrWhiteSpace(effectiveP12) || !File.Exists(effectiveP12))
                {
                    throw new InvalidOperationException($"لم يتم العثور على شهادة التوقيع والمفتاح الخاص (P12) لحساب ({config.AppleId}). يرجى التحقق من تسجيل الحساب أو استيراد ملف P12.");
                }
                string errSuffix = !string.IsNullOrWhiteSpace(codesignError) ? $": {codesignError}" : ". يرجى التحقق من صحة الشهادة والملفات.";
                throw new InvalidOperationException($"فشلت عملية التوقيع الرقمي عبر rcodesign{errSuffix}");
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

    private (bool Success, string Error) SignWithRcodesign(string rcodesignPath, string appBundlePath, string p12Path, string p12Password, string? entitlementsXml, string tempWorkingDir, string? teamId = null, string? effectiveBundleId = null)
    {
        try
        {
            string entArg = string.Empty;

            if (!string.IsNullOrWhiteSpace(entitlementsXml))
            {
                string processedEntXml = entitlementsXml;
                if (!string.IsNullOrWhiteSpace(effectiveBundleId))
                {
                    try
                    {
                        var doc = XDocument.Parse("<plist version=\"1.0\">" + entitlementsXml + "</plist>");
                        var dict = doc.Root?.Element("dict");
                        if (dict != null)
                        {
                            var elements = dict.Elements().ToList();
                            for (int i = 0; i < elements.Count - 1; i += 2)
                            {
                                if (elements[i].Name.LocalName == "key" && elements[i].Value == "application-identifier")
                                {
                                    string prefix = !string.IsNullOrWhiteSpace(teamId) ? $"{teamId}." : "";
                                    elements[i + 1].Value = $"{prefix}{effectiveBundleId}";
                                }
                            }
                            processedEntXml = dict.ToString();
                        }
                    }
                    catch { }
                }

                string entFilePath = Path.Combine(tempWorkingDir, "entitlements.plist");
                string fullEntXml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
                                    "<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n" +
                                    "<plist version=\"1.0\">\n" +
                                    processedEntXml + "\n" +
                                    "</plist>";
                File.WriteAllText(entFilePath, fullEntXml, Encoding.UTF8);
                // Use relative path so rcodesign on Windows doesn't treat 'C:' drive letter as a subpath specifier
                entArg = "-e entitlements.plist";
            }

            string relAppDir = Path.GetRelativePath(tempWorkingDir, appBundlePath);

            // rcodesign compatibility: Prefer PEM encoded certificate + private key to avoid OpenSSL 3 PKCS#12 encryption incompatibility
            string credArg = $"--p12-file \"{p12Path}\" --p12-password \"{p12Password}\"";
            string tempPemPath = Path.Combine(tempWorkingDir, "signing_identity.pem");
            string dir = Path.GetDirectoryName(p12Path) ?? "";
            string companionPem = Path.Combine(dir, "identity.pem");

            if (File.Exists(companionPem))
            {
                File.Copy(companionPem, tempPemPath, true);
                credArg = "--pem-file signing_identity.pem";
            }
            else
            {
                bool pemReady = false;
                string keyP8 = Path.Combine(dir, "key.p8");
                string mobProv = Path.Combine(dir, "embedded.mobileprovision");
                if (File.Exists(keyP8))
                {
                    try
                    {
                        byte[] keyBytes = File.ReadAllBytes(keyP8);
                        using var rsa = RSA.Create();
                        try { rsa.ImportPkcs8PrivateKey(keyBytes, out _); }
                        catch { rsa.ImportRSAPrivateKey(keyBytes, out _); }

                        string? certPem = null;
                        if (File.Exists(mobProv))
                        {
                            byte[] mpBytes = File.ReadAllBytes(mobProv);
                            string mpContent = Encoding.ASCII.GetString(mpBytes);
                            int xmlStart = mpContent.IndexOf("<?xml", StringComparison.Ordinal);
                            int xmlEnd = mpContent.IndexOf("</plist>", StringComparison.Ordinal);
                            if (xmlStart >= 0 && xmlEnd >= 0)
                            {
                                string xml = mpContent.Substring(xmlStart, xmlEnd + 8 - xmlStart);
                                var doc = new XmlDocument();
                                doc.LoadXml(xml);
                                var devCertNode = doc.SelectSingleNode("//key[text()='DeveloperCertificates']/following-sibling::array[1]/data[1]");
                                if (devCertNode != null)
                                {
                                    byte[] rawCert = Convert.FromBase64String(devCertNode.InnerText.Trim());
                                    using var c = new X509Certificate2(rawCert);
                                    certPem = c.ExportCertificatePem();
                                }
                            }
                        }

                        if (string.IsNullOrEmpty(certPem))
                        {
                            using var c = new X509Certificate2(p12Path, p12Password, X509KeyStorageFlags.EphemeralKeySet);
                            certPem = c.ExportCertificatePem();
                        }

                        if (!string.IsNullOrEmpty(certPem))
                        {
                            string keyPem = rsa.ExportPkcs8PrivateKeyPem();
                            string fullPem = certPem + Environment.NewLine + keyPem;
                            File.WriteAllText(tempPemPath, fullPem);
                            try { File.WriteAllText(companionPem, fullPem); } catch { }
                            credArg = "--pem-file signing_identity.pem";
                            pemReady = true;
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning("Failed to extract PEM from key.p8: {Msg}", ex.Message);
                    }
                }

                if (!pemReady)
                {
                    try
                    {
                        using var cert = new X509Certificate2(p12Path, p12Password, X509KeyStorageFlags.Exportable | X509KeyStorageFlags.EphemeralKeySet);
                        using var rsa = cert.GetRSAPrivateKey();
                        if (rsa != null)
                        {
                            string certPem = cert.ExportCertificatePem();
                            string keyPem = rsa.ExportPkcs8PrivateKeyPem();
                            string fullPem = certPem + Environment.NewLine + keyPem;
                            File.WriteAllText(tempPemPath, fullPem);
                            try { File.WriteAllText(companionPem, fullPem); } catch { }
                            credArg = "--pem-file signing_identity.pem";
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning("Could not export PEM from P12: {Msg}, falling back to --p12-file", ex.Message);
                    }
                }
            }

            var psi = new ProcessStartInfo
            {
                FileName = rcodesignPath,
                Arguments = $"sign --timestamp-url none {credArg} {entArg} \"{relAppDir}\"",
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
                return (false, "انتهت مهلة التوقيع (rcodesign timed out after 90 seconds)");
            }

            proc.WaitForExit();

            if (proc.ExitCode == 0)
            {
                _logger.LogInformation("rcodesign signed bundle successfully.");
                return (true, string.Empty);
            }

            string err = stderrSb.ToString().Trim();
            if (string.IsNullOrWhiteSpace(err)) err = stdoutSb.ToString().Trim();
            _logger.LogWarning("rcodesign failed (exit code {Code}): {Err}", proc.ExitCode, err);
            return (false, err);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing rcodesign: {Message}", ex.Message);
            return (false, ex.Message);
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
