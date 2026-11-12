using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using SideLink.Verification;
using Xunit;

namespace SideLink.Tests;

public class VipVerificationExpirationTests : IDisposable
{
    private readonly string _testLicenseDir;
    private readonly LinkUnlockService _service;

    public VipVerificationExpirationTests()
    {
        _testLicenseDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "SideLink");
        Directory.CreateDirectory(_testLicenseDir);

        using var client = new HttpClient();
        _service = new LinkUnlockService(
            client,
            "http://127.0.0.1:5055",
            "test-key-32-chars-long-security-001",
            NullLogger<LinkUnlockService>.Instance);
    }

    public void Dispose()
    {
        _service.RevokeLocalVipLicense();
        _service.Dispose();
    }

    [Fact]
    public void LinkUnlockService_SavesAndValidatesActiveVipLicense()
    {
        _service.RevokeLocalVipLicense();
        string testKey = "SL-VIP-ACTIVE-TEST";
        var futureExpiry = DateTimeOffset.UtcNow.AddHours(12);

        _service.SavePersistentVipLicense(testKey, futureExpiry.ToString("O"));

        _service.IsVipExpired().Should().BeFalse();
        _service.IsMachineAlreadyAuthorized().Should().BeTrue();

        var info = _service.GetSavedVipInfo();
        info.Key.Should().Be(testKey);
        info.ExpiresAt.Should().NotBeNull();
        info.ExpiresAt!.Value.Should().BeCloseTo(futureExpiry, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void LinkUnlockService_DetectsExpiredVipLicense_AndRevokes()
    {
        _service.RevokeLocalVipLicense();
        string testKey = "SL-VIP-EXPIRED-TEST";
        var pastExpiry = DateTimeOffset.UtcNow.AddMinutes(-10);

        _service.SavePersistentVipLicense(testKey, pastExpiry.ToString("O"));

        _service.IsVipExpired().Should().BeTrue();
        _service.IsMachineAlreadyAuthorized().Should().BeFalse();

        // After revocation check, license file should be deleted
        _service.GetSavedVipKey().Should().BeNull();
        _service.IsMachineAlreadyAuthorized().Should().BeFalse();
    }

    [Fact]
    public void LinkUnlockService_LifetimeVipLicense_NeverExpires()
    {
        _service.RevokeLocalVipLicense();
        string testKey = "SL-VIP-LIFETIME-TEST";

        _service.SavePersistentVipLicense(testKey, null);

        _service.IsVipExpired().Should().BeFalse();
        _service.IsMachineAlreadyAuthorized().Should().BeTrue();

        var info = _service.GetSavedVipInfo();
        info.Key.Should().Be(testKey);
        info.ExpiresAt.Should().BeNull();
    }
}
