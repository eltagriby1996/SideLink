using System.Diagnostics;
using System.Net.Http.Json;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Extensions.Logging;
using SideLink.Core.Interfaces;
using SideLink.Core.Models;

namespace SideLink.App.ViewModels;

public partial class LinkUnlockViewModel : ObservableObject
{
    private readonly ILinkUnlockService _linkUnlockService;
    private readonly ILogger<LinkUnlockViewModel> _logger;
    private CancellationTokenSource? _pollCts;

    [ObservableProperty]
    private string _sessionId = string.Empty;

    [ObservableProperty]
    private string _verificationUrl = string.Empty;

    [ObservableProperty]
    private string _statusText = "Initializing verification session...";

    [ObservableProperty]
    private bool _isVerifying = true;

    [ObservableProperty]
    private bool _isUnlocked;

    [ObservableProperty]
    private bool _isSuccessAnimation;

    [ObservableProperty]
    private bool _hasError;

    [ObservableProperty]
    private string _errorMessage = string.Empty;

    [ObservableProperty]
    private int _secondsRemaining = 600;

    [ObservableProperty]
    private string _timeRemainingText = "10:00 متبقية";

    [ObservableProperty]
    private string _vipKeyInput = string.Empty;

    [ObservableProperty]
    private bool _isVipSectionVisible;

    [ObservableProperty]
    private bool _isVipValidating;

    [ObservableProperty]
    private string _vipStatusMessage = string.Empty;

    public event Action? VerificationCompleted;

    public LinkUnlockViewModel(ILinkUnlockService linkUnlockService, ILogger<LinkUnlockViewModel> logger)
    {
        _linkUnlockService = linkUnlockService;
        _logger = logger;
    }

    public bool CheckMachineAuthorized()
    {
        if (_linkUnlockService.IsMachineAlreadyAuthorized())
        {
            IsUnlocked = true;
            IsVerifying = false;
            IsSuccessAnimation = false;
            return true;
        }
        return false;
    }

    public string? GetSavedVipKey() => _linkUnlockService.GetSavedVipKey();

    public Task<RemoteConfigDto?> FetchRemoteConfigAsync(CancellationToken cancellationToken = default)
        => _linkUnlockService.FetchRemoteConfigAsync(cancellationToken);

    public async Task<bool> CheckEmergencyKillSwitchAsync()
    {
        try
        {
            using var http = new System.Net.Http.HttpClient { Timeout = TimeSpan.FromSeconds(5) };
            var resp = await http.GetAsync("https://sidelink-web.vercel.app/api/app/config");
            if (resp.IsSuccessStatusCode)
            {
                var doc = await resp.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
                if (doc.TryGetProperty("emergencyKillSwitch", out var ks) && ks.GetBoolean())
                {
                    return true;
                }
            }
            else if (resp.StatusCode == System.Net.HttpStatusCode.Forbidden)
            {
                return true;
            }
        }
        catch { }
        return false;
    }

    public async Task<bool> ValidateAuthorizationOnlineAsync()
    {
        var (isValid, reason) = await _linkUnlockService.ValidateSavedLicenseOnlineAsync();
        if (!isValid)
        {
            App.Current?.Dispatcher?.Invoke(() =>
            {
                IsUnlocked = false;
                HasError = true;
                ErrorMessage = reason ?? "تم إلغاء أو تعطيل كود التحقق من قبل الإدارة.";
                VipStatusMessage = ErrorMessage;
            });
            return false;
        }
        return true;
    }

    [RelayCommand]
    public void ToggleVipSection()
    {
        IsVipSectionVisible = !IsVipSectionVisible;
    }

    [RelayCommand]
    public async Task SubmitVipKeyAsync()
    {
        if (string.IsNullOrWhiteSpace(VipKeyInput))
        {
            VipStatusMessage = "يرجى كتابة كود الـ VIP أولاً.";
            return;
        }

        try
        {
            IsVipValidating = true;
            VipStatusMessage = "جاري التحقق من صلاحية مفتاح VIP...";

            string key = VipKeyInput.Trim().ToUpperInvariant();
            string hwid = SideLink.Verification.LinkUnlockService.GetMachineHwid();

            // Online verification via sidelink-web API first (so admin control is absolute)
            try
            {
                using var http = new System.Net.Http.HttpClient { Timeout = TimeSpan.FromSeconds(6) };
                var payload = new
                {
                    key,
                    hwid,
                    machineName = Environment.MachineName
                };
                var resp = await http.PostAsJsonAsync("https://sidelink-web.vercel.app/api/app/vip/verify", payload);
                if (resp.IsSuccessStatusCode)
                {
                    var doc = await resp.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
                    if (doc.TryGetProperty("success", out var s) && s.GetBoolean())
                    {
                        _linkUnlockService.SavePersistentVipLicense(key);
                        VipStatusMessage = "✓ تم تفعيل وحفظ ترخيص VIP بنجاح على هذا الجهاز!";
                        IsSuccessAnimation = true;
                        await Task.Delay(1000);
                        App.Current?.Dispatcher?.Invoke(() =>
                        {
                            IsSuccessAnimation = false;
                            IsUnlocked = true;
                            VerificationCompleted?.Invoke();
                        });
                        return;
                    }
                }
                else
                {
                    var doc = await resp.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
                    string msg = doc.TryGetProperty("error", out var e) ? e.GetString() ?? "مفتاح غير صالح." : "تم تعطيل أو رفض هذا المفتاح من قبل الإدارة.";
                    VipStatusMessage = msg;
                    return;
                }
            }
            catch (Exception ex)
            {
                // Only if offline without internet, check emergency master key
                if (key.Equals("SL-VIP-PRO-2026-X77", StringComparison.OrdinalIgnoreCase))
                {
                    _linkUnlockService.SavePersistentVipLicense(key);
                    VipStatusMessage = "✓ تم تفعيل ترخيص الطوارئ دون اتصال بنجاح!";
                    IsSuccessAnimation = true;
                    await Task.Delay(1000);
                    App.Current?.Dispatcher?.Invoke(() =>
                    {
                        IsSuccessAnimation = false;
                        IsUnlocked = true;
                        VerificationCompleted?.Invoke();
                    });
                    return;
                }
                VipStatusMessage = "تعذر الاتصال بالخادم للتحقق من المفتاح: " + ex.Message;
                return;
            }

            VipStatusMessage = "مفتاح VIP غير صالح أو منتهي الصلاحية.";
        }
        catch (Exception ex)
        {
            VipStatusMessage = "تعذر الاتصال بخادم التحقق: " + ex.Message;
        }
        finally
        {
            IsVipValidating = false;
        }
    }

    public async Task InitializeSessionAsync(bool preserveError = false)
    {
        try
        {
            StopPolling();
            IsVerifying = false;
            IsSuccessAnimation = false;
            if (!preserveError)
            {
                HasError = false;
                ErrorMessage = string.Empty;
            }
            SecondsRemaining = 600;
            TimeRemainingText = "10:00 متبقية";
            StatusText = "Connecting to verification gateway...";

            var session = await _linkUnlockService.CreateSessionAsync();
            SessionId = session.SessionId;
            VerificationUrl = session.VerificationUrl;
            StatusText = "جاهز للتحقق: يرجى النقر على الزر أدناه لفتح صفحة التحقق في المتصفح.";

            if (!string.IsNullOrWhiteSpace(SessionId))
            {
                StartPollingLoop(SessionId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize verification session");
            HasError = true;
            IsVerifying = false;
            ErrorMessage = "Cannot connect to verification server: " + ex.Message;
            StatusText = "Connection error. Check your internet connection.";
        }
    }

    [RelayCommand]
    public async Task OpenBrowserAsync()
    {
        if (string.IsNullOrWhiteSpace(VerificationUrl))
        {
            await InitializeSessionAsync();
        }

        if (string.IsNullOrWhiteSpace(VerificationUrl)) return;

        try
        {
            Process.Start(new ProcessStartInfo(VerificationUrl) { UseShellExecute = true });
            _logger.LogInformation("Opened browser for verification URL: {Url}", VerificationUrl);
            StatusText = "بانتظار إكمال خطوة التحقق في المتصفح... / Waiting for verification in browser...";
            IsVerifying = true;

            if (!string.IsNullOrWhiteSpace(SessionId))
            {
                StartPollingLoop(SessionId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Could not open default browser");
            ErrorMessage = "Could not open browser automatically. Please copy the URL.";
        }
    }

    [RelayCommand]
    public async Task CheckStatusNowAsync()
    {
        if (string.IsNullOrWhiteSpace(SessionId)) return;

        try
        {
            StatusText = "Checking verification status with server...";
            var status = await _linkUnlockService.CheckSessionStatusAsync(SessionId);
            if (status == VerificationStatus.Verified)
            {
                await CompleteAuthorizationAsync();
            }
            else if (status == VerificationStatus.Expired)
            {
                HasError = true;
                IsVerifying = false;
                ErrorMessage = "Session has expired. Please create a new session.";
                StatusText = "Verification session expired.";
            }
            else
            {
                StatusText = "Session is still pending verification in browser.";
            }
        }
        catch (Exception ex)
        {
            ErrorMessage = ex.Message;
        }
    }

    [RelayCommand]
    public async Task RestartVerificationAsync()
    {
        StopPolling();
        await InitializeSessionAsync();
    }

    private void StartPollingLoop(string sessionId)
    {
        StopPolling();
        _pollCts = new CancellationTokenSource();
        var token = _pollCts.Token;

        _ = Task.Run(async () =>
        {
            DateTime startTime = DateTime.UtcNow;
            int totalSeconds = 600;

            while (!token.IsCancellationRequested)
            {
                try
                {
                    await Task.Delay(800, token);
                    if (token.IsCancellationRequested) break;

                    // Update live countdown
                    var elapsed = (DateTime.UtcNow - startTime).TotalSeconds;
                    int remaining = Math.Max(0, totalSeconds - (int)elapsed);
                    
                    App.Current?.Dispatcher?.Invoke(() =>
                    {
                        SecondsRemaining = remaining;
                        int mins = remaining / 60;
                        int secs = remaining % 60;
                        TimeRemainingText = $"{mins:D2}:{secs:D2} متبقية";
                    });

                    if (remaining <= 0)
                    {
                        App.Current?.Dispatcher?.Invoke(() =>
                        {
                            HasError = true;
                            IsVerifying = false;
                            ErrorMessage = "انتهت صلاحية جلسة التحقق. يرجى الضغط على زر بدء جلسة جديدة أدناه.";
                            StatusText = "انتهت مهلة الجلسة.";
                        });
                        break;
                    }

                    var status = await _linkUnlockService.CheckSessionStatusAsync(sessionId, token);

                    if (status == VerificationStatus.Verified)
                    {
                        await CompleteAuthorizationAsync();
                        break;
                    }
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogDebug("Polling check error: {Message}", ex.Message);
                }
            }
        }, token);
    }

    private async Task CompleteAuthorizationAsync()
    {
        StopPolling();

        App.Current?.Dispatcher?.Invoke(() =>
        {
            StatusText = "✓ تم التحقق بنجاح من المتصفح! جاري فك قفل البرنامج...";
            IsVerifying = false;
            IsSuccessAnimation = true;
        });

        bool authorized = await _linkUnlockService.AuthorizeAndUnlockAsync(SessionId);

        if (authorized)
        {
            await Task.Delay(1200);

            App.Current?.Dispatcher?.Invoke(() =>
            {
                IsSuccessAnimation = false;
                IsUnlocked = true;
                VerificationCompleted?.Invoke();
            });
        }
        else
        {
            App.Current?.Dispatcher?.Invoke(() =>
            {
                HasError = true;
                IsSuccessAnimation = false;
                ErrorMessage = "فشل التحقق من توقيع تصريح الدخول الأمني.";
                StatusText = "فشل التحقق الأمني.";
            });
        }
    }

    public void StopPolling()
    {
        _pollCts?.Cancel();
        _pollCts?.Dispose();
        _pollCts = null;
    }
}
