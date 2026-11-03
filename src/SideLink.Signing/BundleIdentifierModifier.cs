using System;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;
using System.Xml.Linq;

namespace SideLink.Signing;

public static class BundleIdentifierModifier
{
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr LoadLibrary(string lpFileName);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool SetDllDirectory(string lpPathName);

    [DllImport("CoreFoundation.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr CFDataCreate(IntPtr allocator, byte[] bytes, int length);

    [DllImport("CoreFoundation.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr CFPropertyListCreateWithData(IntPtr allocator, IntPtr data, int options, out int format, out IntPtr error);

    [DllImport("CoreFoundation.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr CFPropertyListCreateData(IntPtr allocator, IntPtr propertyList, int format, int options, out IntPtr error);

    [DllImport("CoreFoundation.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern int CFDataGetLength(IntPtr data);

    [DllImport("CoreFoundation.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern IntPtr CFDataGetBytePtr(IntPtr data);

    [DllImport("CoreFoundation.dll", CallingConvention = CallingConvention.Cdecl)]
    private static extern void CFRelease(IntPtr obj);

    private static bool _cfLoaded;
    private static readonly object _lock = new();

    private static void EnsureCoreFoundationLoaded()
    {
        lock (_lock)
        {
            if (_cfLoaded) return;
            try
            {
                string support = @"C:\Program Files\Common Files\Apple\Apple Application Support";
                if (Directory.Exists(support))
                {
                    Environment.SetEnvironmentVariable("PATH", support + ";" + Environment.GetEnvironmentVariable("PATH"));
                    SetDllDirectory(support);
                    LoadLibrary(Path.Combine(support, "CoreFoundation.dll"));
                }
                _cfLoaded = true;
            }
            catch { }
        }
    }

    /// <summary>
    /// Modifies the Bundle Identifier of the main app and all child plugins/extensions
    /// to avoid conflict with official App Store versions and enable dual installation.
    /// </summary>
    public static string ModifyBundleIdentifier(string appBundlePath, string? targetBundleId)
    {
        string mainPlistPath = Path.Combine(appBundlePath, "Info.plist");
        if (!File.Exists(mainPlistPath)) return string.Empty;

        try
        {
            byte[] mainBytes = File.ReadAllBytes(mainPlistPath);
            string mainXml = ReadPlistAsXmlString(mainBytes);
            var mainDoc = XDocument.Parse(mainXml);

            var mainDict = mainDoc.Root?.Element("dict");
            if (mainDict == null) return string.Empty;

            var idKey = mainDict.Elements("key").FirstOrDefault(k => k.Value == "CFBundleIdentifier");
            var idValNode = idKey?.ElementsAfterSelf().FirstOrDefault();
            string oldBundleId = idValNode?.Value ?? string.Empty;

            if (string.IsNullOrWhiteSpace(oldBundleId)) return string.Empty;

            string effectiveNewId = !string.IsNullOrWhiteSpace(targetBundleId)
                ? targetBundleId.Trim()
                : (oldBundleId.EndsWith(".sidelink", StringComparison.OrdinalIgnoreCase) || oldBundleId.EndsWith(".sl", StringComparison.OrdinalIgnoreCase)
                    ? oldBundleId
                    : $"{oldBundleId}.sidelink");

            if (idValNode != null)
            {
                idValNode.Value = effectiveNewId;
            }

            // Save updated main Info.plist (UTF-8 without BOM)
            SavePlist(mainDoc, mainPlistPath);

            // Update any app extensions in PlugIns or Extensions directories
            UpdateExtensionBundleIdentifiers(appBundlePath, "PlugIns", oldBundleId, effectiveNewId);
            UpdateExtensionBundleIdentifiers(appBundlePath, "Extensions", oldBundleId, effectiveNewId);

            return oldBundleId;
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Error modifying bundle identifier: {ex.Message}");
            return string.Empty;
        }
    }

    private static void UpdateExtensionBundleIdentifiers(string appBundlePath, string subFolder, string oldBundleId, string newBundleId)
    {
        string folder = Path.Combine(appBundlePath, subFolder);
        if (!Directory.Exists(folder)) return;

        foreach (var appexDir in Directory.GetDirectories(folder, "*.appex"))
        {
            string extPlistPath = Path.Combine(appexDir, "Info.plist");
            if (!File.Exists(extPlistPath)) continue;

            try
            {
                byte[] extBytes = File.ReadAllBytes(extPlistPath);
                string extXml = ReadPlistAsXmlString(extBytes);
                var extDoc = XDocument.Parse(extXml);

                var dict = extDoc.Root?.Element("dict");
                if (dict == null) continue;

                var idKey = dict.Elements("key").FirstOrDefault(k => k.Value == "CFBundleIdentifier");
                var idVal = idKey?.ElementsAfterSelf().FirstOrDefault();

                if (idVal != null && !string.IsNullOrWhiteSpace(idVal.Value))
                {
                    string oldExtId = idVal.Value;
                    if (oldExtId.StartsWith(oldBundleId, StringComparison.OrdinalIgnoreCase))
                    {
                        string suffix = oldExtId.Substring(oldBundleId.Length);
                        idVal.Value = newBundleId + suffix;
                    }
                    else
                    {
                        string extName = Path.GetFileNameWithoutExtension(appexDir);
                        idVal.Value = $"{newBundleId}.{extName}";
                    }
                }

                // Check WKCompanionAppBundleIdentifier if present
                var wkKey = dict.Elements("key").FirstOrDefault(k => k.Value == "WKCompanionAppBundleIdentifier");
                var wkVal = wkKey?.ElementsAfterSelf().FirstOrDefault();
                if (wkVal != null && wkVal.Value == oldBundleId)
                {
                    wkVal.Value = newBundleId;
                }

                SavePlist(extDoc, extPlistPath);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Warning updating {extPlistPath}: {ex.Message}");
            }
        }
    }

    private static void SavePlist(XDocument doc, string filePath)
    {
        string rootXml = doc.Root?.ToString() ?? string.Empty;
        string cleanXml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
            "<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n" +
            rootXml;

        byte[] xmlBytes = Encoding.UTF8.GetBytes(cleanXml);
        EnsureCoreFoundationLoaded();
        try
        {
            IntPtr cfData = CFDataCreate(IntPtr.Zero, xmlBytes, xmlBytes.Length);
            IntPtr plist = CFPropertyListCreateWithData(IntPtr.Zero, cfData, 0, out int formatOut, out IntPtr err);
            CFRelease(cfData);

            if (plist != IntPtr.Zero)
            {
                // Save as binary plist (format 200) for 100% native iOS installd compatibility
                IntPtr binData = CFPropertyListCreateData(IntPtr.Zero, plist, 200, 0, out err);
                CFRelease(plist);

                if (binData != IntPtr.Zero)
                {
                    int len = CFDataGetLength(binData);
                    byte[] binBytes = new byte[len];
                    Marshal.Copy(CFDataGetBytePtr(binData), binBytes, 0, len);
                    CFRelease(binData);

                    File.WriteAllBytes(filePath, binBytes);
                    return;
                }
            }
        }
        catch { }

        // Fallback: write clean XML without []
        File.WriteAllText(filePath, cleanXml, new UTF8Encoding(false));
    }

    public static string ReadPlistAsXmlString(byte[] plistBytes)
    {
        if (plistBytes == null || plistBytes.Length == 0) return string.Empty;

        if (plistBytes.Length >= 8 && Encoding.ASCII.GetString(plistBytes, 0, 8) == "bplist00")
        {
            EnsureCoreFoundationLoaded();
            try
            {
                IntPtr cfData = CFDataCreate(IntPtr.Zero, plistBytes, plistBytes.Length);
                IntPtr plist = CFPropertyListCreateWithData(IntPtr.Zero, cfData, 0, out int formatOut, out IntPtr err);
                CFRelease(cfData);

                if (plist != IntPtr.Zero)
                {
                    IntPtr xmlData = CFPropertyListCreateData(IntPtr.Zero, plist, 100 /* XML */, 0, out err);
                    CFRelease(plist);

                    if (xmlData != IntPtr.Zero)
                    {
                        int len = CFDataGetLength(xmlData);
                        byte[] buf = new byte[len];
                        Marshal.Copy(CFDataGetBytePtr(xmlData), buf, 0, len);
                        CFRelease(xmlData);
                        return Encoding.UTF8.GetString(buf).Trim('\uFEFF', ' ', '\r', '\n', '\t');
                    }
                }
            }
            catch { }
        }

        return Encoding.UTF8.GetString(plistBytes).Trim('\uFEFF', ' ', '\r', '\n', '\t');
    }
}
