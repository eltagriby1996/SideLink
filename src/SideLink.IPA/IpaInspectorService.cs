using System.IO.Compression;
using Microsoft.Extensions.Logging;
using SideLink.Core.Interfaces;
using SideLink.Core.Models;

namespace SideLink.IPA;

public class IpaInspectorService : IIpaInspectorService
{
    private readonly ILogger<IpaInspectorService> _logger;

    public IpaInspectorService(ILogger<IpaInspectorService> logger)
    {
        _logger = logger;
    }

    public async Task<bool> ValidateIpaArchiveAsync(string ipaFilePath, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(ipaFilePath) || !File.Exists(ipaFilePath))
        {
            _logger.LogWarning("IPA file does not exist: {FilePath}", ipaFilePath);
            return false;
        }

        try
        {
            await Task.Run(() =>
            {
                using var archive = ZipFile.OpenRead(ipaFilePath);
                // Validate that it has at least one entry in Payload/ and an Info.plist
                bool hasPayload = false;
                bool hasInfoPlist = false;

                foreach (var entry in archive.Entries)
                {
                    cancellationToken.ThrowIfCancellationRequested();

                    // Security check: Reject path traversal entries (Zip Slip)
                    if (entry.FullName.Contains("..") || entry.FullName.StartsWith("/") || entry.FullName.StartsWith("\\"))
                    {
                        throw new InvalidDataException($"Insecure archive entry path: {entry.FullName}");
                    }

                    if (entry.FullName.StartsWith("Payload/", StringComparison.OrdinalIgnoreCase))
                    {
                        hasPayload = true;
                        if (entry.FullName.EndsWith("/Info.plist", StringComparison.OrdinalIgnoreCase) ||
                            entry.FullName.Equals("Payload/Info.plist", StringComparison.OrdinalIgnoreCase))
                        {
                            hasInfoPlist = true;
                        }
                    }
                }

                if (!hasPayload || !hasInfoPlist)
                {
                    throw new InvalidDataException("IPA archive missing Payload directory or Info.plist");
                }
            }, cancellationToken);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to validate IPA archive {FilePath}", ipaFilePath);
            return false;
        }
    }

    public async Task<IpaMetadata> InspectIpaAsync(string ipaFilePath, CancellationToken cancellationToken = default)
    {
        if (!File.Exists(ipaFilePath))
            throw new FileNotFoundException("IPA file not found", ipaFilePath);

        var fileInfo = new FileInfo(ipaFilePath);

        return await Task.Run(() =>
        {
            using var archive = ZipFile.OpenRead(ipaFilePath);

            // Locate Info.plist
            ZipArchiveEntry? infoPlistEntry = null;
            ZipArchiveEntry? provisionEntry = null;
            ZipArchiveEntry? iconEntry = null;

            foreach (var entry in archive.Entries)
            {
                cancellationToken.ThrowIfCancellationRequested();

                // Zip slip check
                if (entry.FullName.Contains(".."))
                    continue;

                if (infoPlistEntry == null && 
                    entry.FullName.StartsWith("Payload/", StringComparison.OrdinalIgnoreCase) && 
                    entry.FullName.EndsWith("/Info.plist", StringComparison.OrdinalIgnoreCase))
                {
                    infoPlistEntry = entry;
                }

                if (provisionEntry == null && 
                    entry.FullName.StartsWith("Payload/", StringComparison.OrdinalIgnoreCase) && 
                    entry.FullName.EndsWith("/embedded.mobileprovision", StringComparison.OrdinalIgnoreCase))
                {
                    provisionEntry = entry;
                }

                if (iconEntry == null && 
                    entry.FullName.StartsWith("Payload/", StringComparison.OrdinalIgnoreCase) && 
                    (entry.FullName.Contains("AppIcon") || entry.FullName.Contains("icon")) && 
                    entry.FullName.EndsWith(".png", StringComparison.OrdinalIgnoreCase))
                {
                    iconEntry = entry;
                }
            }

            if (infoPlistEntry == null)
                throw new InvalidDataException("Payload app bundle Info.plist was not found in the IPA archive.");

            byte[] infoPlistBytes;
            using (var stream = infoPlistEntry.Open())
            using (var ms = new MemoryStream())
            {
                stream.CopyTo(ms);
                infoPlistBytes = ms.ToArray();
            }

            var plist = PlistParser.Parse(infoPlistBytes);

            string bundleId = plist.TryGetValue("CFBundleIdentifier", out var bid) ? bid?.ToString() ?? string.Empty : string.Empty;
            string bundleName = plist.TryGetValue("CFBundleName", out var bn) ? bn?.ToString() ?? string.Empty : string.Empty;
            string displayName = plist.TryGetValue("CFBundleDisplayName", out var dn) ? dn?.ToString() ?? string.Empty : string.Empty;
            string version = plist.TryGetValue("CFBundleShortVersionString", out var ver) ? ver?.ToString() ?? string.Empty : string.Empty;
            string build = plist.TryGetValue("CFBundleVersion", out var bld) ? bld?.ToString() ?? string.Empty : string.Empty;
            string minOs = plist.TryGetValue("MinimumOSVersion", out var mos) ? mos?.ToString() ?? "14.0" : "14.0";
            string execName = plist.TryGetValue("CFBundleExecutable", out var exe) ? exe?.ToString() ?? string.Empty : string.Empty;

            // Parse MobileProvision if available
            MobileProvisionInfo? provisionInfo = null;
            if (provisionEntry != null)
            {
                using var pStream = provisionEntry.Open();
                using var pMs = new MemoryStream();
                pStream.CopyTo(pMs);
                provisionInfo = MobileProvisionParser.Parse(pMs.ToArray());
            }

            // Extract icon if found
            string? iconBase64 = null;
            if (iconEntry != null)
            {
                try
                {
                    using var iStream = iconEntry.Open();
                    using var iMs = new MemoryStream();
                    iStream.CopyTo(iMs);
                    iconBase64 = Convert.ToBase64String(iMs.ToArray());
                }
                catch
                {
                    // Non-critical if icon fails to convert
                }
            }

            return new IpaMetadata
            {
                FilePath = ipaFilePath,
                FileSizeBytes = fileInfo.Length,
                BundleIdentifier = bundleId,
                BundleName = bundleName,
                DisplayName = displayName,
                Version = version,
                BuildNumber = build,
                MinimumOsVersion = minOs,
                ExecutableName = execName,
                HasMobileProvision = provisionInfo != null,
                ProvisioningProfile = provisionInfo,
                IconBase64 = iconBase64
            };
        }, cancellationToken);
    }

    public async Task<MobileProvisionInfo?> ExtractProvisioningProfileAsync(string ipaFilePath, CancellationToken cancellationToken = default)
    {
        if (!File.Exists(ipaFilePath)) return null;

        return await Task.Run(() =>
        {
            using var archive = ZipFile.OpenRead(ipaFilePath);
            var entry = archive.Entries.FirstOrDefault(e => 
                e.FullName.StartsWith("Payload/", StringComparison.OrdinalIgnoreCase) && 
                e.FullName.EndsWith("/embedded.mobileprovision", StringComparison.OrdinalIgnoreCase));

            if (entry == null) return null;

            using var stream = entry.Open();
            using var ms = new MemoryStream();
            stream.CopyTo(ms);
            return MobileProvisionParser.Parse(ms.ToArray());
        }, cancellationToken);
    }
}
