using System.Collections.ObjectModel;
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
    private readonly ILogger<InstalledAppsViewModel> _logger;

    public event Action<string>? NavigationRequested;

    public ObservableCollection<ManagedApp> Apps { get; } = new();

    [ObservableProperty]
    private ManagedApp? _selectedApp;

    [ObservableProperty]
    private bool _isLoading;

    [ObservableProperty]
    private bool _isRefreshing;

    [ObservableProperty]
    private string _statusMessage = "جاري تحميل التطبيقات المثبتة...";

    public InstalledAppsViewModel(
        IAppRepository appRepository,
        IRefreshService refreshService,
        IInstallationService installationService,
        IDeviceDiscoveryService deviceService,
        ICredentialStore credentialStore,
        ILogger<InstalledAppsViewModel> logger)
    {
        _appRepository = appRepository;
        _refreshService = refreshService;
        _installationService = installationService;
        _deviceService = deviceService;
        _credentialStore = credentialStore;
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
                Apps.Add(a);
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
}
