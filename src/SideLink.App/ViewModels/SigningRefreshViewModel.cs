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

    public SigningRefreshViewModel(ICredentialStore credentialStore, ILogger<SigningRefreshViewModel> logger)
    {
        _credentialStore = credentialStore;
        _logger = logger;

        UpdateExplanation();
    }

    public async Task InitializeAsync()
    {
        if (!string.IsNullOrWhiteSpace(AppleId))
        {
            var stored = await _credentialStore.GetApplePasswordAsync(AppleId);
            HasStoredPassword = !string.IsNullOrWhiteSpace(stored);
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
        if (string.IsNullOrWhiteSpace(AppleId))
        {
            StatusMessage = "Please enter a valid Apple ID.";
            return;
        }

        if (string.IsNullOrWhiteSpace(Password))
        {
            StatusMessage = "Please enter your Apple ID password or app-specific password.";
            return;
        }

        try
        {
            await _credentialStore.SaveApplePasswordAsync(AppleId, Password);
            HasStoredPassword = true;
            Password = string.Empty; // Clear plaintext from memory
            StatusMessage = "Credentials safely encrypted and saved with Windows DPAPI.";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to save credentials");
            StatusMessage = "Error saving credentials: " + ex.Message;
        }
    }

    [RelayCommand]
    public async Task ClearCredentialsAsync()
    {
        if (string.IsNullOrWhiteSpace(AppleId)) return;

        try
        {
            await _credentialStore.DeleteApplePasswordAsync(AppleId);
            HasStoredPassword = false;
            Password = string.Empty;
            StatusMessage = "Credentials removed from secure Windows storage.";
        }
        catch (Exception ex)
        {
            StatusMessage = "Error clearing credentials: " + ex.Message;
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
