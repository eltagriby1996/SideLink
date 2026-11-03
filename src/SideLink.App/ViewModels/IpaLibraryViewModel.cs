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
    private bool _autoModifyBundleId = true;

    partial void OnSelectedIpaChanged(IpaMetadata? value)
    {
        if (value != null)
        {
            TargetBundleId = AutoModifyBundleId
                ? GenerateDistinctBundleId(value.BundleIdentifier)
                : value.BundleIdentifier;
        }
        else
        {
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

    public IpaLibraryViewModel(
        IIpaInspectorService ipaInspector,
        ISigningService signingService,
        IInstallationService installationService,
        IDeviceDiscoveryService deviceService,
        ICredentialStore credentialStore,
        ILogger<IpaLibraryViewModel> logger)
    {
        _ipaInspector = ipaInspector;
        _signingService = signingService;
        _installationService = installationService;
        _deviceService = deviceService;
        _credentialStore = credentialStore;
        _logger = logger;
    }

    [RelayCommand]
    public async Task BrowseForIpaAsync()
    {
        var dialog = new OpenFileDialog
        {
            Filter = "iOS Application Packages (*.ipa)|*.ipa|All Files (*.*)|*.*",
            Title = "Select iOS Application Archive (IPA)"
        };

        if (dialog.ShowDialog() == true)
        {
            await LoadIpaFileAsync(dialog.FileName);
        }
    }

    public async Task LoadIpaFileAsync(string filePath)
    {
        if (string.IsNullOrWhiteSpace(filePath) || !File.Exists(filePath))
            return;

        IsInspecting = true;
        HasError = false;
        ErrorMessage = string.Empty;
        StatusMessage = $"Inspecting archive: {Path.GetFileName(filePath)}...";

        try
        {
            bool isValid = await _ipaInspector.ValidateIpaArchiveAsync(filePath);
            if (!isValid)
            {
                HasError = true;
                ErrorMessage = "Invalid or corrupted IPA archive: missing Payload or Info.plist.";
                StatusMessage = "Archive inspection failed.";
                return;
            }

            var metadata = await _ipaInspector.InspectIpaAsync(filePath);
            LoadedIpas.Insert(0, metadata);
            SelectedIpa = metadata;
            StatusMessage = $"Loaded {metadata.EffectiveTitle} (v{metadata.Version}) successfully.";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load IPA {Path}", filePath);
            HasError = true;
            ErrorMessage = "Inspection error: " + ex.Message;
            StatusMessage = "Failed to inspect IPA.";
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
            ErrorMessage = "No IPA file selected for installation.";
            return;
        }

        var device = _deviceService.CurrentDevice;
        if (device == null || !device.IsConnected)
        {
            HasError = true;
            ErrorMessage = "No iPhone connected. Connect your iPhone via USB first.";
            return;
        }

        if (device.IsLocked)
        {
            HasError = true;
            ErrorMessage = "Your iPhone is locked with passcode. Please unlock your device.";
            return;
        }

        if (!device.IsTrusted)
        {
            HasError = true;
            ErrorMessage = "Your iPhone is not paired. Please unlock your iPhone and tap 'Trust This Computer'.";
            return;
        }

        IsInstalling = true;
        HasError = false;
        InstallProgress = 0;
        StatusMessage = "Preparing to sign and install application...";

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
            // 1. Sign IPA using active Apple ID credentials & profile
            string? activeAppleId = await _credentialStore.GetLastAppleIdAsync();
            var config = new SigningConfiguration 
            { 
                Method = SigningMethodType.PersonalTeam,
                AppleId = activeAppleId ?? string.Empty,
                CustomBundleId = AutoModifyBundleId && !string.IsNullOrWhiteSpace(TargetBundleId) 
                    ? TargetBundleId.Trim() 
                    : null,
                ModifyBundleId = AutoModifyBundleId
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
