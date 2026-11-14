using System.Collections.ObjectModel;
using System.IO;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Extensions.Logging;
using SideLink.Core.Interfaces;
using SideLink.Core.Models;

namespace SideLink.App.ViewModels;

public partial class InstalledAppsViewModel : ObservableObject
{
    private readonly IAppRepository _appRepository;
    private readonly IRefreshService _refreshService;
    private readonly IInstallationService _installationService;
    private readonly IDeviceDiscoveryService _deviceService;
    private readonly ICredentialStore _credentialStore;
    private readonly IpaLibraryViewModel _ipaLibrary;
    private readonly SideLink.App.Services.CloudIpaCatalogService _cloudCatalog;
    private readonly ILogger<InstalledAppsViewModel> _logger;

    public event Action<string>? NavigationRequested;

    public ObservableCollection<ManagedApp> Apps { get; } = new();
    public ObservableCollection<DiscoveredAppInfo> DiscoveredApps { get; } = new();
    public ObservableCollection<DiscoveredAppInfo> FilteredDiscoveredApps { get; } = new();

    [ObservableProperty]
    private ManagedApp? _selectedApp;

    [ObservableProperty]
    private DiscoveredAppInfo? _selectedDiscoveredApp;

    [ObservableProperty]
    private bool _isLoading;

    [ObservableProperty]
    private bool _isRefreshing;

    [ObservableProperty]
    private bool _isScanningDevice;

    [ObservableProperty]
    private bool _showAllDeviceApps;

    [ObservableProperty]
    private int _selectedViewTab; // 0: SideLink Apps, 1: All iPhone Apps

    [ObservableProperty]
    private string _statusMessage = "جاري تحميل التطبيقات المثبتة...";

    [ObservableProperty]
    private string _filterQuery = string.Empty;

    partial void OnFilterQueryChanged(string value)
    {
        ApplyFilter();
    }

    private void ApplyFilter()
    {
        FilteredDiscoveredApps.Clear();
        var query = FilterQuery?.Trim() ?? string.Empty;
        foreach (var app in DiscoveredApps)
        {
            if (string.IsNullOrWhiteSpace(query) ||
                app.AppName.Contains(query, StringComparison.OrdinalIgnoreCase) ||
                app.BundleIdentifier.Contains(query, StringComparison.OrdinalIgnoreCase))
            {
                FilteredDiscoveredApps.Add(app);
            }
        }
    }

    public InstalledAppsViewModel(
        IAppRepository appRepository,
        IRefreshService refreshService,
        IInstallationService installationService,
        IDeviceDiscoveryService deviceService,
        ICredentialStore credentialStore,
        IpaLibraryViewModel ipaLibrary,
        SideLink.App.Services.CloudIpaCatalogService cloudCatalog,
        ILogger<InstalledAppsViewModel> logger)
    {
        _appRepository = appRepository;
        _refreshService = refreshService;
        _installationService = installationService;
        _deviceService = deviceService;
        _credentialStore = credentialStore;
        _ipaLibrary = ipaLibrary;
        _cloudCatalog = cloudCatalog;
        _logger = logger;
    }

    public async Task InitializeAsync()
    {
        await LoadAppsAsync();
    }

    [RelayCommand]
    public async Task LoadAppsAsync()
    {
        IsLoading = true;
        try
        {
            var apps = await _refreshService.CheckAppExpirationsAsync();
            var distinctApps = apps
                .GroupBy(a => a.BundleIdentifier)
                .Select(g => g.OrderByDescending(a => a.ExpirationDate ?? a.InstalledAt).First())
                .ToList();

            Apps.Clear();
            foreach (var a in distinctApps)
            {
                if (string.IsNullOrWhiteSpace(FilterQuery) || 
                    a.AppName.Contains(FilterQuery, StringComparison.OrdinalIgnoreCase) || 
                    a.BundleIdentifier.Contains(FilterQuery, StringComparison.OrdinalIgnoreCase))
                {
                    Apps.Add(a);
                }
            }

            SelectedApp = Apps.FirstOrDefault();
            StatusMessage = Apps.Count > 0 
                ? $"إدارة {Apps.Count} تطبيق(ات) مثبتة بشهادة المطور." 
                : "لا توجد تطبيقات مثبتة مسجلة في SideLink حالياً.";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load apps");
            StatusMessage = "خطأ في تحميل التطبيقات: " + ex.Message;
        }
        finally
        {
            IsLoading = false;
        }
    }

    [RelayCommand]
    public async Task RefreshSingleAppAsync(ManagedApp? app)
    {
        var target = app ?? SelectedApp;
        if (target == null) return;

        var device = _deviceService.CurrentDevice;
        if (device == null || !device.IsConnected)
        {
            StatusMessage = "تنبيه: يرجى توصيل هاتف الآيفون بالكمبيوتر عبر كابل USB لتجديد الشهادة.";
            return;
        }

        if (device.IsLocked)
        {
            StatusMessage = "تنبيه: الآيفون مقفل برمز مرور. يرجى فتح قفل الهاتف وإعادة المحاولة.";
            return;
        }

        IsRefreshing = true;
        StatusMessage = $"جاري تجديد شهادة {target.AppName} والحفاظ على بيانات التطبيق...";

        try
        {
            string? activeAppleId = await _credentialStore.GetLastAppleIdAsync();
            var config = new SigningConfiguration
            {
                Method = target.SigningMethod,
                AppleId = activeAppleId ?? string.Empty,
                CustomBundleId = target.BundleIdentifier,
                ModifyBundleId = false
            };

            var progress = new Progress<AppOperationProgress>(p =>
            {
                App.Current?.Dispatcher?.Invoke(() =>
                {
                    StatusMessage = p.CurrentStep;
                });
            });

            var refreshed = await _refreshService.RefreshAppAsync(target, device, config, progress);

            // Replace in collection
            int idx = Apps.IndexOf(target);
            if (idx >= 0)
            {
                Apps[idx] = refreshed;
            }
            SelectedApp = refreshed;

            StatusMessage = $"✓ تم تجديد شهادة {target.AppName} بنجاح! الصلاحية: 7 أيام إضافية بدون حذف أي بيانات.";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to refresh {App}", target.AppName);
            StatusMessage = $"فشل تجديد {target.AppName}: {ex.Message}";
        }
        finally
        {
            IsRefreshing = false;
        }
    }

    [RelayCommand]
    public async Task RefreshAllAppsAsync()
    {
        var device = _deviceService.CurrentDevice;
        if (device == null || !device.IsConnected)
        {
            StatusMessage = "تنبيه: يرجى توصيل هاتف الآيفون بالكمبيوتر عبر كابل USB للتجديد.";
            return;
        }

        if (device.IsLocked)
        {
            StatusMessage = "تنبيه: الآيفون مقفل برمز مرور. يرجى فتح قفل الهاتف وإعادة المحاولة.";
            return;
        }

        if (Apps.Count == 0)
        {
            StatusMessage = "لا توجد تطبيقات مثبتة مسجلة لتجديدها.";
            return;
        }

        IsRefreshing = true;
        StatusMessage = "جاري بدء التجديد السريع لجميع التطبيقات المثبتة...";

        try
        {
            string? activeAppleId = await _credentialStore.GetLastAppleIdAsync();
            var config = new SigningConfiguration
            {
                Method = SigningMethodType.PersonalTeam,
                AppleId = activeAppleId ?? string.Empty,
                ModifyBundleId = false
            };

            int successCount = 0;
            var appsToRefresh = Apps.ToList();

            for (int i = 0; i < appsToRefresh.Count; i++)
            {
                var app = appsToRefresh[i];
                StatusMessage = $"[{i + 1}/{appsToRefresh.Count}] جاري تجديد شهادة {app.AppName}...";

                try
                {
                    var appConfig = config with { CustomBundleId = app.BundleIdentifier };
                    var refreshed = await _refreshService.RefreshAppAsync(app, device, appConfig);
                    int idx = Apps.IndexOf(app);
                    if (idx >= 0)
                    {
                        Apps[idx] = refreshed;
                    }
                    successCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to refresh app {Name}", app.AppName);
                }
            }

            StatusMessage = $"✓ تم تجديد {successCount} من أصل {appsToRefresh.Count} تطبيق بنجاح وتم تمديد الصلاحية لـ 7 أيام جديدة!";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to refresh all apps");
            StatusMessage = $"حدث خطأ أثناء التجديد الجماعي: {ex.Message}";
        }
        finally
        {
            IsRefreshing = false;
        }
    }

    [RelayCommand]
    public async Task UninstallAppAsync(ManagedApp? app)
    {
        var target = app ?? SelectedApp;
        if (target == null) return;

        var device = _deviceService.CurrentDevice;
        if (device == null || !device.IsConnected)
        {
            StatusMessage = "Cannot uninstall: Connect device first.";
            return;
        }

        try
        {
            bool success = await _installationService.UninstallAppAsync(target.BundleIdentifier, device);
            if (success)
            {
                Apps.Remove(target);
                if (SelectedApp == target)
                    SelectedApp = Apps.FirstOrDefault();

                StatusMessage = $"Removed {target.AppName} from SideLink.";
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to uninstall {App}", target.AppName);
            StatusMessage = $"Uninstall failed: {ex.Message}";
        }
    }

    [RelayCommand]
    public void SwitchToManagedApps() => SelectedViewTab = 0;

    [RelayCommand]
    public void SwitchToDiscoveredApps() => SelectedViewTab = 1;

    [RelayCommand]
    public async Task ScanDeviceAppsAsync()
    {
        var device = _deviceService.CurrentDevice;
        if (device == null || !device.IsConnected)
        {
            StatusMessage = "تنبيه: يرجى توصيل هاتف الآيفون بالكمبيوتر عبر كابل USB لفحص كافة التطبيقات المثبتة.";
            return;
        }

        if (device.IsLocked)
        {
            StatusMessage = "تنبيه: الآيفون مقفل برمز مرور. يرجى فتح قفل الهاتف وإعادة المحاولة.";
            return;
        }

        IsScanningDevice = true;
        StatusMessage = "جاري قراءة واستكشاف كافة التطبيقات المثبتة على هاتفك الآيفون...";

        try
        {
            var apps = await _installationService.GetInstalledAppsOnDeviceAsync(device);
            DiscoveredApps.Clear();
            foreach (var a in apps.OrderBy(x => x.AppName))
            {
                DiscoveredApps.Add(a);
            }
            ApplyFilter();

            ShowAllDeviceApps = true;
            SelectedViewTab = 1;
            StatusMessage = $"✓ تم استكشاف {DiscoveredApps.Count} تطبيق مثبت على الآيفون! يمكنك الآن استنساخ أي تطبيق بنقرة واحدة.";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to scan device apps");
            StatusMessage = "فشل فحص تطبيقات الهاتف: " + ex.Message;
        }
        finally
        {
            IsScanningDevice = false;
        }
    }

    [RelayCommand]
    public async Task CloneAppAsync(ManagedApp? app)
    {
        var target = app ?? SelectedApp;
        if (target == null) return;

        string? ipaPath = target.ResolvedIpaPath;
        if (string.IsNullOrWhiteSpace(ipaPath) || !File.Exists(ipaPath))
        {
            var cloudEntry = _cloudCatalog.FindApp(target.BundleIdentifier, target.AppName);
            if (cloudEntry != null)
            {
                var cloudChoice = System.Windows.MessageBox.Show(
                    $"⚡ تم العثور على حزمة نظيفة لتطبيق ({cloudEntry.AppName}) جاهزة للتحميل والاستنساخ من سحابة SideLink!\n\n" +
                    $"• الحجم: {cloudEntry.Size}\n" +
                    $"• الإصدار: {cloudEntry.Version}\n" +
                    $"• الوصف: {cloudEntry.Description}\n\n" +
                    "هل تريد من SideLink تنزيل الحزمة تلقائياً واستنساخها وتثبيتها كنسخة ثانية على هاتفك؟\n" +
                    "(اضغط [Yes] للتحميل التلقائي الفوري، أو [No] لاختيار ملف IPA من جهازك)",
                    $"استنساخ تلقائي سحابي: {cloudEntry.AppName}",
                    System.Windows.MessageBoxButton.YesNoCancel,
                    System.Windows.MessageBoxImage.Information);

                if (cloudChoice == System.Windows.MessageBoxResult.Yes)
                {
                    StatusMessage = $"⚡ جاري تنزيل حزمة {cloudEntry.AppName} من السحابة... يرجى الانتظار";
                    var prog = new Progress<string>(msg => App.Current?.Dispatcher?.Invoke(() => StatusMessage = msg));
                    string? downloadedPath = await _cloudCatalog.DownloadIpaAsync(cloudEntry.DownloadUrl, cloudEntry.BundleId, prog);
                    if (!string.IsNullOrEmpty(downloadedPath) && File.Exists(downloadedPath))
                    {
                        string cName = $"{cloudEntry.AppName} 2";
                        string cBundleId = $"{cloudEntry.BundleId}.clone2";
                        StatusMessage = $"✓ اكتمل تنزيل الحزمة بنجاح! جاري التجهيز للتوقيع والتثبيت...";
                        await _ipaLibrary.PrepareAppForCloningAsync(downloadedPath, cName, cBundleId);
                        NavigationRequested?.Invoke("IpaLibrary");
                        return;
                    }
                    else
                    {
                        StatusMessage = $"تعذر إكمال تنزيل حزمة {cloudEntry.AppName}. يمكنك اختيار ملف IPA من جهازك.";
                    }
                }
                else if (cloudChoice == System.Windows.MessageBoxResult.Cancel)
                {
                    StatusMessage = "تم إلغاء عملية الاستنساخ.";
                    return;
                }
            }

            var dialog = new Microsoft.Win32.OpenFileDialog
            {
                Filter = "iOS Application Packages (*.ipa)|*.ipa|All Files (*.*)|*.*",
                Title = $"اختر ملف IPA لتطبيق ({target.AppName}) للبدء في استنساخه كنسخة ثانية معزولة"
            };

            var owner = System.Windows.Application.Current?.Windows.OfType<System.Windows.Window>().FirstOrDefault(w => w.IsActive) 
                        ?? System.Windows.Application.Current?.MainWindow;
            bool? result = owner != null ? dialog.ShowDialog(owner) : dialog.ShowDialog();

            if (result == true && File.Exists(dialog.FileName))
            {
                ipaPath = dialog.FileName;
            }
            else
            {
                StatusMessage = "تم إلغاء عملية الاستنساخ.";
                return;
            }
        }

        string cloneName = $"{target.AppName} 2";
        string cloneBundleId = $"{target.BundleIdentifier}.clone2";

        StatusMessage = $"جاري إعداد النسخة المستنسخة من {target.AppName}...";
        await _ipaLibrary.PrepareAppForCloningAsync(ipaPath, cloneName, cloneBundleId);
        NavigationRequested?.Invoke("IpaLibrary");
    }

    [RelayCommand]
    public async Task CloneDiscoveredAppAsync(DiscoveredAppInfo? app)
    {
        var target = app ?? SelectedDiscoveredApp;
        if (target == null) return;

        string? ipaPath = target.CachedIpaPath;
        if (string.IsNullOrWhiteSpace(ipaPath) || !File.Exists(ipaPath))
        {
            // 1. Check if the app exists in our Cloud IPA Catalog (WhatsApp, Telegram, TikTok, Instagram, etc.)
            var cloudEntry = _cloudCatalog.FindApp(target.BundleIdentifier, target.AppName);
            if (cloudEntry != null)
            {
                var cloudChoice = System.Windows.MessageBox.Show(
                    $"⚡ تم العثور على حزمة نظيفة لتطبيق ({cloudEntry.AppName}) جاهزة للتحميل والاستنساخ من سحابة SideLink!\n\n" +
                    $"• الحجم: {cloudEntry.Size}\n" +
                    $"• الإصدار: {cloudEntry.Version}\n" +
                    $"• الوصف: {cloudEntry.Description}\n\n" +
                    "هل تريد من SideLink تنزيل الحزمة تلقائياً واستنساخها وتثبيتها كنسخة ثانية على هاتفك؟\n" +
                    "(اضغط [Yes] للتحميل التلقائي الفوري، أو [No] لاختيار ملف IPA من جهازك)",
                    $"استنساخ تلقائي سحابي: {cloudEntry.AppName}",
                    System.Windows.MessageBoxButton.YesNoCancel,
                    System.Windows.MessageBoxImage.Information);

                if (cloudChoice == System.Windows.MessageBoxResult.Yes)
                {
                    StatusMessage = $"⚡ جاري تنزيل حزمة {cloudEntry.AppName} من السحابة... يرجى الانتظار";
                    var prog = new Progress<string>(msg => App.Current?.Dispatcher?.Invoke(() => StatusMessage = msg));
                    string? downloadedPath = await _cloudCatalog.DownloadIpaAsync(cloudEntry.DownloadUrl, cloudEntry.BundleId, prog);
                    if (!string.IsNullOrEmpty(downloadedPath) && File.Exists(downloadedPath))
                    {
                        string cName = $"{cloudEntry.AppName} 2";
                        string cBundleId = $"{cloudEntry.BundleId}.clone2";
                        StatusMessage = $"✓ اكتمل تنزيل الحزمة بنجاح! جاري التجهيز للتوقيع والتثبيت...";
                        await _ipaLibrary.PrepareAppForCloningAsync(downloadedPath, cName, cBundleId);
                        NavigationRequested?.Invoke("IpaLibrary");
                        return;
                    }
                    else
                    {
                        StatusMessage = $"تعذر إكمال تنزيل حزمة {cloudEntry.AppName}. يمكنك اختيار ملف IPA من جهازك.";
                    }
                }
                else if (cloudChoice == System.Windows.MessageBoxResult.Cancel)
                {
                    StatusMessage = "تم إلغاء عملية الاستنساخ.";
                    return;
                }
            }
            else
            {
                // App not in predefined cloud list
                var searchChoice = System.Windows.MessageBox.Show(
                    $"تطبيق ({target.AppName}) مثبت حالياً من متجر App Store الرسمي (مشفر بحماية آبل FairPlay DRM ولا يسمح نظام iOS بسحبه عبر USB بدون جيلبريك).\n\n" +
                    "💡 للحصول على نسخة IPA نظيفة واستنساخها:\n" +
                    "• اضغط [Yes] للبحث التلقائي في الإنترنت وتحميل الـ IPA النظيف للتطبيق بنقرة واحدة.\n" +
                    "• اضغط [No] لاختيار ملف IPA من جهازك إذا كان متوفراً لديك.\n\n" +
                    "هل تريد البحث عن ملف التطبيق في الإنترنت الآن؟",
                    "استنساخ تطبيق App Store",
                    System.Windows.MessageBoxButton.YesNoCancel,
                    System.Windows.MessageBoxImage.Question);

                if (searchChoice == System.Windows.MessageBoxResult.Yes)
                {
                    try
                    {
                        string searchUrl = $"https://decrypt.day/search?q={Uri.EscapeDataString(target.AppName)}";
                        System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                        {
                            FileName = searchUrl,
                            UseShellExecute = true
                        });
                        StatusMessage = $"تم فتح صفحة البحث عن IPA نظيف لتطبيق ({target.AppName}). بعد التنزيل اضغط استنساخ مجدداً لاختياره.";
                    }
                    catch { }
                    return;
                }
                else if (searchChoice == System.Windows.MessageBoxResult.Cancel)
                {
                    StatusMessage = "تم إلغاء عملية الاستنساخ.";
                    return;
                }
            }

            // Fallback: Pick IPA
            var dialog = new Microsoft.Win32.OpenFileDialog
            {
                Filter = "iOS Application Packages (*.ipa)|*.ipa|All Files (*.*)|*.*",
                Title = $"اختر ملف الـ IPA لتطبيق ({target.AppName}) لإنشاء وتثبيت النسخة المستنسخة"
            };

            var owner = System.Windows.Application.Current?.Windows.OfType<System.Windows.Window>().FirstOrDefault(w => w.IsActive) 
                        ?? System.Windows.Application.Current?.MainWindow;
            bool? result = owner != null ? dialog.ShowDialog(owner) : dialog.ShowDialog();

            if (result == true && File.Exists(dialog.FileName))
            {
                ipaPath = dialog.FileName;
            }
            else
            {
                StatusMessage = "تم إلغاء عملية الاستنساخ.";
                return;
            }
        }

        string cloneName = $"{target.AppName} 2";
        string cloneBundleId = $"{target.BundleIdentifier}.clone2";

        StatusMessage = $"جاري إعداد النسخة المستنسخة من {target.AppName}...";
        await _ipaLibrary.PrepareAppForCloningAsync(ipaPath, cloneName, cloneBundleId);
        NavigationRequested?.Invoke("IpaLibrary");
    }
}
