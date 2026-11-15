using System.Collections.ObjectModel;
using System.Windows;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Extensions.Logging;
using SideLink.Core.Interfaces;
using SideLink.Core.Models;

namespace SideLink.App.ViewModels;

public class DashboardActivityItem
{
    public string TimeText { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
    public string Icon { get; set; } = "ℹ️";
    public string BadgeColor { get; set; } = "#38BDF8";
}

public partial class DashboardViewModel : ObservableObject
{
    private readonly IDeviceDiscoveryService _deviceService;
    private readonly IAppRepository _appRepository;
    private readonly IRefreshService _refreshService;
    private readonly ICredentialStore _credentialStore;
    private readonly IAppleIdentityService _identityService;
    private readonly ILogger<DashboardViewModel> _logger;

    [ObservableProperty]
    private IosDevice? _currentDevice;

    [ObservableProperty]
    private int _totalAppsCount;

    [ObservableProperty]
    private int _activeAppsCount;

    [ObservableProperty]
    private int _expiringSoonCount;

    [ObservableProperty]
    private int _expiredCount;

    [ObservableProperty]
    private string _deviceStatusText = "قم بتوصيل جهاز الآيفون عبر كابل USB للبدء";

    [ObservableProperty]
    private string _deviceModelText = "لا يوجد جهاز متصل";

    [ObservableProperty]
    private string _iosVersionText = "—";

    [ObservableProperty]
    private string _deviceUdidText = "—";

    [ObservableProperty]
    private string _deviceTrustBadge = "غير متصل";

    [ObservableProperty]
    private string _deviceTrustColor = "#94A3B8";

    [ObservableProperty]
    private bool _isDeviceConnected;

    [ObservableProperty]
    private bool _isRefreshing;

    [ObservableProperty]
    private string _operationStatusText = "نظام SideLink جاهز للعمل";

    // Certificate Overview
    [ObservableProperty]
    private string _activeAppleId = "لم يتم تحديد حساب بعد";

    [ObservableProperty]
    private string _activeTeamId = "—";

    [ObservableProperty]
    private string _certExpiryDisplay = "—";

    [ObservableProperty]
    private string _certStatusBadge = "غير مفعل";

    [ObservableProperty]
    private string _certStatusColor = "#94A3B8";

    [ObservableProperty]
    private int _certRemainingDays = 7;

    [ObservableProperty]
    private double _certDaysPercent = 100.0;

    [ObservableProperty]
    private bool _hasActiveCert;

    public ObservableCollection<ManagedApp> ManagedAppsList { get; } = new();

    public ObservableCollection<DashboardActivityItem> ActivityItems { get; } = new();

    public ObservableCollection<string> RecentActivities { get; } = new();

    public event Action<string>? NavigationRequested;

    public DashboardViewModel(
        IDeviceDiscoveryService deviceService,
        IAppRepository appRepository,
        IRefreshService refreshService,
        ICredentialStore credentialStore,
        IAppleIdentityService identityService,
        ILogger<DashboardViewModel> logger)
    {
        _deviceService = deviceService;
        _appRepository = appRepository;
        _refreshService = refreshService;
        _credentialStore = credentialStore;
        _identityService = identityService;
        _logger = logger;

        _deviceService.DeviceStateChanged += OnDeviceStateChanged;
    }

    public async Task InitializeAsync()
    {
        CurrentDevice = _deviceService.CurrentDevice;
        UpdateDeviceState(CurrentDevice);
        await ReloadDashboardAsync();
    }

    private void OnDeviceStateChanged(object? sender, IosDevice? device)
    {
        App.Current?.Dispatcher?.Invoke(() =>
        {
            CurrentDevice = device;
            UpdateDeviceState(device);
            _ = ReloadDashboardAsync();
        });
    }

    private void UpdateDeviceState(IosDevice? device)
    {
        if (device != null && device.IsConnected)
        {
            IsDeviceConnected = true;
            DeviceModelText = !string.IsNullOrWhiteSpace(device.FriendlyModelName) ? device.FriendlyModelName : "Apple iPhone";
            IosVersionText = !string.IsNullOrWhiteSpace(device.ProductVersion) ? $"iOS {device.ProductVersion}" : "iOS";
            DeviceUdidText = device.DeviceId;

            if (device.IsLocked)
            {
                DeviceTrustBadge = "⚠️ مقفل برمز المرور";
                DeviceTrustColor = "#F59E0B";
                DeviceStatusText = $"{DeviceModelText} متصل - يرجى فتح قفل الآيفون أولاً";
            }
            else if (!device.IsTrusted)
            {
                DeviceTrustBadge = "⚠️ بانتظار الوثوق";
                DeviceTrustColor = "#F59E0B";
                DeviceStatusText = $"{DeviceModelText} متصل - اضغط على 'الوثوق بهذا الكمبيوتر' من شاشة الهاتف";
            }
            else
            {
                DeviceTrustBadge = "✓ جهاز موثوق ومقترن";
                DeviceTrustColor = "#10B981";
                DeviceStatusText = $"{DeviceModelText} ({IosVersionText}) - متصل وجاهز للتثبيت والتوقيع";
            }
            AddActivityItem("اتصال الجهاز", $"تم الكشف عن {DeviceModelText} ({DeviceTrustBadge})", "📱", DeviceTrustColor);
        }
        else
        {
            IsDeviceConnected = false;
            DeviceModelText = "لا يوجد جهاز متصل";
            IosVersionText = "—";
            DeviceUdidText = "—";
            DeviceTrustBadge = "غير متصل";
            DeviceTrustColor = "#94A3B8";
            DeviceStatusText = "قم بتوصيل جهاز الآيفون عبر كابل USB للبدء بالتوقيع والتثبيت";
        }
    }

    [RelayCommand]
    public async Task ReloadDashboardAsync()
    {
        try
        {
            // 1. Load Managed Apps
            var allApps = await _appRepository.GetAllAppsAsync();
            ManagedAppsList.Clear();
            foreach (var app in allApps)
            {
                ManagedAppsList.Add(app);
            }

            TotalAppsCount = allApps.Count;
            ActiveAppsCount = allApps.Count(a => a.Status == AppLifecycleStatus.Active);
            ExpiringSoonCount = allApps.Count(a => a.Status == AppLifecycleStatus.ExpiringSoon);
            ExpiredCount = allApps.Count(a => a.Status == AppLifecycleStatus.Expired);

            // 2. Load Certificate Information
            string? lastAppleId = await _credentialStore.GetLastAppleIdAsync();
            if (!string.IsNullOrWhiteSpace(lastAppleId))
            {
                ActiveAppleId = lastAppleId;
                string? deviceUdid = CurrentDevice?.DeviceId;
                var identity = await _identityService.GetIdentityForAccountAsync(lastAppleId, deviceUdid);

                if (identity != null && identity.ExpirationDate.HasValue)
                {
                    HasActiveCert = true;
                    ActiveTeamId = identity.TeamId ?? "—";
                    var rem = identity.ExpirationDate.Value - DateTime.UtcNow;
                    int days = Math.Max(0, (int)Math.Ceiling(rem.TotalDays));
                    CertRemainingDays = days;
                    CertDaysPercent = Math.Clamp((days / 7.0) * 100.0, 5, 100);
                    CertExpiryDisplay = $"{identity.ExpirationDate.Value:yyyy-MM-dd HH:mm} (متبقي {days} أيام)";

                    if (rem.TotalSeconds <= 0)
                    {
                        CertStatusBadge = "⚠️ منتهية الصلاحية";
                        CertStatusColor = "#EF4444";
                    }
                    else if (days <= 2)
                    {
                        CertStatusBadge = "⏳ تنتهي قريباً";
                        CertStatusColor = "#F59E0B";
                    }
                    else
                    {
                        CertStatusBadge = "✓ صالحة ونشطة";
                        CertStatusColor = "#10B981";
                    }
                }
                else
                {
                    HasActiveCert = false;
                    CertStatusBadge = "غير مقترنة";
                    CertStatusColor = "#94A3B8";
                    CertExpiryDisplay = "قم بتسجيل الدخول في صفحة التوقيع";
                }
            }
            else
            {
                ActiveAppleId = "لم يتم حفظ حساب بعد";
                HasActiveCert = false;
                CertStatusBadge = "لا يوجد حساب";
                CertStatusColor = "#94A3B8";
                CertExpiryDisplay = "قم بتسجيل الدخول في صفحة التوقيع";
            }

            // 3. Ensure Activity Stream has entries
            if (ActivityItems.Count == 0)
            {
                AddActivityItem("بدء تشغيل SideLink", "تم تجهيز النظام وقاعدة البيانات بنجاح.", "🚀", "#38BDF8");
                if (IsDeviceConnected)
                {
                    AddActivityItem("الجهاز المتصل", $"{DeviceModelText} جاهز ومقترن بنجاح.", "📱", "#10B981");
                }
                if (HasActiveCert)
                {
                    AddActivityItem("شهادة المطور", $"الشهادة نشطة لحساب {ActiveAppleId} ({CertStatusBadge})", "🔑", CertStatusColor);
                }
                if (TotalAppsCount > 0)
                {
                    AddActivityItem("التطبيقات المثبتة", $"يوجد {TotalAppsCount} تطبيقات مدارة عبر SideLink.", "📦", "#818CF8");
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to reload dashboard stats");
        }
    }

    public void AddActivityItem(string title, string details, string icon, string badgeColor)
    {
        App.Current?.Dispatcher?.Invoke(() =>
        {
            ActivityItems.Insert(0, new DashboardActivityItem
            {
                TimeText = DateTime.Now.ToString("HH:mm:ss"),
                Title = title,
                Details = details,
                Icon = icon,
                BadgeColor = badgeColor
            });

            while (ActivityItems.Count > 40)
            {
                ActivityItems.RemoveAt(ActivityItems.Count - 1);
            }

            RecentActivities.Insert(0, $"[{DateTime.Now:HH:mm:ss}] {title} - {details}");
            while (RecentActivities.Count > 40)
            {
                RecentActivities.RemoveAt(RecentActivities.Count - 1);
            }
        });
    }

    [RelayCommand]
    public void CopyUdid()
    {
        if (!string.IsNullOrWhiteSpace(DeviceUdidText) && DeviceUdidText != "—")
        {
            Clipboard.SetText(DeviceUdidText);
            OperationStatusText = "✓ تم نسخ معرف الجهاز (UDID) بنجاح!";
        }
    }

    [RelayCommand]
    public void NavigateTo(string pageName)
    {
        NavigationRequested?.Invoke(pageName);
    }

    [RelayCommand]
    public async Task RefreshAllAppsAsync()
    {
        if (CurrentDevice == null || !CurrentDevice.IsConnected)
        {
            OperationStatusText = "⚠️ يرجى توصيل جهاز الآيفون أولاً لتجديد التطبيقات.";
            return;
        }

        try
        {
            IsRefreshing = true;
            OperationStatusText = "جاري تجديد كافة التطبيقات المستحقة لـ 7 أيام جديدة...";
            AddActivityItem("بدء دورة التجديد", "جاري إعادة توقيع وتجديد كافة التطبيقات المستحقة...", "⚡", "#F59E0B");

            var config = new SigningConfiguration { Method = SigningMethodType.PersonalTeam };
            var refreshed = await _refreshService.RefreshAllEligibleAppsAsync(CurrentDevice, config);

            OperationStatusText = $"✓ اكتمل التجديد بنجاح! تم تجديد {refreshed.Count} تطبيقات.";
            AddActivityItem("اكتمل التجديد", $"تم تجديد {refreshed.Count} تطبيقاً بنجاح.", "✓", "#10B981");
            await ReloadDashboardAsync();
        }
        catch (Exception ex)
        {
            OperationStatusText = "خطأ في التجديد: " + ex.Message;
            AddActivityItem("فشل التجديد", ex.Message, "❌", "#EF4444");
        }
        finally
        {
            IsRefreshing = false;
        }
    }
}
