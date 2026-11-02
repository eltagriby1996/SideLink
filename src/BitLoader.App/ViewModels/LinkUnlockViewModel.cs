using System.Diagnostics;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Microsoft.Extensions.Logging;
using BitLoader.Core.Interfaces;
using BitLoader.Core.Models;

namespace BitLoader.App.ViewModels;

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
            IsVerifying = true;
            HasError = false;
            ErrorMessage = string.Empty;
            StatusText = "Connecting to verification gateway...";

            var session = await _linkUnlockService.CreateSessionAsync();
            SessionId = session.SessionId;
            VerificationUrl = session.VerificationUrl;
            StatusText = "Waiting for verification in browser...";

            // Open default browser
            OpenBrowser();

            // Start polling loop
            StartPollingLoop(session.SessionId);
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
    public void OpenBrowser()
    {
        if (string.IsNullOrWhiteSpace(VerificationUrl)) return;
        try
        {
            Process.Start(new ProcessStartInfo(VerificationUrl) { UseShellExecute = true });
            _logger.LogInformation("Opened browser for verification URL: {Url}", VerificationUrl);
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

        App.Current?.Dispatcher?.Invoke(() =>
        {
            if (authorized)
            {
                IsUnlocked = true;
                IsVerifying = false;
                StatusText = "Verification successful! Welcome to BitLoader.";
                VerificationCompleted?.Invoke();
            }
            else
            {
                HasError = true;
                IsVerifying = false;
                ErrorMessage = "Authorization token signature validation failed.";
                StatusText = "Security validation failed.";
            }
        });
    }

    public void StopPolling()
    {
        _pollCts?.Cancel();
        _pollCts?.Dispose();
        _pollCts = null;
    }
}
