using System;
using System.Diagnostics;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Extensions.Logging;
using SideLink.Core.Interfaces;
using SideLink.Core.Models;

namespace SideLink.App.ViewModels;

public partial class MobileCompanionViewModel : ObservableObject
{
    private readonly IMobileCompanionService _companionService;
    private readonly IDeviceDiscoveryService _deviceService;
    private readonly ICredentialStore _credentialStore;
    private readonly ILogger<MobileCompanionViewModel> _logger;

    [ObservableProperty]
    private bool _isDeviceConnected;

    [ObservableProperty]
    private string _deviceName = "لا يوجد جهاز متصل";

    [ObservableProperty]
    private string _deviceModel = string.Empty;

    [ObservableProperty]
    private string _deviceUdid = string.Empty;

    [ObservableProperty]
    private string _iosVersion = string.Empty;

    [ObservableProperty]
    private bool _isPairingFound;

    [ObservableProperty]
    private string _pairingFileStatus = "يرجى توصيل الآيفون للتحقق من ملف الاقتران";

    [ObservableProperty]
    private bool _isInstalling;

    [ObservableProperty]
    private int _progressPercentage;

    [ObservableProperty]
    private string _progressMessage = string.Empty;

    [ObservableProperty]
    private bool _isSuccess;

    [ObservableProperty]
    private bool _hasError;

    [ObservableProperty]
    private string _errorMessage = string.Empty;

    [ObservableProperty]
    private string _wireGuardConfigText = string.Empty;

    [ObservableProperty]
    private string _cloudPortalUrl = "https://www.sidelinktool.me/mobile";

    [ObservableProperty]
    private string _anisetteServerUrl = "https://www.sidelinktool.me/api/mobile/anisette";

    public MobileCompanionViewModel(
        IMobileCompanionService companionService,
        IDeviceDiscoveryService deviceService,
        ICredentialStore credentialStore,
        ILogger<MobileCompanionViewModel> logger)
    {
        _companionService = companionService;
        _deviceService = deviceService;
        _credentialStore = credentialStore;
        _logger = logger;

        WireGuardConfigText = _companionService.GenerateWireGuardConfig();

        _deviceService.DeviceStateChanged += (s, device) =>
        {
            Application.Current?.Dispatcher?.Invoke(() => UpdateDeviceInfo(device));
        };

        UpdateDeviceInfo(_deviceService.CurrentDevice);
    }

    public void UpdateDeviceInfo(IosDevice? device)
    {
        if (device != null && device.IsConnected)
        {
            IsDeviceConnected = true;
            DeviceName = device.DeviceName;
            DeviceModel = device.FriendlyModelName;
            DeviceUdid = device.DeviceId;
            IosVersion = device.ProductVersion;

            var pairing = _companionService.DetectPairingFile(device.DeviceId);
            if (pairing.Exists)
            {
                IsPairingFound = true;
                PairingFileStatus = $"✓ ملف اقتران الآيفون جاهز على الكمبيوتر ({pairing.FileSizeBytes:N0} بايت)";
            }
            else
            {
                IsPairingFound = false;
                PairingFileStatus = "⚠️ لم يتم العثور على ملف اقتران الجهاز. افتح قفل الآيفون واضغط 'وثوق'.";
            }
        }
        else
        {
            IsDeviceConnected = false;
            DeviceName = "لا يوجد جهاز متصل حالياً";
            DeviceModel = string.Empty;
            DeviceUdid = string.Empty;
            IosVersion = string.Empty;
            IsPairingFound = false;
            PairingFileStatus = "يرجى توصيل الآيفون بكابل USB أولاً";
        }
    }

    [RelayCommand]
    public async Task InstallCompanionAsync()
    {
        if (IsInstalling) return;

        var device = _deviceService.CurrentDevice;
        if (device == null || !device.IsConnected)
        {
            HasError = true;
            ErrorMessage = "يجب توصيل جهاز الآيفون بكابل USB أولاً للقيام بالتثبيت الأولي.";
            return;
        }

        string? appleId = await _credentialStore.GetLastAppleIdAsync();
        if (string.IsNullOrWhiteSpace(appleId))
        {
            var savedAccounts = await _credentialStore.GetAllSavedAppleIdsAsync();
            if (savedAccounts.Count > 0)
            {
                appleId = savedAccounts[0];
            }
        }

        if (string.IsNullOrWhiteSpace(appleId))
        {
            HasError = true;
            ErrorMessage = "يرجى تسجيل الدخول بحساب Apple أولاً من صفحة 'التوقيع والحسابات'.";
            return;
        }

        IsInstalling = true;
        HasError = false;
        IsSuccess = false;
        ErrorMessage = string.Empty;
        ProgressPercentage = 5;
        ProgressMessage = "بدء تجهيز SideLink Mobile...";

        var progress = new Progress<AppOperationProgress>(p =>
        {
            Application.Current?.Dispatcher?.Invoke(() =>
            {
                ProgressPercentage = p.PercentComplete;
                ProgressMessage = p.CurrentStep;
                if (p.HasError)
                {
                    HasError = true;
                    ErrorMessage = p.ErrorMessage ?? p.CurrentStep;
                }
            });
        });

        try
        {
            bool ok = await _companionService.PrepareAndInstallCompanionAsync(device, appleId, progress);
            if (ok)
            {
                IsSuccess = true;
                ProgressPercentage = 100;
                ProgressMessage = "🎉 تم تثبيت SideLink Mobile على جهازك بنجاح! يمكنك الآن التجديد من الهاتف مباشرة.";
            }
            else
            {
                HasError = true;
                if (string.IsNullOrEmpty(ErrorMessage))
                {
                    ErrorMessage = "فشلت عملية التثبيت. يرجى التحقق من اتصال الهاتف وتسجيل الحساب.";
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Companion installation failed");
            HasError = true;
            ErrorMessage = $"حدث خطأ: {ex.Message}";
        }
        finally
        {
            IsInstalling = false;
        }
    }

    [RelayCommand]
    public async Task SyncPairingCloudAsync()
    {
        var device = _deviceService.CurrentDevice;
        if (device == null || !device.IsConnected)
        {
            MessageBox.Show("يرجى توصيل الآيفون أولاً لمزامنة ملف الاقتران.", "تنبيه", MessageBoxButton.OK, MessageBoxImage.Information);
            return;
        }

        string appleId = await _credentialStore.GetLastAppleIdAsync() ?? "user@sidelink.app";
        var res = await _companionService.SyncPairingToCloudAsync(device.DeviceId, device.DeviceName, appleId);

        if (res.Success)
        {
            MessageBox.Show($"✓ تمت مزامنة ملف الاقتران بنجاح مع السحابة!\n\nرابط التحميل المباشر:\n{res.DownloadUrl}\n\nيمكنك الآن فتح هذا الرابط على الآيفون واستيراد الملف مباشرة في تطبيق SideLink.", "نجحت المزامنة", MessageBoxButton.OK, MessageBoxImage.Information);
        }
        else
        {
            MessageBox.Show($"فشلت المزامنة: {res.Message}", "خطأ في المزامنة", MessageBoxButton.OK, MessageBoxImage.Warning);
        }
    }

    [RelayCommand]
    public void CopyWireGuardConfig()
    {
        try
        {
            Clipboard.SetText(WireGuardConfigText);
            MessageBox.Show("تم نسخ إعدادات WireGuard VPN إلى الحافظة بنجاح!", "تم النسخ", MessageBoxButton.OK, MessageBoxImage.Information);
        }
        catch (Exception ex)
        {
            MessageBox.Show($"تعذر النسخ: {ex.Message}", "خطأ", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    [RelayCommand]
    public void SaveWireGuardConfigFile()
    {
        try
        {
            string desktopDir = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
            string targetPath = Path.Combine(desktopDir, "SideLink-Loopback.conf");
            File.WriteAllText(targetPath, WireGuardConfigText);
            MessageBox.Show($"تم حفظ ملف الإعدادات على سطح المكتب باسم:\n{targetPath}\n\nيمكنك إرساله إلى الآيفون عبر AirDrop أو مشاركته مع تطبيق WireGuard.", "تم الحفظ", MessageBoxButton.OK, MessageBoxImage.Information);
        }
        catch (Exception ex)
        {
            MessageBox.Show($"تعذر حفظ الملف: {ex.Message}", "خطأ", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    [RelayCommand]
    public void OpenCloudPortal()
    {
        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = CloudPortalUrl,
                UseShellExecute = true
            });
        }
        catch { }
    }
}
