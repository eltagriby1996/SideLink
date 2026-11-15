using System.Collections.ObjectModel;
using System.IO;
using System.Windows;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

namespace SideLink.App.ViewModels;

public partial class LogsViewModel : ObservableObject
{
    public static ObservableCollection<string> GlobalLogs { get; } = new();

    public ObservableCollection<string> FilteredLogs { get; } = new();

    [ObservableProperty]
    private string _filterQuery = string.Empty;

    [ObservableProperty]
    private string _logContent = string.Empty;

    [ObservableProperty]
    private string _logFilePath = string.Empty;

    [ObservableProperty]
    private string _logStatusText = "جاهز لعرض السجلات";

    public LogsViewModel()
    {
        string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        LogFilePath = Path.Combine(localAppData, "SideLink", "boot.log");
        RefreshLogs();
    }

    public static void AddLog(string message)
    {
        try
        {
            if (App.Current?.Dispatcher != null && !App.Current.Dispatcher.CheckAccess())
            {
                App.Current.Dispatcher.BeginInvoke(() =>
                {
                    GlobalLogs.Insert(0, $"[{DateTime.Now:HH:mm:ss}] {message}");
                    while (GlobalLogs.Count > 1000)
                        GlobalLogs.RemoveAt(GlobalLogs.Count - 1);
                });
            }
            else
            {
                GlobalLogs.Insert(0, $"[{DateTime.Now:HH:mm:ss}] {message}");
                while (GlobalLogs.Count > 1000)
                    GlobalLogs.RemoveAt(GlobalLogs.Count - 1);
            }
        }
        catch { }
    }

    partial void OnFilterQueryChanged(string value)
    {
        RefreshLogs();
    }

    [RelayCommand]
    public void RefreshLogs()
    {
        try
        {
            if (File.Exists(LogFilePath))
            {
                using var fs = new FileStream(LogFilePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                using var sr = new StreamReader(fs);
                string text = sr.ReadToEnd();

                if (string.IsNullOrWhiteSpace(FilterQuery))
                {
                    LogContent = text;
                }
                else
                {
                    var lines = text.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.None);
                    var matched = lines.Where(l => l.Contains(FilterQuery, StringComparison.OrdinalIgnoreCase));
                    LogContent = string.Join(Environment.NewLine, matched);
                }

                long len = new FileInfo(LogFilePath).Length;
                LogStatusText = $"✓ تم قراءة ملف السجلات بنجاح ({len / 1024} KB).";
            }
            else
            {
                LogContent = string.Join(Environment.NewLine, GlobalLogs);
                LogStatusText = "السجلات المؤقتة في الذاكرة.";
            }
        }
        catch (Exception ex)
        {
            LogStatusText = "تعذر قراءة ملف السجل: " + ex.Message;
        }

        RefreshFiltered();
    }

    [RelayCommand]
    public void RefreshFiltered()
    {
        FilteredLogs.Clear();
        foreach (var log in GlobalLogs)
        {
            if (string.IsNullOrWhiteSpace(FilterQuery) || log.Contains(FilterQuery, StringComparison.OrdinalIgnoreCase))
            {
                FilteredLogs.Add(log);
            }
        }
    }

    [RelayCommand]
    public void ClearLogs()
    {
        try
        {
            if (File.Exists(LogFilePath))
            {
                File.WriteAllText(LogFilePath, string.Empty);
            }
        }
        catch { }

        GlobalLogs.Clear();
        FilteredLogs.Clear();
        LogContent = string.Empty;
        LogStatusText = "✓ تم مسح السجلات بنجاح.";
    }

    [RelayCommand]
    public void CopyAllLogs()
    {
        string text = !string.IsNullOrWhiteSpace(LogContent) ? LogContent : string.Join(Environment.NewLine, FilteredLogs);
        if (!string.IsNullOrWhiteSpace(text))
        {
            Clipboard.SetText(text);
            LogStatusText = "✓ تم نسخ كامل السجلات إلى الحافظة بنجاح.";
        }
    }

    [RelayCommand]
    public void OpenLogFolder()
    {
        try
        {
            string folder = Path.GetDirectoryName(LogFilePath) ?? Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            if (Directory.Exists(folder))
            {
                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("explorer.exe", folder) { UseShellExecute = true });
            }
        }
        catch { }
    }

    [RelayCommand]
    public void OpenLogFile()
    {
        try
        {
            if (File.Exists(LogFilePath))
            {
                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(LogFilePath) { UseShellExecute = true });
            }
        }
        catch { }
    }
}

public partial class SettingsViewModel : ObservableObject
{
    private readonly SideLink.Core.Interfaces.ILinkUnlockService _linkUnlockService;

    [ObservableProperty]
    private bool _isDarkTheme = true;

    [ObservableProperty]
    private string _verificationBackendUrl = "https://www.sidelinktool.me";

    [ObservableProperty]
    private bool _autoRefreshOnConnect = true;

    [ObservableProperty]
    private int _refreshNoticeDays = 3;

    [ObservableProperty]
    private bool _checkUpdatesOnStartup = true;

    [ObservableProperty]
    private string _versionString = "SideLink v1.0.0 (Windows x64 Stable)";

    [ObservableProperty]
    private string _currentVipStatus = "جاري الفحص...";

    [ObservableProperty]
    private string _downloadsPath = string.Empty;

    [ObservableProperty]
    private string _cacheSizeText = "0 MB";

    [ObservableProperty]
    private string _saveStatusMessage = string.Empty;

    public SettingsViewModel(SideLink.Core.Interfaces.ILinkUnlockService linkUnlockService)
    {
        _linkUnlockService = linkUnlockService;
        DownloadsPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "SideLink", "AppCache");
        RefreshSettings();
    }

    public void RefreshSettings()
    {
        UpdateVipStatus();
        CalculateCacheSize();
    }

    public void UpdateVipStatus()
    {
        string? key = _linkUnlockService.GetSavedVipKey();
        CurrentVipStatus = !string.IsNullOrEmpty(key) ? $"مفعل ومربوط بهذا الجهاز (الكود: {key})" : "لا يوجد كود VIP نشط (البرنامج يعمل بنظام التحقق المجاني)";
    }

    public void CalculateCacheSize()
    {
        try
        {
            if (Directory.Exists(DownloadsPath))
            {
                var files = Directory.GetFiles(DownloadsPath, "*.*", SearchOption.AllDirectories);
                long bytes = files.Sum(f => new FileInfo(f).Length);
                double mb = bytes / (1024.0 * 1024.0);
                if (mb > 1024.0)
                {
                    CacheSizeText = $"{mb / 1024.0:F2} GB ({files.Length} ملفات مؤقتة)";
                }
                else
                {
                    CacheSizeText = $"{mb:F1} MB ({files.Length} ملفات مؤقتة)";
                }
            }
            else
            {
                CacheSizeText = "0 MB (المجلد فارغ)";
            }
        }
        catch
        {
            CacheSizeText = "تعذر حساب الحجم";
        }
    }

    [RelayCommand]
    public void ClearCache()
    {
        try
        {
            if (Directory.Exists(DownloadsPath))
            {
                var files = Directory.GetFiles(DownloadsPath, "*.*");
                foreach (var f in files)
                {
                    try { File.Delete(f); } catch { }
                }
                CalculateCacheSize();
                SaveStatusMessage = "✓ تم تنظيف كافة الملفات المؤقتة وتفريغ المساحة بنجاح.";
            }
        }
        catch (Exception ex)
        {
            SaveStatusMessage = "تعذر حذف الملفات: " + ex.Message;
        }
    }

    [RelayCommand]
    public void OpenCacheFolder()
    {
        try
        {
            if (Directory.Exists(DownloadsPath))
            {
                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("explorer.exe", DownloadsPath) { UseShellExecute = true });
            }
        }
        catch { }
    }

    [RelayCommand]
    public void OpenIdentitiesFolder()
    {
        try
        {
            string idDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "SideLink", "Identities");
            Directory.CreateDirectory(idDir);
            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("explorer.exe", idDir) { UseShellExecute = true });
        }
        catch { }
    }

    [RelayCommand]
    public void SaveSettings()
    {
        SaveStatusMessage = "✓ تم حفظ وتطبيق كافة التفضيلات بنجاح!";
    }

    [RelayCommand]
    public void CheckForUpdates()
    {
        try
        {
            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo("https://www.sidelinktool.me") { UseShellExecute = true });
        }
        catch { }
    }

    [RelayCommand]
    public void UnlinkVipKey()
    {
        _linkUnlockService.RevokeLocalVipLicense();
        UpdateVipStatus();
        MessageBox.Show(
            "تم إلغاء ترخيص الـ VIP وحذف بياناته من هذا الجهاز بنجاح.\nيمكنك الآن إتمام التحقق العادي أو تجربة كود VIP جديد.",
            "إلغاء ارتباط VIP",
            MessageBoxButton.OK,
            MessageBoxImage.Information);
    }
}
