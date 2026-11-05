using System.Collections.ObjectModel;
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

    public LogsViewModel()
    {
        RefreshFiltered();
    }

    public static void AddLog(string message)
    {
        App.Current?.Dispatcher?.Invoke(() =>
        {
            GlobalLogs.Insert(0, $"[{DateTime.Now:HH:mm:ss}] {message}");
            while (GlobalLogs.Count > 500)
                GlobalLogs.RemoveAt(GlobalLogs.Count - 1);
        });
    }

    partial void OnFilterQueryChanged(string value)
    {
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
        GlobalLogs.Clear();
        FilteredLogs.Clear();
    }

    [RelayCommand]
    public void CopyAllLogs()
    {
        string text = string.Join(Environment.NewLine, FilteredLogs);
        if (!string.IsNullOrWhiteSpace(text))
        {
            Clipboard.SetText(text);
        }
    }
}

public partial class SettingsViewModel : ObservableObject
{
    private readonly SideLink.Core.Interfaces.ILinkUnlockService _linkUnlockService;

    [ObservableProperty]
    private bool _isDarkTheme = true;

    [ObservableProperty]
    private string _verificationBackendUrl = "https://SideLink-web.vercel.app";

    [ObservableProperty]
    private bool _autoRefreshOnConnect = true;

    [ObservableProperty]
    private int _refreshNoticeDays = 3;

    [ObservableProperty]
    private string _versionString = "SideLink v1.0.0 (x64 Release)";

    [ObservableProperty]
    private string _currentVipStatus = "جاري الفحص...";

    public SettingsViewModel(SideLink.Core.Interfaces.ILinkUnlockService linkUnlockService)
    {
        _linkUnlockService = linkUnlockService;
        UpdateVipStatus();
    }

    public void UpdateVipStatus()
    {
        string? key = _linkUnlockService.GetSavedVipKey();
        CurrentVipStatus = !string.IsNullOrEmpty(key) ? $"مفعل ومربوط بهذا الجهاز (الكود: {key})" : "لا يوجد كود VIP محفوظ على هذا الجهاز";
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
