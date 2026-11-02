using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using SideLink.Core.Interfaces;
using SideLink.Core.Models;
using SideLink.Refresh;
using Xunit;

namespace SideLink.Tests;

public class RefreshAndExpirationTests
{
    private class InMemoryAppRepository : IAppRepository
    {
        private readonly List<ManagedApp> _apps = new();

        public Task<IReadOnlyList<ManagedApp>> GetAllAppsAsync()
        {
            return Task.FromResult<IReadOnlyList<ManagedApp>>(_apps.ToList().AsReadOnly());
        }

        public Task<ManagedApp?> GetAppByIdAsync(string id)
        {
            return Task.FromResult(_apps.FirstOrDefault(a => a.Id == id));
        }

        public Task<ManagedApp?> GetAppByBundleIdAsync(string bundleId, string deviceUdid)
        {
            return Task.FromResult(_apps.FirstOrDefault(a => a.BundleIdentifier == bundleId && a.DeviceUdid == deviceUdid));
        }

        public Task SaveAppAsync(ManagedApp app)
        {
            _apps.RemoveAll(a => a.Id == app.Id);
            _apps.Add(app);
            return Task.CompletedTask;
        }

        public Task DeleteAppAsync(string id)
        {
            _apps.RemoveAll(a => a.Id == id);
            return Task.CompletedTask;
        }

        public Task UpdateStatusAsync(string id, AppLifecycleStatus status, string? errorMessage = null)
        {
            var app = _apps.FirstOrDefault(a => a.Id == id);
            if (app != null)
            {
                _apps.Remove(app);
                _apps.Add(app with { Status = status, LastErrorMessage = errorMessage });
            }
            return Task.CompletedTask;
        }
    }

    private class MockSigningService : ISigningService
    {
        public Task<string> SignIpaAsync(string sourceIpaPath, SigningConfiguration config, IosDevice targetDevice, IProgress<AppOperationProgress>? progress = null, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(sourceIpaPath);
        }

        public Task<bool> ValidateSigningPrerequisitesAsync(SigningConfiguration config, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(true);
        }
    }

    private class MockInstallationService : IInstallationService
    {
        public Task<bool> InstallIpaAsync(string signedIpaPath, IosDevice targetDevice, IProgress<AppOperationProgress>? progress = null, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(true);
        }

        public Task<bool> UninstallAppAsync(string bundleIdentifier, IosDevice targetDevice, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(true);
        }
    }

    [Fact]
    public async Task RefreshService_DetectsExpiringSoonAndExpiredApps()
    {
        var repo = new InMemoryAppRepository();
        var signing = new MockSigningService();
        var install = new MockInstallationService();
        var refreshService = new RefreshService(repo, signing, install, NullLogger<RefreshService>.Instance);

        // App 1: Healthy (6 days left)
        await repo.SaveAppAsync(new ManagedApp
        {
            Id = "app-healthy",
            AppName = "Healthy App",
            BundleIdentifier = "com.app.healthy",
            Status = AppLifecycleStatus.Active,
            ExpirationDate = DateTimeOffset.UtcNow.AddDays(6)
        });

        // App 2: Expiring Soon (2 days left)
        await repo.SaveAppAsync(new ManagedApp
        {
            Id = "app-soon",
            AppName = "Expiring App",
            BundleIdentifier = "com.app.soon",
            Status = AppLifecycleStatus.Active,
            ExpirationDate = DateTimeOffset.UtcNow.AddDays(2)
        });

        // App 3: Expired (-1 hour)
        await repo.SaveAppAsync(new ManagedApp
        {
            Id = "app-expired",
            AppName = "Expired App",
            BundleIdentifier = "com.app.expired",
            Status = AppLifecycleStatus.Active,
            ExpirationDate = DateTimeOffset.UtcNow.AddHours(-1)
        });

        var updated = await refreshService.CheckAppExpirationsAsync();

        var healthy = updated.First(a => a.Id == "app-healthy");
        var soon = updated.First(a => a.Id == "app-soon");
        var expired = updated.First(a => a.Id == "app-expired");

        healthy.Status.Should().Be(AppLifecycleStatus.Active);
        soon.Status.Should().Be(AppLifecycleStatus.ExpiringSoon);
        expired.Status.Should().Be(AppLifecycleStatus.Expired);
    }
}
