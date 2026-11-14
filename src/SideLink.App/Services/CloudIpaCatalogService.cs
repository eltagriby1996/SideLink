using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace SideLink.App.Services;

public record CloudAppEntry
{
    public string BundleId { get; init; } = string.Empty;
    public string AppName { get; init; } = string.Empty;
    public string DownloadUrl { get; init; } = string.Empty;
    public string Version { get; init; } = "Latest";
    public string Size { get; init; } = "";
    public string Description { get; init; } = "";
}

public class CloudIpaCatalogService
{
    private static readonly Dictionary<string, CloudAppEntry> KnownApps = new(StringComparer.OrdinalIgnoreCase)
    {
        // WhatsApp Official / Watusi
        ["net.whatsapp.WhatsApp"] = new CloudAppEntry
        {
            BundleId = "net.whatsapp.WhatsApp",
            AppName = "WhatsApp",
            DownloadUrl = "https://fouadraheb.com/dl/storage/ipa/1794443507727-4w53k/net.whatsapp.WhatsApp_26.44.72_watusi_1.0_sl.ipa",
            Version = "26.44.72",
            Size = "110 MB",
            Description = "واتساب نسخة نظيفة معزولة بالكامل"
        },
        ["net.whatsapp.WhatsAppSMB"] = new CloudAppEntry
        {
            BundleId = "net.whatsapp.WhatsAppSMB",
            AppName = "WhatsApp Business",
            DownloadUrl = "https://fouadraheb.com/dl/storage/ipa/1794443507727-zmckb/com.fouadraheb.watusi_26.44.72_watusi_1.0_sl.ipa",
            Version = "26.44.72",
            Size = "110 MB",
            Description = "واتساب للأعمال نسخة معزولة"
        },
        // Telegram
        ["ph.telegra.Telegraph"] = new CloudAppEntry
        {
            BundleId = "ph.telegra.Telegraph",
            AppName = "Telegram",
            DownloadUrl = "https://github.com/swaggyP36000/TrollStore-IPAs/releases/download/07-14-2023/Telegram-9.6.3.ipa",
            Version = "9.6.3",
            Size = "120 MB",
            Description = "تليجرام حساب إضافي"
        },
        ["org.telegram.messenger"] = new CloudAppEntry
        {
            BundleId = "org.telegram.messenger",
            AppName = "Telegram",
            DownloadUrl = "https://github.com/swaggyP36000/TrollStore-IPAs/releases/download/07-14-2023/Telegram-9.6.3.ipa",
            Version = "9.6.3",
            Size = "120 MB",
            Description = "تليجرام حساب إضافي"
        },
        // Instagram
        ["com.burbn.instagram"] = new CloudAppEntry
        {
            BundleId = "com.burbn.instagram",
            AppName = "Instagram",
            DownloadUrl = "https://fouadraheb.com/dl/storage/ipa/1794250144993-bnwzh/com.burbn.instagram_454.1.0_regram_7.0.1_sl.ipa",
            Version = "454.1.0",
            Size = "138 MB",
            Description = "إنستغرام حساب ثاني"
        },
        // TikTok
        ["com.zhiliaoapp.musically"] = new CloudAppEntry
        {
            BundleId = "com.zhiliaoapp.musically",
            AppName = "TikTok",
            DownloadUrl = "https://github.com/swaggyP36000/TrollStore-IPAs/releases/download/07-14-2023/BHTikTokLRD-30.3.0.ipa",
            Version = "30.3.0",
            Size = "228 MB",
            Description = "تيك توك حساب إضافي"
        },
        // YouTube
        ["com.google.ios.youtube"] = new CloudAppEntry
        {
            BundleId = "com.google.ios.youtube",
            AppName = "YouTube",
            DownloadUrl = "https://archive.org/download/YouTubeRebornPlus_19.10.5-4.2.6/yt-uYE-21204-305.ipa",
            Version = "21.20.4",
            Size = "128 MB",
            Description = "يوتيوب نسخة ثانية"
        },
        // Spotify
        ["com.spotify.client"] = new CloudAppEntry
        {
            BundleId = "com.spotify.client",
            AppName = "Spotify",
            DownloadUrl = "https://ipa.cypwn.xyz/ipas/EeveeSpotify-5.9.5-9.0.36.ipa",
            Version = "9.0.36",
            Size = "80 MB",
            Description = "سبوتيفاي"
        },
        // Facebook
        ["com.facebook.Facebook"] = new CloudAppEntry
        {
            BundleId = "com.facebook.Facebook",
            AppName = "Facebook",
            DownloadUrl = "https://github.com/swaggyP36000/TrollStore-IPAs/releases/download/07-14-2023/FacebookWolf-420.0.ipa",
            Version = "420.0",
            Size = "190 MB",
            Description = "فيسبوك حساب ثاني"
        },
        // Messenger
        ["com.facebook.Messenger"] = new CloudAppEntry
        {
            BundleId = "com.facebook.Messenger",
            AppName = "Messenger",
            DownloadUrl = "https://github.com/swaggyP36000/TrollStore-IPAs/releases/download/07-14-2023/Messenger-414.0.ipa",
            Version = "414.0",
            Size = "120 MB",
            Description = "ماسينجر حساب ثاني"
        }
    };

    public CloudAppEntry? FindApp(string bundleId, string appName)
    {
        if (!string.IsNullOrWhiteSpace(bundleId) && KnownApps.TryGetValue(bundleId, out var entry))
            return entry;

        foreach (var kvp in KnownApps)
        {
            if (appName.Contains(kvp.Value.AppName, StringComparison.OrdinalIgnoreCase) ||
                kvp.Value.AppName.Contains(appName, StringComparison.OrdinalIgnoreCase) ||
                (bundleId != null && bundleId.Contains(kvp.Key, StringComparison.OrdinalIgnoreCase)))
            {
                return kvp.Value;
            }
        }

        return null;
    }

    public async Task<string?> DownloadIpaAsync(
        string url, 
        string targetBundleId, 
        IProgress<string>? progress = null, 
        CancellationToken cancellationToken = default)
    {
        string cacheDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "SideLink",
            "AppCache");
        Directory.CreateDirectory(cacheDir);

        string destPath = Path.Combine(cacheDir, $"{targetBundleId}.ipa");
        if (File.Exists(destPath) && new FileInfo(destPath).Length > 1_000_000)
        {
            return destPath;
        }

        using var client = new HttpClient { Timeout = TimeSpan.FromMinutes(10) };
        client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 SideLink/1.0");

        using var response = await client.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        response.EnsureSuccessStatusCode();

        long totalBytes = response.Content.Headers.ContentLength ?? -1L;
        using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var fileStream = new FileStream(destPath, FileMode.Create, FileAccess.Write, FileShare.None, 81920, true);

        byte[] buffer = new byte[81920];
        long bytesReadTotal = 0;
        int read;

        while ((read = await stream.ReadAsync(buffer, 0, buffer.Length, cancellationToken)) > 0)
        {
            await fileStream.WriteAsync(buffer, 0, read, cancellationToken);
            bytesReadTotal += read;

            if (totalBytes > 0)
            {
                int pct = (int)((bytesReadTotal * 100) / totalBytes);
                double mbRead = bytesReadTotal / (1024.0 * 1024.0);
                double mbTotal = totalBytes / (1024.0 * 1024.0);
                progress?.Report($"جاري تنزيل الحزمة: {mbRead:F1} من {mbTotal:F1} ميجابايت ({pct}%)...");
            }
            else
            {
                double mbRead = bytesReadTotal / (1024.0 * 1024.0);
                progress?.Report($"جاري تنزيل الحزمة: {mbRead:F1} ميجابايت...");
            }
        }

        return destPath;
    }
}

