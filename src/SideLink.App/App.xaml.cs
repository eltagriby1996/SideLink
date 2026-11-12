using System.IO;
using System.Net.Http;
using System.Windows;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SideLink.App.ViewModels;
using SideLink.Core.Interfaces;
using SideLink.Device;
using SideLink.Infrastructure;
using SideLink.Installation;
using SideLink.IPA;
using SideLink.Refresh;
using SideLink.Signing;
using SideLink.Verification;

namespace SideLink.App;

public partial class App : Application
{
    private IServiceProvider? _serviceProvider;

    public App()
    {
        AppDomain.CurrentDomain.UnhandledException += (s, e) =>
        {
            var ex = e.ExceptionObject as Exception;
            LogCrash(ex);
        };

        DispatcherUnhandledException += (s, e) =>
        {
            LogCrash(e.Exception);
            MessageBox.Show($"SideLink Error:\n\n{e.Exception.Message}\n\n{e.Exception.StackTrace}", "SideLink Error", MessageBoxButton.OK, MessageBoxImage.Error);
            e.Handled = true;
        };
    }

    private static void LogCrash(Exception? ex)
    {
        try
        {
            string logDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "SideLink");
            Directory.CreateDirectory(logDir);
            File.WriteAllText(Path.Combine(logDir, "crash.log"), ex?.ToString() ?? "Unknown crash");
        }
        catch { }
    }

    private void OnStartup(object sender, StartupEventArgs e)
    {
        try
        {
            LogBoot("OnStartup starting...");
            string appDataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "SideLink");
            Directory.CreateDirectory(appDataDir);
            string dbPath = Path.Combine(appDataDir, "SideLink.db");
            string credDir = Path.Combine(appDataDir, "credentials");

            string backendBaseUrl = Environment.GetEnvironmentVariable("SIDELINK_BACKEND_URL") 
                ?? Environment.GetEnvironmentVariable("SideLink_BACKEND_URL") 
                ?? "http://127.0.0.1:5055";
            string verificationKey = Environment.GetEnvironmentVariable("SIDELINK_VERIFY_KEY") 
                ?? Environment.GetEnvironmentVariable("SideLink_VERIFY_KEY") 
                ?? "SideLink-Secure-Verification-MasterKey-2026-X89!";

            LogBoot("Configuring ServiceCollection...");
            var services = new ServiceCollection();

            // Core HTTP Client
            services.AddSingleton(new HttpClient { Timeout = TimeSpan.FromSeconds(10) });

            // Logging
            services.AddLogging(builder =>
            {
                builder.SetMinimumLevel(LogLevel.Information);
            });

            // Repositories & Security
            services.AddSingleton<ICredentialStore>(sp =>
                new DpapiCredentialStore(credDir, sp.GetRequiredService<ILogger<DpapiCredentialStore>>()));

            services.AddSingleton<IAppRepository>(sp =>
                new SqliteAppRepository(dbPath, sp.GetRequiredService<ILogger<SqliteAppRepository>>()));

            services.AddSingleton<ITelemetryClient, TelemetryClient>();

            // Domain Services
            services.AddSingleton<IDeviceDiscoveryService, DeviceDiscoveryService>();
            services.AddSingleton<IIpaInspectorService, IpaInspectorService>();
            services.AddSingleton<IAnisetteClient, AnisetteClient>();
            services.AddSingleton<IAppleIdentityService, AppleIdentityService>();
            services.AddSingleton<ISigningService, SigningService>();
            services.AddSingleton<IAppleAuthService, AppleAuthService>();
            services.AddSingleton<IInstallationService, InstallationService>();
            services.AddSingleton<IRefreshService, RefreshService>();
            services.AddSingleton<IMobileCompanionService, MobileCompanionService>();
            services.AddSingleton<SideLink.App.Services.WiFiAutoRefreshService>();

            services.AddSingleton<ILinkUnlockService>(sp =>
                new LinkUnlockService(
                    sp.GetRequiredService<HttpClient>(),
                    backendBaseUrl,
                    verificationKey,
                    sp.GetRequiredService<ILogger<LinkUnlockService>>()));

            services.AddSingleton<IDiagnosticsService>(sp =>
                new DiagnosticsService(backendBaseUrl, sp.GetRequiredService<ILogger<DiagnosticsService>>()));

            // ViewModels
            services.AddSingleton<DashboardViewModel>();
            services.AddSingleton<DevicesViewModel>();
            services.AddSingleton<IpaLibraryViewModel>();
            services.AddSingleton<InstalledAppsViewModel>();
            services.AddSingleton<SigningRefreshViewModel>();
            services.AddSingleton<DiagnosticsViewModel>();
            services.AddSingleton<LogsViewModel>();
            services.AddSingleton<SettingsViewModel>();
            services.AddSingleton<LinkUnlockViewModel>();
            services.AddSingleton<MobileCompanionViewModel>();
            services.AddSingleton<MainViewModel>();

            // Main Window
            services.AddSingleton<MainWindow>();

            LogBoot("Building ServiceProvider...");
            _serviceProvider = services.BuildServiceProvider();

            LogBoot("Resolving MainWindow...");
            var mainWindow = _serviceProvider.GetRequiredService<MainWindow>();
            var mainVm = _serviceProvider.GetRequiredService<MainViewModel>();
            mainWindow.DataContext = mainVm;
            this.MainWindow = mainWindow;

            mainWindow.Closed += (s, args) =>
            {
                LogBoot("MainWindow Closed event fired. Calling Shutdown()...");
                Shutdown();
            };

            LogBoot("Showing MainWindow...");
            mainWindow.Show();
            mainWindow.Activate();
            mainWindow.Focus();
            LogBoot($"MainWindow Show called! IsVisible: {mainWindow.IsVisible}");

            LogBoot("Initializing MainViewModel in background...");
            _ = Task.Run(async () =>
            {
                try
                {
                    await mainVm.InitializeAsync();
                    LogBoot("MainViewModel initialized!");

                    var wifiAutoRefresh = _serviceProvider.GetRequiredService<SideLink.App.Services.WiFiAutoRefreshService>();
                    await wifiAutoRefresh.StartAsync(CancellationToken.None);
                    LogBoot("WiFiAutoRefreshService started successfully!");
                }
                catch (Exception initEx)
                {
                    LogBoot($"MainViewModel init error: {initEx.Message}");
                }
            });
        }
        catch (Exception ex)
        {
            LogBoot($"CRITICAL ERROR in OnStartup: {ex}");
            LogCrash(ex);
            MessageBox.Show($"Failed to start SideLink:\n\n{ex.Message}\n\n{ex.StackTrace}", "SideLink Startup Error", MessageBoxButton.OK, MessageBoxImage.Error);
        }
    }

    public static void LogBoot(string message)
    {
        try
        {
            string bootLog = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "SideLink", "boot.log");
            File.AppendAllText(bootLog, $"[{DateTime.Now:HH:mm:ss.fff}] {message}{Environment.NewLine}");
        }
        catch { }
    }

    protected override async void OnExit(ExitEventArgs e)
    {
        LogBoot($"OnExit called! ExitCode: {e.ApplicationExitCode}");
        if (_serviceProvider != null)
        {
            try
            {
                var wifiService = _serviceProvider.GetService<SideLink.App.Services.WiFiAutoRefreshService>();
                wifiService?.Dispose();
            }
            catch { }

            var deviceService = _serviceProvider.GetService<IDeviceDiscoveryService>();
            if (deviceService != null)
            {
                await deviceService.StopMonitoringAsync();
            }
        }
        base.OnExit(e);
    }
}
