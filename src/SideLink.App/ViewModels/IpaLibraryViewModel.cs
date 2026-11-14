using System.Collections.ObjectModel;
using System.IO;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Extensions.Logging;
using Microsoft.Win32;
using SideLink.Core.Interfaces;
using SideLink.Core.Models;

namespace SideLink.App.ViewModels;

public partial class IpaLibraryViewModel : ObservableObject
{
    private readonly IIpaInspectorService _ipaInspector;
    private readonly ISigningService _signingService;
    private readonly IInstallationService _installationService;
    private readonly IDeviceDiscoveryService _deviceService;
    private readonly ICredentialStore _credentialStore;
    private readonly IAppleIdentityService _identityService;
    private readonly SigningRefreshViewModel _signingRefresh;
    private readonly ILogger<IpaLibraryViewModel> _logger;

    public ObservableCollection<IpaMetadata> LoadedIpas { get; } = new();

    [ObservableProperty]
    private IpaMetadata? _selectedIpa;

    [ObservableProperty]
    private bool _isInspecting;

    [ObservableProperty]
    private bool _isInstalling;

    [ObservableProperty]
    private int _installProgress;

    [ObservableProperty]
    private string _statusMessage = "Select or drag & drop an .ipa file to inspect.";

    [ObservableProperty]
    private bool _hasError;

    [ObservableProperty]
    private string _errorMessage = string.Empty;

    [ObservableProperty]
    private string _targetBundleId = string.Empty;

    [ObservableProperty]
    private string _customDisplayName = string.Empty;

    [ObservableProperty]
    private bool _autoModifyBundleId = true;

    partial void OnSelectedIpaChanged(IpaMetadata? value)
    {
        if (value != null)
        {
            CustomDisplayName = value.EffectiveTitle;
            TargetBundleId = AutoModifyBundleId
                ? GenerateDistinctBundleId(value.BundleIdentifier)
                : value.BundleIdentifier;
        }
        else
        {
            CustomDisplayName = string.Empty;
            TargetBundleId = string.Empty;
        }
    }

    partial void OnAutoModifyBundleIdChanged(bool value)
    {
        if (SelectedIpa != null)
        {
            TargetBundleId = value
                ? GenerateDistinctBundleId(SelectedIpa.BundleIdentifier)
                : SelectedIpa.BundleIdentifier;
        }
    }

    public static string GenerateDistinctBundleId(string originalBundleId)
    {
        if (string.IsNullOrWhiteSpace(originalBundleId))
            return "com.sidelink.app";

        if (originalBundleId.EndsWith(".sidelink", StringComparison.OrdinalIgnoreCase) ||
            originalBundleId.EndsWith(".sl", StringComparison.OrdinalIgnoreCase))
        {
            return originalBundleId;
        }

        return $"{originalBundleId}.sidelink";
    }

    [RelayCommand]
    public void CloneAsSecondInstance()
    {
        if (SelectedIpa == null) return;
        string baseTitle = CleanCloneSuffix(SelectedIpa.EffectiveTitle);
        string baseBundle = CleanCloneSuffix(SelectedIpa.BundleIdentifier);
        CustomDisplayName = $"{baseTitle} 2";
        TargetBundleId = $"{baseBundle}.clone2";
        AutoModifyBundleId = true;
        StatusMessage = $"⚡ تم تفعيل الاستنساخ: سيتم تثبيت ({CustomDisplayName}) كنسخة ثانية معزولة بالكامل دون التأثير على التطبيق الأصلي!";
    }

    [RelayCommand]
    public void CloneAsThirdInstance()
    {
        if (SelectedIpa == null) return;
        string baseTitle = CleanCloneSuffix(SelectedIpa.EffectiveTitle);
        string baseBundle = CleanCloneSuffix(SelectedIpa.BundleIdentifier);
        CustomDisplayName = $"{baseTitle} 3";
        TargetBundleId = $"{baseBundle}.clone3";
        AutoModifyBundleId = true;
        StatusMessage = $"⚡ تم تفعيل الاستنساخ: سيتم تثبيت ({CustomDisplayName}) كنسخة ثالثة معزولة بالكامل!";
    }

    [RelayCommand]
    public void ResetToOriginal()
    {
        if (SelectedIpa == null) return;
        CustomDisplayName = SelectedIpa.EffectiveTitle;
        TargetBundleId = SelectedIpa.BundleIdentifier;
        AutoModifyBundleId = false;
        StatusMessage = $"تمت إعادة ضبط اسم ومعرّف التطبيق للأصل ({SelectedIpa.EffectiveTitle}).";
    }

    private static string CleanCloneSuffix(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return text;
        var trimmed = text.Trim();
        trimmed = System.Text.RegularExpressions.Regex.Replace(trimmed, @"\s+(2|3|\d+)$", "");
        trimmed = System.Text.RegularExpressions.Regex.Replace(trimmed, @"\.(clone\d*|sidelink|sl)$", "", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        return trimmed;
    }

    public IpaLibraryViewModel(
        IIpaInspectorService ipaInspector,
        ISigningService signingService,
        IInstallationService installationService,
        IDeviceDiscoveryService deviceService,
        ICredentialStore credentialStore,
        IAppleIdentityService identityService,
        SigningRefreshViewModel signingRefresh,
        ILogger<IpaLibraryViewModel> logger)
    {
        _ipaInspector = ipaInspector;
        _signingService = signingService;
        _installationService = installationService;
        _deviceService = deviceService;
        _credentialStore = credentialStore;
        _identityService = identityService;
        _signingRefresh = signingRefresh;
        _logger = logger;
    }

    [RelayCommand]
    public async Task InstallSideLinkContainerAsync()
    {
        try
        {
            HasError = false;
            ErrorMessage = string.Empty;

            string[] potentialPaths = 
            [
                Path.Combine(AppContext.BaseDirectory, "Assets", "SideLinkContainer.ipa"),
                Path.Combine(AppContext.BaseDirectory, "SideLinkContainer.ipa"),
                Path.Combine(Directory.GetCurrentDirectory(), "Assets", "SideLinkContainer.ipa"),
                Path.GetFullPath("src/SideLink.App/Assets/SideLinkContainer.ipa"),
                Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "Assets", "SideLinkContainer.ipa")
            ];

            string? containerPath = potentialPaths.FirstOrDefault(File.Exists);

            if (containerPath == null)
            {
                HasError = true;
                ErrorMessage = "لم يتم العثور على ملف SideLinkContainer.ipa في مجلد الأصول. يرجى التأكد من وجوده.";
                StatusMessage = ErrorMessage;
                return;
            }

            StatusMessage = "جاري فحص حزمة SideLink...";
            await LoadIpaFileAsync(containerPath);

            CustomDisplayName = "SideLink";
            TargetBundleId = "com.sidelink.container";
            AutoModifyBundleId = false;

            var device = _deviceService.ConnectedDevices.FirstOrDefault(d => d.IsConnected);
            string? activeAppleId = !string.IsNullOrWhiteSpace(_signingRefresh.AppleId) 
                ? _signingRefresh.AppleId.Trim() 
                : await _credentialStore.GetLastAppleIdAsync();

            bool canAutoInstall = device != null && (
                ((_signingRefresh.SelectedMethod == SigningMethodType.PersonalTeam || _signingRefresh.SelectedMethod == SigningMethodType.PaidDeveloper) && !string.IsNullOrWhiteSpace(activeAppleId)) ||
                (_signingRefresh.SelectedMethod == SigningMethodType.CustomP12 && !string.IsNullOrWhiteSpace(_signingRefresh.P12Path) && File.Exists(_signingRefresh.P12Path))
            );

            if (canAutoInstall)
            {
                StatusMessage = "⚡ تم تجهيز SideLink! جاري التوقيع والتثبيت التلقائي مع تفعيل الشهادة بدون أي خطوات يدوية...";
                await InstallSelectedIpaAsync();
            }
            else
            {
                StatusMessage = "⚡ تم تجهيز SideLink! اضغط الآن على زر 'توقيع وتثبيت التطبيق على الآيفون' في الأسفل للبدء.";
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to prepare SideLink Container");
            HasError = true;
            ErrorMessage = "حدث خطأ أثناء تجهيز الحاوية: " + ex.Message;
            StatusMessage = ErrorMessage;
        }
    }

    [RelayCommand]
    public async Task ExportContainerCertificateAsync()
    {
        await _signingRefresh.ExportCertificatePackageAsync();
    }

    [RelayCommand]
    public async Task BrowseForIpaAsync()
    {
        try
        {
            var dialog = new OpenFileDialog
            {
                Filter = "iOS Application Packages (*.ipa)|*.ipa|All Files (*.*)|*.*",
                Title = "اختر تطبيق الآيفون (Select iOS IPA Archive)"
            };

            var owner = System.Windows.Application.Current?.Windows.OfType<System.Windows.Window>().FirstOrDefault(w => w.IsActive) 
                        ?? System.Windows.Application.Current?.MainWindow;
            bool? result = owner != null ? dialog.ShowDialog(owner) : dialog.ShowDialog();

            if (result == true)
            {
                await LoadIpaFileAsync(dialog.FileName);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to open file dialog");
            HasError = true;
            ErrorMessage = "تعذر فتح نافذة اختيار الملفات: " + ex.Message;
            StatusMessage = ErrorMessage;
        }
    }

    public async Task LoadIpaFileAsync(string filePath)
    {
        if (string.IsNullOrWhiteSpace(filePath) || !File.Exists(filePath))
            return;

        IsInspecting = true;
        HasError = false;
        ErrorMessage = string.Empty;
        StatusMessage = $"جاري فحص حزمة التطبيق: {Path.GetFileName(filePath)}...";

        try
        {
            bool isValid = await _ipaInspector.ValidateIpaArchiveAsync(filePath);
            if (!isValid)
            {
                HasError = true;
                ErrorMessage = "ملف الـ IPA غير صالح أو تالف (مجلد Payload أو Info.plist غير موجود).";
                StatusMessage = ErrorMessage;
                return;
            }

            var metadata = await _ipaInspector.InspectIpaAsync(filePath);
            LoadedIpas.Insert(0, metadata);
            SelectedIpa = metadata;
            StatusMessage = $"تم تحميل {metadata.EffectiveTitle} (الإصدار: {metadata.Version}) بنجاح!";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load IPA {Path}", filePath);
            HasError = true;
            ErrorMessage = "خطأ أثناء فحص التطبيق: " + ex.Message;
            StatusMessage = ErrorMessage;
        }
        finally
        {
            IsInspecting = false;
        }
    }

    [RelayCommand]
    public async Task InstallSelectedIpaAsync()
    {
        if (SelectedIpa == null)
        {
            HasError = true;
            ErrorMessage = "يرجى اختيار أو سحب ملف IPA أولاً للتوقيع والتثبيت.";
            StatusMessage = ErrorMessage;
            return;
        }

        var device = _deviceService.CurrentDevice;
        if (device == null || !device.IsConnected)
        {
            HasError = true;
            ErrorMessage = "لا يوجد هاتف آيفون متصل. يرجى توصيل الآيفون بالكمبيوتر عبر كابل USB.";
            StatusMessage = ErrorMessage;
            return;
        }

        if (device.IsLocked)
        {
            HasError = true;
            ErrorMessage = "الآيفون مقفل برمز مرور. يرجى فتح قفل الهاتف وإعادة المحاولة.";
            StatusMessage = ErrorMessage;
            return;
        }

        if (!device.IsTrusted)
        {
            HasError = true;
            ErrorMessage = "الهاتف غير مقترن. يرجى الضغط على 'الوثوق بهذا الكمبيوتر' على شاشة الآيفون.";
            StatusMessage = ErrorMessage;
            return;
        }

        IsInstalling = true;
        HasError = false;
        InstallProgress = 0;
        StatusMessage = "جاري تحضير توقيع وتثبيت التطبيق على جهازك...";

        var progress = new Progress<AppOperationProgress>(p =>
        {
            App.Current?.Dispatcher?.Invoke(() =>
            {
                InstallProgress = p.PercentComplete;
                StatusMessage = p.CurrentStep;
                if (p.HasError)
                {
                    HasError = true;
                    ErrorMessage = p.ErrorMessage ?? "Operation failed.";
                }
            });
        });

        try
        {
            // 1. Determine signing method and configuration
            var method = _signingRefresh.SelectedMethod;
            string? activeAppleId = !string.IsNullOrWhiteSpace(_signingRefresh.AppleId) 
                ? _signingRefresh.AppleId.Trim() 
                : await _credentialStore.GetLastAppleIdAsync();

            if (method == SigningMethodType.PersonalTeam)
            {
                if (string.IsNullOrWhiteSpace(activeAppleId))
                {
                    HasError = true;
                    ErrorMessage = "لم يتم تحديد أي حساب Apple ID. يرجى التوجه إلى صفحة 'التوقيع والحسابات' لتسجيل الدخول أو اختيار حساب.";
                    StatusMessage = ErrorMessage;
                    return;
                }

                string? targetBundleId = AutoModifyBundleId && !string.IsNullOrWhiteSpace(TargetBundleId) 
                    ? TargetBundleId.Trim() 
                    : (!string.IsNullOrWhiteSpace(TargetBundleId) && TargetBundleId != SelectedIpa?.BundleIdentifier 
                        ? TargetBundleId.Trim() 
                        : SelectedIpa?.BundleIdentifier);

                var identity = await _identityService.GetIdentityForAccountAsync(activeAppleId, device.DeviceId, targetBundleId);
                if (identity == null || !identity.IsReadyToSign || identity.IsExpired)
                {
                    identity = await _identityService.AutoConfigureIdentityForAccountAsync(activeAppleId, device.DeviceId, targetBundleId);
                }

                if (identity == null || string.IsNullOrWhiteSpace(identity.P12Path) || !File.Exists(identity.P12Path))
                {
                    HasError = true;
                    ErrorMessage = $"لم يتم العثور على شهادة توقيع ومفتاح خاص (P12) لحساب ({activeAppleId}). يرجى التحقق من تسجيل الحساب أو استيراد ملف P12 من صفحة 'التوقيع والحسابات'.";
                    StatusMessage = ErrorMessage;
                    return;
                }

                if (identity.IsExpired)
                {
                    HasError = true;
                    ErrorMessage = $"⚠️ ملف تعريف التثبيت (Mobileprovision) لحساب ({activeAppleId}) انتهت صلاحيته بتاريخ ({identity.ExpirationDate:yyyy-MM-dd HH:mm}). يرجى إعادة تسجيل الدخول في صفحة 'التوقيع والحسابات' لتجديد الشهادة تلقائياً.";
                    StatusMessage = ErrorMessage;
                    return;
                }
            }
            else if (method == SigningMethodType.CustomP12)
            {
                if (string.IsNullOrWhiteSpace(_signingRefresh.P12Path) || !File.Exists(_signingRefresh.P12Path))
                {
                    HasError = true;
                    ErrorMessage = "لم يتم تحديد ملف شهادة P12 صالح. انتقل إلى صفحة 'التوقيع والحسابات' واختر ملف الشهادة (P12).";
                    StatusMessage = ErrorMessage;
                    return;
                }

                if (string.IsNullOrWhiteSpace(_signingRefresh.MobileProvisionPath) || !File.Exists(_signingRefresh.MobileProvisionPath))
                {
                    HasError = true;
                    ErrorMessage = "لم يتم تحديد ملف تعريف التثبيت (Mobileprovision) صالح. انتقل إلى صفحة 'التوقيع والحسابات' واختر الملف.";
                    StatusMessage = ErrorMessage;
                    return;
                }
            }

            var config = new SigningConfiguration 
            { 
                Method = method,
                AppleId = activeAppleId ?? string.Empty,
                P12Path = _signingRefresh.P12Path,
                P12Password = _signingRefresh.P12Password,
                MobileProvisionPath = _signingRefresh.MobileProvisionPath,
                CustomBundleId = AutoModifyBundleId && !string.IsNullOrWhiteSpace(TargetBundleId) 
                    ? TargetBundleId.Trim() 
                    : (!string.IsNullOrWhiteSpace(TargetBundleId) && TargetBundleId != SelectedIpa?.BundleIdentifier 
                        ? TargetBundleId.Trim() 
                        : null),
                ModifyBundleId = AutoModifyBundleId,
                CustomDisplayName = !string.IsNullOrWhiteSpace(CustomDisplayName)
                    ? CustomDisplayName.Trim()
                    : null
            };
            string signedIpa = await _signingService.SignIpaAsync(SelectedIpa.FilePath, config, device, progress);

            // 2. Install
            bool success = await _installationService.InstallIpaAsync(signedIpa, device, progress);
            if (success)
            {
                StatusMessage = $"✓ تم تثبيت {SelectedIpa.EffectiveTitle} بنجاح على جهاز الآيفون!";
                HasError = false;
                ErrorMessage = string.Empty;
            }
            else
            {
                HasError = true;
                if (!string.IsNullOrWhiteSpace(ErrorMessage) && ErrorMessage != "Operation failed.")
                {
                    StatusMessage = ErrorMessage;
                }
                else
                {
                    StatusMessage = "فشل تثبيت التطبيق على جهاز الآيفون.";
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Installation process failed");
            HasError = true;
            ErrorMessage = ex.Message;
            StatusMessage = "❌ فشل التثبيت: " + ex.Message;
        }
        finally
        {
            IsInstalling = false;
        }
    }

    [RelayCommand]
    public void RemoveFromLibrary(IpaMetadata? ipa)
    {
        if (ipa != null)
        {
            LoadedIpas.Remove(ipa);
            if (SelectedIpa == ipa)
                SelectedIpa = LoadedIpas.FirstOrDefault();
        }
    }
}
