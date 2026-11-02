using System.IO;
using System.Net.Http;
using System.Windows;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using BitLoader.App.ViewModels;
using BitLoader.Core.Interfaces;
using BitLoader.Device;
using BitLoader.Infrastructure;
using BitLoader.Installation;
using BitLoader.IPA;
using BitLoader.Refresh;
using BitLoader.Signing;
using BitLoader.Verification;

namespace BitLoader.App;

public partial class App : Application
{
    private IHost? _host;

    private async void OnStartup(object sender, StartupEventArgs e)
    {
        string appDataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "BitLoader");
        Directory.CreateDirectory(appDataDir);
        string dbPath = Path.Combine(appDataDir, "bitloader.db");
        string credDir = Path.Combine(appDataDir, "credentials");

        string backendBaseUrl = Environment.GetEnvironmentVariable("BITLOADER_BACKEND_URL") ?? "http://localhost:3000";
        string verificationKey = Environment.GetEnvironmentVariable("BITLOADER_VERIFY_KEY") ?? "BitLoader-Secure-Verification-MasterKey-2026-X89!";

        _host = Host.CreateDefaultBuilder()
            .ConfigureServices((context, services) =>
            {
                // Core HTTP Client
                services.AddSingleton(new HttpClient { Timeout = TimeSpan.FromSeconds(10) });

                // Logging
                services.AddLogging(builder =>
                {
                    builder.AddDebug();
                    builder.SetMinimumLevel(LogLevel.Information);
                });

                // Repositories & Security
                services.AddSingleton<ICredentialStore>(sp =>
                    new DpapiCredentialStore(credDir, sp.GetRequiredService<ILogger<DpapiCredentialStore>>()));

                services.AddSingleton<IAppRepository>(sp =>
                    new SqliteAppRepository(dbPath, sp.GetRequiredService<ILogger<SqliteAppRepository>>()));

                // Domain Services
                services.AddSingleton<IDeviceDiscoveryService, DeviceDiscoveryService>();
                services.AddSingleton<IIpaInspectorService, IpaInspectorService>();
                services.AddSingleton<ISigningService, SigningService>();
                services.AddSingleton<IInstallationService, InstallationService>();
                services.AddSingleton<IRefreshService, RefreshService>();

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
                services.AddSingleton<MainViewModel>();

                // Main Window
                services.AddSingleton<MainWindow>();
            })
            .Build();

        await _host.StartAsync();

        var mainWindow = _host.Services.GetRequiredService<MainWindow>();
        var mainVm = _host.Services.GetRequiredService<MainViewModel>();
        mainWindow.DataContext = mainVm;
        mainWindow.Show();

        await mainVm.InitializeAsync();
    }

    protected override async void OnExit(ExitEventArgs e)
    {
        if (_host != null)
        {
            var deviceService = _host.Services.GetService<IDeviceDiscoveryService>();
            if (deviceService != null)
            {
                await deviceService.StopMonitoringAsync();
            }

            await _host.StopAsync();
            _host.Dispose();
        }
        base.OnExit(e);
    }
}
