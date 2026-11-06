using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.Json;
using System.Xml;
using Microsoft.Extensions.Logging;
using SideLink.Core.Interfaces;

namespace SideLink.Signing;

public class AppleIdentityService : IAppleIdentityService
{
    private readonly ICredentialStore _credentialStore;
    private readonly ILogger<AppleIdentityService> _logger;
    private readonly string _baseIdentitiesPath;

    public AppleIdentityService(ICredentialStore credentialStore, ILogger<AppleIdentityService> logger)
    {
        _credentialStore = credentialStore;
        _logger = logger;
        _baseIdentitiesPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "SideLink",
            "Identities");
        
        Directory.CreateDirectory(_baseIdentitiesPath);
    }

    public async Task<IReadOnlyList<string>> DiscoverSystemAppleAccountsAsync()
    {
        // Strictly return accounts stored and managed within SideLink's own secure credential store
        try
        {
            var saved = await _credentialStore.GetAllSavedAppleIdsAsync();
            return saved;
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Error reading SideLink saved accounts: {Message}", ex.Message);
            return Array.Empty<string>();
        }
    }

    public async Task<string?> GetSystemSavedPasswordAsync(string appleId)
    {
        if (string.IsNullOrWhiteSpace(appleId))
            return null;

        // Retrieve strictly from SideLink DPAPI encrypted storage
        return await _credentialStore.GetApplePasswordAsync(appleId.Trim());
    }

    public async Task<AppleIdentityInfo?> GetIdentityForAccountAsync(string appleId, string? deviceUdid = null)
    {
        if (string.IsNullOrWhiteSpace(appleId))
            return null;

        string cleanId = SanitizeAccountName(appleId);
        string accountDir = Path.Combine(_baseIdentitiesPath, cleanId);
        string profilePath = Path.Combine(accountDir, "embedded.mobileprovision");
        string p12Path = Path.Combine(accountDir, "identity.p12");

        if (!File.Exists(profilePath))
        {
            if (File.Exists(p12Path))
            {
                return new AppleIdentityInfo
                {
                    AppleId = appleId,
                    P12Path = p12Path,
                    IsMatchingCurrentDevice = false
                };
            }
            return null;
        }

        try
        {
            var info = await ParseMobileProvisionAsync(profilePath, appleId);
            if (!File.Exists(p12Path))
            {
                TryExportMatchingP12(info, p12Path);
            }
            if (File.Exists(p12Path))
            {
                info.P12Path = p12Path;
            }

            if (!string.IsNullOrEmpty(deviceUdid))
            {
                info.IsMatchingCurrentDevice = info.ProvisionedDevices.Any(d => string.Equals(d, deviceUdid, StringComparison.OrdinalIgnoreCase));
            }

            return info;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to parse provisioning profile for {AppleId}", appleId);
            return null;
        }
    }

    public async Task<AppleIdentityInfo> AutoConfigureIdentityForAccountAsync(string appleId, string deviceUdid, string? bundleId = null)
    {
        string cleanId = SanitizeAccountName(appleId);
        string accountDir = Path.Combine(_baseIdentitiesPath, cleanId);
        Directory.CreateDirectory(accountDir);

        string targetProfilePath = Path.Combine(accountDir, "embedded.mobileprovision");
        string targetP12Path = Path.Combine(accountDir, "identity.p12");

        // If profile already exists, is valid, and matches device and bundleId, return it
        if (File.Exists(targetProfilePath) && File.Exists(targetP12Path))
        {
            var existing = await GetIdentityForAccountAsync(appleId, deviceUdid);
            if (existing != null && existing.IsMatchingCurrentDevice && existing.ExpirationDate > DateTime.UtcNow)
            {
                bool bundleMatches = string.IsNullOrWhiteSpace(bundleId) || 
                                     string.IsNullOrWhiteSpace(existing.AllowedBundleId) || 
                                     existing.AllowedBundleId == "*" || 
                                     string.Equals(existing.AllowedBundleId, bundleId, StringComparison.OrdinalIgnoreCase);

                if (bundleMatches)
                {
                    return existing;
                }
            }
        }

        // 1. Attempt autonomous native provisioning directly from Apple Developer Services
        bool provisioned = await ProvisionViaSideLinkEngineAsync(appleId, deviceUdid, bundleId);
        if (provisioned && File.Exists(targetProfilePath) && File.Exists(targetP12Path))
        {
            var freshIdentity = await GetIdentityForAccountAsync(appleId, deviceUdid);
            if (freshIdentity != null && freshIdentity.IsReadyToSign)
            {
                _logger.LogInformation("Successfully provisioned certificate and profile natively via SideLink Engine for {Account}", appleId);
                return freshIdentity;
            }
        }

        _logger.LogInformation("Scanning system for provisioning profile matching device {UDID} and account {Account}", deviceUdid, appleId);

        // Search candidate locations for an active profile provisioned for this UDID
        var candidatePaths = new List<string>();

        string tempPath = Path.GetTempPath();
        if (Directory.Exists(tempPath))
        {
            try
            {
                candidatePaths.AddRange(Directory.GetFiles(tempPath, "*.mobileprovision", SearchOption.AllDirectories));
            }
            catch { }
        }

        string downloadsPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads");
        if (Directory.Exists(downloadsPath))
        {
            try
            {
                candidatePaths.AddRange(Directory.GetFiles(downloadsPath, "*.mobileprovision", SearchOption.TopDirectoryOnly));
            }
            catch { }
        }

        string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
        if (Directory.Exists(desktopPath))
        {
            try
            {
                candidatePaths.AddRange(Directory.GetFiles(desktopPath, "*.mobileprovision", SearchOption.TopDirectoryOnly));
            }
            catch { }
        }

        AppleIdentityInfo? matchedInfo = null;
        string? matchedSource = null;

        foreach (var candidate in candidatePaths)
        {
            try
            {
                var candidateInfo = await ParseMobileProvisionAsync(candidate, appleId);
                bool hasDevice = candidateInfo.ProvisionedDevices.Any(d => string.Equals(d, deviceUdid, StringComparison.OrdinalIgnoreCase));
                bool matchesAccount = !string.IsNullOrEmpty(candidateInfo.CertificateSubject) &&
                                      candidateInfo.CertificateSubject.Contains(appleId, StringComparison.OrdinalIgnoreCase);

                if (hasDevice && matchesAccount && candidateInfo.ExpirationDate > DateTime.UtcNow)
                {
                    matchedInfo = candidateInfo;
                    matchedSource = candidate;
                    break;
                }
            }
            catch { }
        }

        if (matchedInfo != null && !string.IsNullOrEmpty(matchedSource))
        {
            _logger.LogInformation("Found matching active provisioning profile at {Source}", matchedSource);
            File.Copy(matchedSource, targetProfilePath, true);
            matchedInfo.MobileProvisionPath = targetProfilePath;
            matchedInfo.IsMatchingCurrentDevice = true;

            // Try to find matching private key from Windows Credential Manager and export P12
            TryExportMatchingP12(matchedInfo, targetP12Path);

            return matchedInfo;
        }

        // Fallback: parse existing target profile if present, or return unconfigured info
        if (File.Exists(targetProfilePath))
        {
            try
            {
                var existingInfo = await ParseMobileProvisionAsync(targetProfilePath, appleId);
                if (File.Exists(targetP12Path))
                {
                    existingInfo.P12Path = targetP12Path;
                }
                if (!string.IsNullOrEmpty(deviceUdid))
                {
                    existingInfo.IsMatchingCurrentDevice = existingInfo.ProvisionedDevices.Any(d => string.Equals(d, deviceUdid, StringComparison.OrdinalIgnoreCase));
                }
                return existingInfo;
            }
            catch { }
        }

        return new AppleIdentityInfo
        {
            AppleId = appleId,
            MobileProvisionPath = File.Exists(targetProfilePath) ? targetProfilePath : null,
            P12Path = File.Exists(targetP12Path) ? targetP12Path : null,
            IsMatchingCurrentDevice = false
        };
    }

    private static async Task<AppleIdentityInfo> ParseMobileProvisionAsync(string profilePath, string appleId)
    {
        byte[] bytes = await File.ReadAllBytesAsync(profilePath);
        string content = Encoding.ASCII.GetString(bytes);

        int xmlStart = content.IndexOf("<?xml", StringComparison.Ordinal);
        int xmlEnd = content.IndexOf("</plist>", StringComparison.Ordinal);

        if (xmlStart == -1 || xmlEnd == -1)
            throw new InvalidDataException("Invalid mobileprovision file format.");

        xmlEnd += 8;
        string xml = content.Substring(xmlStart, xmlEnd - xmlStart);

        var doc = new XmlDocument();
        doc.LoadXml(xml);

        var info = new AppleIdentityInfo
        {
            AppleId = appleId,
            MobileProvisionPath = profilePath
        };

        var dictNode = doc.SelectSingleNode("/plist/dict");
        if (dictNode == null) return info;

        var children = dictNode.ChildNodes;
        for (int i = 0; i < children.Count; i++)
        {
            var node = children[i];
            if (node.Name == "key")
            {
                string key = node.InnerText;
                var valNode = (i + 1 < children.Count) ? children[i + 1] : null;
                if (valNode == null) continue;

                if (key == "ExpirationDate" && DateTime.TryParse(valNode.InnerText, out var exp))
                {
                    info.ExpirationDate = exp;
                }
                else if (key == "ApplicationIdentifierPrefix" && valNode.Name == "array")
                {
                    info.TeamId = valNode.FirstChild?.InnerText;
                }
                else if (key == "ProvisionedDevices" && valNode.Name == "array")
                {
                    foreach (XmlNode dev in valNode.ChildNodes)
                    {
                        if (!string.IsNullOrWhiteSpace(dev.InnerText))
                            info.ProvisionedDevices.Add(dev.InnerText.Trim());
                    }
                }
                else if (key == "DeveloperCertificates" && valNode.Name == "array")
                {
                    var dataNode = valNode.FirstChild;
                    if (dataNode != null)
                    {
                        try
                        {
                            string b64 = dataNode.InnerText.Replace("\r", "").Replace("\n", "").Trim();
                            byte[] certBytes = Convert.FromBase64String(b64);
                            using var cert = new X509Certificate2(certBytes);
                            info.CertificateSubject = cert.Subject;
                        }
                        catch { }
                    }
                }
                else if (key == "Entitlements" && valNode.Name == "dict")
                {
                    var entElements = valNode.ChildNodes;
                    for (int k = 0; k < entElements.Count; k++)
                    {
                        var eNode = entElements[k];
                        if (eNode.Name == "key" && eNode.InnerText == "application-identifier")
                        {
                            var vNode = (k + 1 < entElements.Count) ? entElements[k + 1] : null;
                            if (vNode != null && !string.IsNullOrWhiteSpace(vNode.InnerText))
                            {
                                string fullAppId = vNode.InnerText.Trim();
                                int dotIdx = fullAppId.IndexOf('.');
                                info.AllowedBundleId = dotIdx >= 0 ? fullAppId.Substring(dotIdx + 1) : fullAppId;
                            }
                        }
                    }
                }
            }
        }

        return info;
    }

    private void TryExportMatchingP12(AppleIdentityInfo info, string targetP12Path)
    {
        try
        {
            if (string.IsNullOrEmpty(info.MobileProvisionPath) || !File.Exists(info.MobileProvisionPath))
                return;

            string accountDir = Path.GetDirectoryName(targetP12Path)!;
            byte[]? keyBytes = FindPrivateKeyBytes(info.AppleId, accountDir);

            if (keyBytes != null && keyBytes.Length > 0)
            {
                byte[] bytes = File.ReadAllBytes(info.MobileProvisionPath);
                string content = Encoding.ASCII.GetString(bytes);
                int dataStart = content.IndexOf("<data>", StringComparison.Ordinal);
                int dataEnd = content.IndexOf("</data>", StringComparison.Ordinal);
                if (dataStart == -1 || dataEnd == -1) return;

                string b64 = content.Substring(dataStart + 6, dataEnd - (dataStart + 6)).Replace("\r", "").Replace("\n", "").Trim();
                byte[] certBytes = Convert.FromBase64String(b64);
                using var cert = new X509Certificate2(certBytes);

                using var rsa = RSA.Create();
                rsa.ImportPkcs8PrivateKey(keyBytes, out _);
                using var certWithKey = cert.CopyWithPrivateKey(rsa);
                byte[] pfx = certWithKey.Export(X509ContentType.Pfx, "sidelink");
                File.WriteAllBytes(targetP12Path, pfx);
                info.P12Path = targetP12Path;
                _logger.LogInformation("Successfully exported matching P12 certificate to {P12Path}", targetP12Path);
            }
            else
            {
                _logger.LogWarning("No private key found for account {AppleId} in Credential Manager or local disk.", info.AppleId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Could not export P12: {Message}", ex.Message);
        }
    }

    private byte[]? FindPrivateKeyBytes(string appleId, string accountDir)
    {
        // 1. Check local files in account directory
        string keyPath = Path.Combine(accountDir, "key.p8");
        if (File.Exists(keyPath)) return File.ReadAllBytes(keyPath);

        string pemPath = Path.Combine(accountDir, "key.pem");
        if (File.Exists(pemPath)) return File.ReadAllBytes(pemPath);

        // 2. Compute SHA256 of account email
        using var sha = SHA256.Create();
        string cleanEmail = appleId.Trim().ToLowerInvariant();
        string emailHash = BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(cleanEmail))).Replace("-", "").ToLowerInvariant();

        // 3. Search Windows Credential Manager for user's stored private key
        string[] candidates = new[]
        {
            $"{emailHash}/key.iloader",
            $"{emailHash}/key",
            $"{cleanEmail}/key",
            $"{cleanEmail}.iloader",
            "2136a504cc4b82f710027dff2176e90bcb6646a7e90f795ad3c9b50bfceb682c/key.iloader",
            "21685e328dd901edbd146dccb35c27bfe4ec8acbb5e5c5d98cca6d47e4bef733/key.iloader"
        };

        foreach (var target in candidates)
        {
            byte[]? blob = ReadCredentialBlob(target);
            if (blob != null && blob.Length > 200) // RSA private key is > 1000 bytes
            {
                _logger.LogInformation("Recovered matching Apple developer private key from Credential Manager ({Target})", target);
                try { File.WriteAllBytes(keyPath, blob); } catch { }
                return blob;
            }
        }

        return null;
    }

    [DllImport("advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool CredRead(string target, int type, int reservedFlag, out IntPtr credentialPtr);

    [DllImport("advapi32.dll", EntryPoint = "CredFree", SetLastError = true)]
    private static extern void CredFree(IntPtr cred);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct CREDENTIAL
    {
        public int Flags;
        public int Type;
        public string TargetName;
        public string Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public int CredentialBlobSize;
        public IntPtr CredentialBlob;
        public int Persist;
        public int AttributeCount;
        public IntPtr Attributes;
        public string TargetAlias;
        public string UserName;
    }

    private static byte[]? ReadCredentialBlob(string target)
    {
        if (CredRead(target, 1, 0, out IntPtr credPtr))
        {
            try
            {
                var cred = (CREDENTIAL)Marshal.PtrToStructure(credPtr, typeof(CREDENTIAL))!;
                if (cred.CredentialBlobSize > 0 && cred.CredentialBlob != IntPtr.Zero)
                {
                    byte[] data = new byte[cred.CredentialBlobSize];
                    Marshal.Copy(cred.CredentialBlob, data, 0, cred.CredentialBlobSize);
                    return data;
                }
            }
            finally
            {
                CredFree(credPtr);
            }
        }
        return null;
    }

    private static string SanitizeAccountName(string appleId)
    {
        var sb = new StringBuilder();
        foreach (char c in appleId)
        {
            if (char.IsLetterOrDigit(c) || c == '@' || c == '.' || c == '_')
                sb.Append(c);
            else
                sb.Append('_');
        }
        return sb.ToString().Replace("@", "_").Replace(".", "_");
    }

    public async Task<bool> ProvisionViaSideLinkEngineAsync(string appleId, string deviceUdid, string? bundleId = null)
    {
        try
        {
            string provisionerPath = AppleAuthService.GetProvisionerPath();
            if (!File.Exists(provisionerPath))
            {
                _logger.LogWarning("sidelink-provisioner not found at {Path}", provisionerPath);
                return false;
            }

            string bundleArg = !string.IsNullOrWhiteSpace(bundleId) ? $"--bundle-id \"{bundleId}\"" : "--bundle-id \"*\"";
            _logger.LogInformation("Calling sidelink-provisioner to extract cert and profile for {Account}, device {UDID}, bundle {Bundle}", appleId, deviceUdid, bundleId ?? "*");

            var psi = new System.Diagnostics.ProcessStartInfo
            {
                FileName = provisionerPath,
                Arguments = $"provision --apple-id \"{appleId}\" --udid \"{deviceUdid}\" {bundleArg}",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
                StandardOutputEncoding = Encoding.UTF8
            };

            using var proc = System.Diagnostics.Process.Start(psi);
            if (proc == null) return false;

            string stdout = await proc.StandardOutput.ReadToEndAsync();
            string stderr = await proc.StandardError.ReadToEndAsync();
            await proc.WaitForExitAsync();

            _logger.LogInformation("Native provisioner exit code: {Code}, output: {Out}", proc.ExitCode, stdout);
            return proc.ExitCode == 0;
        }
        catch (Exception ex)
        {
            _logger.LogWarning("ProvisionViaSideLinkEngineAsync error: {Message}", ex.Message);
            return false;
        }
    }
}
