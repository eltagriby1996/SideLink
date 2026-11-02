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
    private IHost? _host;

    private async void OnStartup(object sender, StartupEventArgs e)
    {
        string appDataDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "SideLink");
        Directory.CreateDirectory(appDataDir);
        string dbPath = Path.Combine(appDataDir, "SideLink.db");
        string credDir = Path.Combine(appDataDir, "credentials");

        string backendBaseUrl = Environment.GetEnvironmentVariable("SIDELINK_BACKEND_URL") 
            ?? Environment.GetEnvironmentVariable("SideLink_BACKEND_URL") 
            ?? "http://localhost:3000";
        string verificationKey = Environment.GetEnvironmentVariable("SIDELINK_VERIFY_KEY") 
            ?? Environment.GetEnvironmentVariable("SideLink_VERIFY_KEY") 
            ?? "SideLink-Secure-Verification-MasterKey-2026-X89!";

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
