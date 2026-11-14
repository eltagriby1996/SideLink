using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Windows;
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
    private readonly IAppleAuthService _appleAuthService;
    private readonly IAppleIdentityService _identityService;
    private readonly IDeviceDiscoveryService _deviceService;
    private readonly ILogger<SigningRefreshViewModel> _logger;

    public System.Collections.ObjectModel.ObservableCollection<string> DiscoveredAccounts { get; } = new();

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
    private string _p12Password = "sidelink";

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

    [ObservableProperty]
    private bool _isValidating;

    [ObservableProperty]
    private bool _hasActiveCertificate;

    [ObservableProperty]
    private string _certificateSubject = string.Empty;

    [ObservableProperty]
    private string _teamId = string.Empty;

    [ObservableProperty]
    private string _expirationDisplay = string.Empty;

    [ObservableProperty]
    private bool _isDeviceProvisioned;

    [ObservableProperty]
    private string _provisioningStatusDisplay = string.Empty;

    public SigningRefreshViewModel(
        ICredentialStore credentialStore,
        IAppleAuthService appleAuthService,
        IAppleIdentityService identityService,
        IDeviceDiscoveryService deviceService,
        ILogger<SigningRefreshViewModel> logger)
    {
        _credentialStore = credentialStore;
        _appleAuthService = appleAuthService;
        _identityService = identityService;
        _deviceService = deviceService;
        _logger = logger;

        UpdateExplanation();
    }

    public async Task RefreshSavedAccountsListAsync()
    {
        try
        {
            var saved = await _credentialStore.GetAllSavedAppleIdsAsync();
            App.Current.Dispatcher.Invoke(() =>
            {
                DiscoveredAccounts.Clear();
                foreach (var acc in saved)
                {
                    DiscoveredAccounts.Add(acc);
                }
            });
        }
        catch { }
    }

    public async Task InitializeAsync()
    {
        // 1. Load accounts strictly saved in SideLink's own DPAPI store
        await RefreshSavedAccountsListAsync();

        // 2. Check last stored account
        var lastId = await _credentialStore.GetLastAppleIdAsync();
        if (string.IsNullOrWhiteSpace(lastId) && DiscoveredAccounts.Count > 0)
        {
            lastId = DiscoveredAccounts[0];
        }

        if (!string.IsNullOrWhiteSpace(lastId))
        {
            AppleId = lastId;
            var stored = await _credentialStore.GetApplePasswordAsync(lastId);
            HasStoredPassword = !string.IsNullOrWhiteSpace(stored);
            if (HasStoredPassword)
            {
                SavedAccountDisplay = $"الحساب النشط: {lastId}";
                StatusMessage = $"✓ تم استرجاع وتفعيل بيانات الحساب ({lastId}) بنجاح.";
                IsSuccessStatus = true;
            }

            await RefreshCertificateStatusAsync();
        }
        else
        {
            HasStoredPassword = false;
            SavedAccountDisplay = string.Empty;
            StatusMessage = "جاهز. قم بتسجيل الدخول بحساب Apple ID أو إدخال كلمة سر التطبيقات.";
            IsSuccessStatus = true;
        }
    }

    [RelayCommand]
    public async Task SelectDiscoveredAccountAsync(string? account)
    {
        if (string.IsNullOrWhiteSpace(account)) return;
        AppleId = account.Trim();
        var stored = await _credentialStore.GetApplePasswordAsync(AppleId);
        HasStoredPassword = !string.IsNullOrWhiteSpace(stored);
        if (HasStoredPassword)
        {
            SavedAccountDisplay = $"الحساب النشط: {AppleId}";
            StatusMessage = $"✓ تم تفعيل الحساب ({AppleId}) بنجاح.";
            IsSuccessStatus = true;
        }
        await RefreshCertificateStatusAsync();
    }

    [RelayCommand]
    public async Task RefreshCertificateStatusAsync()
    {
        if (string.IsNullOrWhiteSpace(AppleId)) return;

        string deviceUdid = _deviceService.CurrentDevice?.DeviceId ?? "00008020-000E6D583C30003A";
        var identity = await _identityService.GetIdentityForAccountAsync(AppleId, deviceUdid);
        if (identity == null || !identity.IsReadyToSign)
        {
            identity = await _identityService.AutoConfigureIdentityForAccountAsync(AppleId, deviceUdid);
        }

        if (identity != null && identity.IsReadyToSign)
        {
            HasActiveCertificate = true;
            CertificateSubject = identity.CertificateSubject ?? $"iPhone Developer: {AppleId}";
            TeamId = identity.TeamId ?? "NHDYBV5658";
            ExpirationDisplay = identity.ExpirationDate?.ToString("yyyy-MM-dd HH:mm") ?? "Active (7-day)";
            IsDeviceProvisioned = identity.IsMatchingCurrentDevice;
            MobileProvisionPath = identity.MobileProvisionPath ?? string.Empty;
            if (!string.IsNullOrEmpty(identity.P12Path))
            {
                P12Path = identity.P12Path;
            }

            ProvisioningStatusDisplay = IsDeviceProvisioned 
                ? $"✓ شهادة مطور iOS صالحة ومقترنة بجهازك المتصل ({deviceUdid})" 
                : $"⚠️ الشهادة متوفرة ولكن يجب إضافة جهازك ({deviceUdid}) إلى ملف التخصيص";
        }
        else
        {
            HasActiveCertificate = false;
            if (identity != null && identity.IsExpired)
            {
                CertificateSubject = identity.CertificateSubject ?? $"iPhone Developer: {AppleId}";
                TeamId = identity.TeamId ?? "—";
                ExpirationDisplay = identity.ExpirationDate?.ToString("yyyy-MM-dd HH:mm") ?? "منتهية الصلاحية";
                IsDeviceProvisioned = identity.IsMatchingCurrentDevice;
                ProvisioningStatusDisplay = $"⚠️ ملف تعريف التثبيت (Mobileprovision) انتهت صلاحيته بتاريخ ({ExpirationDisplay}).\n" +
                                            "صلاحية حسابات المطور المجانية 7 أيام فقط. اضغط على زر تسجيل الدخول (Sign-In & 2FA) أدناه لتجديد الشهادة تلقائياً لمدة 7 أيام جديدة.";
            }
            else
            {
                CertificateSubject = string.Empty;
                TeamId = string.Empty;
                ExpirationDisplay = string.Empty;
                IsDeviceProvisioned = false;
                ProvisioningStatusDisplay = $"لم يتم العثور على شهادة توقيع (P12) أو ملف تعريف لهذا الحساب ({AppleId}).\n" +
                                            "قم بتسجيل الدخول أو استيراد ملف P12 و Mobileprovision لتفعيل التوقيع.";
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
        await AuthenticateAndSaveAccountAsync();
    }

    [RelayCommand]
    public async Task Request2FaAsync()
    {
        await AuthenticateAndSaveAccountAsync();
    }

    private async Task AuthenticateAndSaveAccountAsync()
    {
        if (string.IsNullOrWhiteSpace(AppleId) || !AppleId.Contains("@"))
        {
            StatusMessage = "يرجى إدخال بريد Apple ID صحيح أولاً (مثال: user@icloud.com).";
            IsSuccessStatus = false;
            return;
        }

        string effectivePassword = Password;
        if (string.IsNullOrWhiteSpace(effectivePassword) && HasStoredPassword)
        {
            effectivePassword = await _credentialStore.GetApplePasswordAsync(AppleId.Trim()) ?? string.Empty;
        }

        if (string.IsNullOrWhiteSpace(effectivePassword))
        {
            StatusMessage = "يرجى كتابة كلمة مرور Apple ID أو كلمة السر الخاصة بالتطبيق (App-Specific Password).";
            IsSuccessStatus = false;
            return;
        }

        IsValidating = true;
        StatusMessage = "جاري الاتصال بخوادم Apple للتحقق من بيانات الحساب...";
        IsSuccessStatus = true;

        try
        {
            var authResult = await _appleAuthService.AuthenticateAsync(AppleId.Trim(), effectivePassword);

            if (authResult.Requires2Fa)
            {
                Is2FaPromptVisible = true;
                TwoFactorCode = string.Empty;
                StatusMessage = authResult.Message;
                IsSuccessStatus = true;
            }
            else if (authResult.Success)
            {
                await _credentialStore.SaveApplePasswordAsync(AppleId.Trim(), effectivePassword);
                HasStoredPassword = true;
                SavedAccountDisplay = $"الحساب النشط المحفوظ: {AppleId.Trim()}";
                Is2FaPromptVisible = false;

                await RefreshSavedAccountsListAsync();

                string deviceUdid = _deviceService.CurrentDevice?.DeviceId ?? "00008020-000E6D583C30003A";
                await _identityService.AutoConfigureIdentityForAccountAsync(AppleId.Trim(), deviceUdid);
                await RefreshCertificateStatusAsync();

                var identity = await _identityService.GetIdentityForAccountAsync(AppleId.Trim(), deviceUdid);
                if (identity != null && identity.IsReadyToSign && !identity.IsExpired)
                {
                    StatusMessage = "✓ تم تسجيل الدخول بنجاح! تم ربط شهادة التوقيع والحساب جاهز لتوقيع وتثبيت التطبيقات.";
                    IsSuccessStatus = true;
                }
                else if (identity != null && identity.IsExpired)
                {
                    StatusMessage = $"⚠️ تم تسجيل الدخول بنجاح، ولكن شهادة المطور المجانية لهذا الحساب منتهية الصلاحية منذ ({identity.ExpirationDate:yyyy-MM-dd}).\nيرجى تجديد الحساب أو استيراد شهادة P12 مخصصة صالحة من الأسفل.";
                    IsSuccessStatus = false;
                }
                else
                {
                    StatusMessage = $"✓ تم تسجيل الدخول والتحقق بنجاح لدى Apple!\nولكن لم يتم العثور على ملف تعريف أو شهادة P12 لهذا الحساب ({AppleId.Trim()}) محلياً.\nيمكنك استيراد شهادة P12 وملف Mobileprovision من بطاقة (شهادة P12 مخصصة) أدناه للبدء بالتوقيع فوراً.";
                    IsSuccessStatus = true;
                }
            }
            else
            {
                Is2FaPromptVisible = false;
                StatusMessage = authResult.Message;
                IsSuccessStatus = false;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Authentication failure for {Account}", AppleId);
            StatusMessage = "حدث خطأ أثناء محاولة الاتصال بخوادم Apple: " + ex.Message;
            IsSuccessStatus = false;
        }
        finally
        {
            IsValidating = false;
        }
    }

    [RelayCommand]
    public async Task Verify2FaCodeAsync()
    {
        if (string.IsNullOrWhiteSpace(TwoFactorCode) || TwoFactorCode.Trim().Length < 6)
        {
            StatusMessage = "يرجى إدخال رمز التحقق المكون من 6 أرقام بالكامل.";
            IsSuccessStatus = false;
            return;
        }

        IsValidating = true;
        StatusMessage = "جاري إرسال وتأكيد رمز 2FA مع خوادم Apple...";

        try
        {
            var result = await _appleAuthService.VerifyTwoFactorCodeAsync(AppleId.Trim(), TwoFactorCode.Trim());
            if (result.Success)
            {
                string effectivePassword = Password;
                if (string.IsNullOrWhiteSpace(effectivePassword) && HasStoredPassword)
                {
                    effectivePassword = await _credentialStore.GetApplePasswordAsync(AppleId.Trim()) ?? string.Empty;
                }

                if (!string.IsNullOrWhiteSpace(effectivePassword))
                {
                    await _credentialStore.SaveApplePasswordAsync(AppleId.Trim(), effectivePassword);
                    HasStoredPassword = true;
                    SavedAccountDisplay = $"الحساب النشط المحفوظ: {AppleId.Trim()}";
                }

                await RefreshSavedAccountsListAsync();

                Is2FaPromptVisible = false;
                TwoFactorCode = string.Empty;

                string deviceUdid = _deviceService.CurrentDevice?.DeviceId ?? "00008020-000E6D583C30003A";
                await _identityService.AutoConfigureIdentityForAccountAsync(AppleId.Trim(), deviceUdid);
                await RefreshCertificateStatusAsync();

                var identity = await _identityService.GetIdentityForAccountAsync(AppleId.Trim(), deviceUdid);
                if (identity != null && identity.IsReadyToSign && !identity.IsExpired)
                {
                    StatusMessage = "✓ تم تأكيد رمز التحقق (2FA) بنجاح! تم ربط شهادة التوقيع والحساب جاهز لتوقيع وتثبيت التطبيقات.";
                    IsSuccessStatus = true;
                }
                else
                {
                    StatusMessage = $"✓ تم تأكيد رمز التحقق (2FA) بنجاح لدى Apple!\nولكن لم يتم العثور على ملف تعريف أو شهادة P12 لهذا الحساب ({AppleId.Trim()}) محلياً.\nيرجى استيراد شهادة P12 وملف Mobileprovision من بطاقة (شهادة P12 مخصصة) أدناه لتفعيل التوقيع.";
                    IsSuccessStatus = true;
                }
            }
            else
            {
                StatusMessage = result.Message;
                IsSuccessStatus = false;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to verify 2FA code with Apple");
            StatusMessage = "خطأ أثناء التحقق من الرمز: " + ex.Message;
            IsSuccessStatus = false;
        }
        finally
        {
            IsValidating = false;
        }
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
            string removed = AppleId.Trim();
            await _credentialStore.DeleteApplePasswordAsync(removed);
            await RefreshSavedAccountsListAsync();

            if (DiscoveredAccounts.Count > 0)
            {
                await SelectDiscoveredAccountAsync(DiscoveredAccounts[0]);
            }
            else
            {
                HasStoredPassword = false;
                Password = string.Empty;
                SavedAccountDisplay = string.Empty;
                AppleId = string.Empty;
                Is2FaPromptVisible = false;
                HasActiveCertificate = false;
                ProvisioningStatusDisplay = string.Empty;
            }

            StatusMessage = $"✓ تم مسح بيانات الحساب ({removed}) بالكامل من SideLink.";
            IsSuccessStatus = true;
        }
        catch (Exception ex)
        {
            StatusMessage = "خطأ أثناء مسح البيانات: " + ex.Message;
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

    [RelayCommand]
    public void SaveCustomP12()
    {
        if (string.IsNullOrWhiteSpace(P12Path) || !File.Exists(P12Path))
        {
            StatusMessage = "يرجى اختيار ملف الشهادة (P12) الصالح أولاً.";
            IsSuccessStatus = false;
            return;
        }

        if (string.IsNullOrWhiteSpace(MobileProvisionPath) || !File.Exists(MobileProvisionPath))
        {
            StatusMessage = "يرجى اختيار ملف التثبيت (Mobileprovision) الصالح أولاً.";
            IsSuccessStatus = false;
            return;
        }

        SelectedMethod = SigningMethodType.CustomP12;
        HasActiveCertificate = true;
        CertificateSubject = $"Custom P12: {Path.GetFileName(P12Path)}";
        ExpirationDisplay = "شهادة مخصصة نشطة";
        ProvisioningStatusDisplay = $"✓ تم اعتماد الشهادة المخصصة ({Path.GetFileName(P12Path)}) بنجاح! جاهز للتوقيع والتثبيت.";
        StatusMessage = ProvisioningStatusDisplay;
        IsSuccessStatus = true;
    }

    [RelayCommand]
    public async Task ExportCertificatePackageAsync()
    {
        try
        {
            // 1. Try to ensure we have the active identity
            if (string.IsNullOrWhiteSpace(P12Path) || !File.Exists(P12Path) ||
                string.IsNullOrWhiteSpace(MobileProvisionPath) || !File.Exists(MobileProvisionPath))
            {
                await RefreshCertificateStatusAsync();
            }

            string? p12Source = P12Path;
            string? mobileProvisionSource = MobileProvisionPath;
            string p12Password = !string.IsNullOrWhiteSpace(P12Password) ? P12Password : "sidelink";

            // If still missing and we have an AppleId, try auto-configuring
            if ((string.IsNullOrWhiteSpace(p12Source) || !File.Exists(p12Source) ||
                 string.IsNullOrWhiteSpace(mobileProvisionSource) || !File.Exists(mobileProvisionSource)) &&
                !string.IsNullOrWhiteSpace(AppleId))
            {
                string deviceUdid = _deviceService.CurrentDevice?.DeviceId ?? "00008020-000E6D583C30003A";
                var identity = await _identityService.AutoConfigureIdentityForAccountAsync(AppleId.Trim(), deviceUdid);
                if (identity != null && identity.IsReadyToSign)
                {
                    p12Source = identity.P12Path;
                    mobileProvisionSource = identity.MobileProvisionPath;
                    P12Path = p12Source ?? string.Empty;
                    MobileProvisionPath = mobileProvisionSource ?? string.Empty;
                }
            }

            if (string.IsNullOrWhiteSpace(p12Source) || !File.Exists(p12Source))
            {
                MessageBox.Show(
                    "لم يتم العثور على ملف شهادة (P12) جاهز للتصدير.\n\nيرجى تسجيل الدخول بحساب Apple ID في صفحة 'التوقيع والحسابات' لتوليد الشهادة تلقائياً، أو استيراد ملف P12 مخصص.",
                    "تصدير شهادة SideLink",
                    MessageBoxButton.OK,
                    MessageBoxImage.Warning);
                StatusMessage = "⚠️ لم يتم العثور على شهادة P12 لتصديرها. سجل الدخول أولاً.";
                IsSuccessStatus = false;
                return;
            }

            if (string.IsNullOrWhiteSpace(mobileProvisionSource) || !File.Exists(mobileProvisionSource))
            {
                MessageBox.Show(
                    "لم يتم العثور على ملف تعريف التثبيت (Mobileprovision) الخاص بجهازك.\n\nيرجى توصيل جهاز الآيفون بالكمبيوتر والتأكد من تسجيل الحساب لإنشاء ملف التعريف.",
                    "تصدير شهادة SideLink",
                    MessageBoxButton.OK,
                    MessageBoxImage.Warning);
                StatusMessage = "⚠️ لم يتم العثور على ملف التعريف (Mobileprovision).";
                IsSuccessStatus = false;
                return;
            }

            // 2. Prompt user for save location
            string defaultName = string.IsNullOrWhiteSpace(AppleId)
                ? "SideLink_Certificate_Package.zip"
                : $"SideLink_Certificate_{SanitizeFileName(AppleId.Split('@')[0])}.zip";

            var saveDialog = new SaveFileDialog
            {
                Title = "تصدير حزمة شهادة SideLink Container",
                Filter = "حزمة ملفات مضغوطة (*.zip)|*.zip|جميع الملفات (*.*)|*.*",
                FileName = defaultName
            };

            var owner = System.Windows.Application.Current?.Windows.OfType<System.Windows.Window>().FirstOrDefault(w => w.IsActive)
                        ?? System.Windows.Application.Current?.MainWindow;
            bool? result = owner != null ? saveDialog.ShowDialog(owner) : saveDialog.ShowDialog();

            if (result != true || string.IsNullOrWhiteSpace(saveDialog.FileName))
            {
                return;
            }

            string zipDestination = saveDialog.FileName;
            string destinationFolder = Path.Combine(
                Path.GetDirectoryName(zipDestination) ?? string.Empty,
                Path.GetFileNameWithoutExtension(zipDestination));

            Directory.CreateDirectory(destinationFolder);

            // 3. Prepare loose files inside folder
            string destP12 = Path.Combine(destinationFolder, "SideLink_Certificate.p12");
            string destProfile = Path.Combine(destinationFolder, "SideLink_Profile.mobileprovision");
            string destReadme = Path.Combine(destinationFolder, "تعليمات_استيراد_الشهادة_في_الحاوية.txt");

            File.Copy(p12Source, destP12, true);
            File.Copy(mobileProvisionSource, destProfile, true);

            string accountDisplay = !string.IsNullOrWhiteSpace(AppleId) ? AppleId : "مطور مخصص";
            string teamDisplay = !string.IsNullOrWhiteSpace(TeamId) ? TeamId : "—";
            string expDisplay = !string.IsNullOrWhiteSpace(ExpirationDisplay) ? ExpirationDisplay : "Active";

            string readmeContent = 
$@"======================================================================
تعليمات استيراد شهادة المطور داخل تطبيق SideLink Container على الآيفون
======================================================================

🔑 كلمة مرور ملف الشهادة (P12 Password):
{p12Password}

📋 بيانات الشهادة:
- الحساب / المطور: {accountDisplay}
- معرّف الفريق (Team ID): {teamDisplay}
- تاريخ الانتهاء والصلاحية: {expDisplay}

----------------------------------------------------------------------
📱 خطوات الاستيراد والتفعيل داخل الآيفون:
----------------------------------------------------------------------
1. قم بنقل الملفات التالية إلى جهاز الآيفون الخاص بك:
   - SideLink_Certificate.p12
   - SideLink_Profile.mobileprovision
   (يمكنك إرسالها لنفسك عبر تيليجرام Saved Messages أو AirDrop أو حفظها في تطبيق الملفات Files).

2. افتح تطبيق SideLink Container على شاشة الآيفون.

3. اضغط على أيقونة الإعدادات (Settings / الترس في الأسفل).

4. اضغط على خيار استيراد الشهادة (Import Certificate / P12):
   - اختر ملف: SideLink_Certificate.p12
   - اكتب كلمة المرور: {p12Password}

5. اضغط على خيار استيراد ملف التعريف (Import Mobileprovision):
   - اختر ملف: SideLink_Profile.mobileprovision

✅ مبروك! أصبحت الحاوية مفعلة بنجاح وجاهزة لتشغيل عدد لا نهائي من التطبيقات والألعاب المعدلة للأبد دون توقف وبدون قيود!
----------------------------------------------------------------------
SideLink Engine © برمجة وتطوير Ahmed Monged
الموقع الرسمي: https://sidelinktool.me
قناة التليجرام: https://t.me/sidelink_channel
======================================================================
";
            File.WriteAllText(destReadme, readmeContent, System.Text.Encoding.UTF8);

            // 4. Create ZIP archive
            if (File.Exists(zipDestination))
            {
                File.Delete(zipDestination);
            }
            ZipFile.CreateFromDirectory(destinationFolder, zipDestination);

            // 5. Open Explorer with the exported folder / zip selected
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = "explorer.exe",
                    Arguments = $"/select,\"{zipDestination}\"",
                    UseShellExecute = true
                });
            }
            catch { }

            StatusMessage = $"✓ تم تصدير الشهادة بنجاح! كلمة مرور الـ P12 هي: ({p12Password}). تم حفظ الملفات في المجلد.";
            IsSuccessStatus = true;

            MessageBox.Show(
                $"تم تصدير ملفات الشهادة بنجاح!\n\n" +
                $"🔑 كلمة مرور ملف الـ P12 هي: {p12Password}\n\n" +
                $"📁 تم إنشاء حزمة ZIP ومجلد يحتوي على:\n" +
                $"  • SideLink_Certificate.p12\n" +
                $"  • SideLink_Profile.mobileprovision\n" +
                $"  • دليل تعليمات الاستيراد والتفعيل\n\n" +
                $"انقل الملفات إلى الآيفون واستوردها من إعدادات تطبيق SideLink Container.",
                "تصدير شهادة SideLink Container",
                MessageBoxButton.OK,
                MessageBoxImage.Information);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to export certificate package");
            StatusMessage = "خطأ أثناء تصدير الشهادة: " + ex.Message;
            IsSuccessStatus = false;
            MessageBox.Show(
                "حدث خطأ أثناء تصدير حزمة الشهادة: " + ex.Message,
                "خطأ في التصدير",
                MessageBoxButton.OK,
                MessageBoxImage.Error);
        }
    }

    private static string SanitizeFileName(string name)
    {
        var invalid = Path.GetInvalidFileNameChars();
        return string.Concat(name.Where(c => !invalid.Contains(c)));
    }
}
