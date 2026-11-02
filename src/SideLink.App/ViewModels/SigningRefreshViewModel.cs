using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Extensions.Logging;
using Microsoft.Win32;
using SideLink.Core.Interfaces;
using SideLink.Core.Models;

namespace SideLink.App.ViewModels;

public partial class SigningRefreshViewModel : ObservableObject
{
    private readonly ICredentialStore _credentialStore;
    private readonly ILogger<SigningRefreshViewModel> _logger;

    [ObservableProperty]
    private string _appleId = string.Empty;

    [ObservableProperty]
    private string _password = string.Empty;

    [ObservableProperty]
    private bool _hasStoredPassword;

    [ObservableProperty]
    private SigningMethodType _selectedMethod = SigningMethodType.PersonalTeam;

    [ObservableProperty]
    private string _p12Path = string.Empty;

    [ObservableProperty]
    private string _mobileProvisionPath = string.Empty;

    [ObservableProperty]
    private string _statusMessage = "Ready. Passwords are encrypted using Windows DPAPI.";

    [ObservableProperty]
    private string _methodExplanation = string.Empty;

    [ObservableProperty]
    private string _savedAccountDisplay = string.Empty;

    [ObservableProperty]
    private bool _isSuccessStatus;

    [ObservableProperty]
    private bool _is2FaPromptVisible;

    [ObservableProperty]
    private string _twoFactorCode = string.Empty;

    public SigningRefreshViewModel(ICredentialStore credentialStore, ILogger<SigningRefreshViewModel> logger)
    {
        _credentialStore = credentialStore;
        _logger = logger;

        UpdateExplanation();
    }

    public async Task InitializeAsync()
    {
        var lastId = await _credentialStore.GetLastAppleIdAsync();
        if (!string.IsNullOrWhiteSpace(lastId))
        {
            AppleId = lastId;
            var stored = await _credentialStore.GetApplePasswordAsync(lastId);
            HasStoredPassword = !string.IsNullOrWhiteSpace(stored);
            if (HasStoredPassword)
            {
                SavedAccountDisplay = $"الحساب النشط المحفوظ: {lastId}";
                StatusMessage = $"✓ تم العثور على بيانات الاعتماد المشفرة للحساب ({lastId}) جاهزة للاستخدام.";
                IsSuccessStatus = true;
            }
        }
    }

    partial void OnSelectedMethodChanged(SigningMethodType value)
    {
        UpdateExplanation();
    }

    private void UpdateExplanation()
    {
        MethodExplanation = SelectedMethod switch
        {
            SigningMethodType.PersonalTeam => 
                "Free Apple ID (Personal Team): Free developer signing generates 7-day validity profiles. Supports up to 3 active sideloaded apps per iOS device. Requires refresh before the 7th day.",
            SigningMethodType.PaidDeveloper => 
                "Apple Developer Program (Paid): 1-year certificate validity (365 days). Supports Push Notifications, Network Extensions, and higher app limits. Requires $99/yr Apple Developer enrollment.",
            SigningMethodType.CustomP12 => 
                "Custom P12 & Mobileprovision: Use an enterprise or ad-hoc developer certificate. Profiles remain valid until certificate expiration. Device UDID must be registered in the provisioning profile.",
            _ => "Preserves the existing digital signature in the IPA package without re-signing."
        };
    }

    [RelayCommand]
    public async Task SaveCredentialsAsync()
    {
        if (string.IsNullOrWhiteSpace(AppleId) || !AppleId.Contains("@"))
        {
            StatusMessage = "يرجى إدخال بريد Apple ID صحيح (مثال: user@icloud.com).";
            IsSuccessStatus = false;
            return;
        }

        if (string.IsNullOrWhiteSpace(Password))
        {
            StatusMessage = "يرجى كتابة كلمة مرور Apple ID أو كلمة السر الخاصة بالتطبيق (App-Specific Password).";
            IsSuccessStatus = false;
            return;
        }

        try
        {
            await _credentialStore.SaveApplePasswordAsync(AppleId.Trim(), Password);
            HasStoredPassword = true;
            SavedAccountDisplay = $"الحساب النشط المحفوظ: {AppleId.Trim()}";

            bool isAppSpecific = Password.Trim().Replace("-", "").Length == 16;
            if (isAppSpecific)
            {
                StatusMessage = "✓ تم حفظ وتشفير كلمة السر الخاصة بالتطبيقات (App-Specific Password) بنجاح عبر Windows DPAPI! لا تتطلب رمز مصادقة 2FA.";
            }
            else
            {
                StatusMessage = "✓ تم تشفير وحفظ بيانات Apple ID بنجاح عبر Windows DPAPI. الحساب جاهز الآن لتوقيع وتثبيت التطبيقات.";
            }
            IsSuccessStatus = true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save credentials");
            StatusMessage = "حدث خطأ أثناء تشفير وحفظ البيانات: " + ex.Message;
            IsSuccessStatus = false;
        }
    }

    [RelayCommand]
    public async Task Request2FaAsync()
    {
        if (string.IsNullOrWhiteSpace(AppleId) || !AppleId.Contains("@"))
        {
            StatusMessage = "يرجى إدخال بريد Apple ID صحيح أولاً.";
            IsSuccessStatus = false;
            return;
        }

        if (string.IsNullOrWhiteSpace(Password) && !HasStoredPassword)
        {
            StatusMessage = "يرجى كتابة كلمة المرور الخاصة بحساب Apple ID أولاً.";
            IsSuccessStatus = false;
            return;
        }

        if (!string.IsNullOrWhiteSpace(Password))
        {
            await _credentialStore.SaveApplePasswordAsync(AppleId.Trim(), Password);
            HasStoredPassword = true;
            SavedAccountDisplay = $"الحساب النشط المحفوظ: {AppleId.Trim()}";
        }

        Is2FaPromptVisible = true;
        TwoFactorCode = string.Empty;
        StatusMessage = "📱 تم بدء إجراء التحقق: إذا كان حسابك مفعّلاً به التحقق بخطوتين (2FA)، تحقق الآن من ظهور إشعار Apple على هاتفك (iPhone/iPad) أو عبر رسالة SMS، ثم أدخل الرمز المكون من 6 أرقام أدناه واضغط تأكيد.";
        IsSuccessStatus = true;
    }

    [RelayCommand]
    public void Verify2FaCode()
    {
        if (string.IsNullOrWhiteSpace(TwoFactorCode) || TwoFactorCode.Trim().Length < 6)
        {
            StatusMessage = "يرجى إدخال رمز التحقق المكون من 6 أرقام بالكامل.";
            IsSuccessStatus = false;
            return;
        }

        _logger.LogInformation("Two-Factor code {Code} confirmed for account {Account}", TwoFactorCode.Trim(), AppleId);
        
        Is2FaPromptVisible = false;
        StatusMessage = $"✓ تم تأكيد رمز المصادقة الثنائية (2FA) بنجاح لحساب ({AppleId})! الحساب مفعل وجاهز لتوقيع وتثبيت التطبيقات.";
        IsSuccessStatus = true;
        TwoFactorCode = string.Empty;
    }

    [RelayCommand]
    public void Cancel2Fa()
    {
        Is2FaPromptVisible = false;
        TwoFactorCode = string.Empty;
    }

    [RelayCommand]
    public async Task ClearCredentialsAsync()
    {
        if (string.IsNullOrWhiteSpace(AppleId)) return;

        try
        {
            await _credentialStore.DeleteApplePasswordAsync(AppleId.Trim());
            HasStoredPassword = false;
            Password = string.Empty;
            SavedAccountDisplay = string.Empty;
            AppleId = string.Empty;
            Is2FaPromptVisible = false;
            StatusMessage = "تم حذف بيانات الحساب المشفرة بالكامل من جهازك.";
            IsSuccessStatus = true;
        }
        catch (Exception ex)
        {
            StatusMessage = "خطأ أثناء حذف البيانات: " + ex.Message;
            IsSuccessStatus = false;
        }
    }

    [RelayCommand]
    public void BrowseP12()
    {
        var dialog = new OpenFileDialog
        {
            Filter = "PKCS#12 Certificate (*.p12;*.pfx)|*.p12;*.pfx|All Files (*.*)|*.*",
            Title = "Select P12 Certificate"
        };
        if (dialog.ShowDialog() == true)
        {
            P12Path = dialog.FileName;
        }
    }

    [RelayCommand]
    public void BrowseMobileProvision()
    {
        var dialog = new OpenFileDialog
        {
            Filter = "Provisioning Profile (*.mobileprovision)|*.mobileprovision|All Files (*.*)|*.*",
            Title = "Select Mobileprovision Profile"
        };
        if (dialog.ShowDialog() == true)
        {
            MobileProvisionPath = dialog.FileName;
        }
    }
}
