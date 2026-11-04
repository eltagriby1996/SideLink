using System.Diagnostics;
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

    public event Action? VerificationCompleted;

    public LinkUnlockViewModel(ILinkUnlockService linkUnlockService, ILogger<LinkUnlockViewModel> logger)
    {
        _linkUnlockService = linkUnlockService;
        _logger = logger;
    }

    public async Task InitializeSessionAsync()
    {
        try
        {
            IsVerifying = false;
            HasError = false;
            ErrorMessage = string.Empty;
            StatusText = "Connecting to verification gateway...";

            var session = await _linkUnlockService.CreateSessionAsync();
            SessionId = session.SessionId;
            VerificationUrl = session.VerificationUrl;
            StatusText = "جاهز للتحقق: يرجى النقر على الزر أدناه لفتح صفحة التحقق في المتصفح.";
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
            while (!token.IsCancellationRequested)
            {
                try
                {
                    await Task.Delay(2000, token);
                    if (token.IsCancellationRequested) break;

                    var status = await _linkUnlockService.CheckSessionStatusAsync(sessionId, token);

                    if (status == VerificationStatus.Verified)
                    {
                        await CompleteAuthorizationAsync();
                        break;
                    }

                    if (status == VerificationStatus.Expired)
                    {
                        App.Current?.Dispatcher?.Invoke(() =>
                        {
                            HasError = true;
                            IsVerifying = false;
                            ErrorMessage = "Session has expired. Click below to start a new session.";
                            StatusText = "Session expired.";
                        });
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
            StatusText = "Validating cryptographic authorization token...";
        });

        bool authorized = await _linkUnlockService.AuthorizeAndUnlockAsync(SessionId);

        if (authorized)
        {
            App.Current?.Dispatcher?.Invoke(() =>
            {
                IsSuccessAnimation = true;
                IsVerifying = false;
                StatusText = "✓ تم التحقق بنجاح! جاري فتح البرنامج...";
            });

            await Task.Delay(1300);

            App.Current?.Dispatcher?.Invoke(() =>
            {
                IsUnlocked = true;
                VerificationCompleted?.Invoke();
            });
        }
        else
        {
            App.Current?.Dispatcher?.Invoke(() =>
            {
                HasError = true;
                IsVerifying = false;
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
