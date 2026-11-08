using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.IdentityModel.Tokens;
using SideLink.Core.Models;
using SideLink.Infrastructure;
using SideLink.Verification;
using Xunit;

namespace SideLink.Tests;

public class InfrastructureAndSecurityTests
{
    [Fact]
    public async Task SqliteAppRepository_PerformsFullCrudLifecycle()
    {
        string dbPath = Path.Combine(Path.GetTempPath(), $"SideLink_test_{Guid.NewGuid():N}.db");
        try
        {
            var repo = new SqliteAppRepository(dbPath, NullLogger<SqliteAppRepository>.Instance);

            var app = new ManagedApp
            {
                Id = "app-test-1",
                BundleIdentifier = "com.sample.app",
                AppName = "Sample App",
                Version = "1.0",
                OriginalIpaPath = "C:\\path\\sample.ipa",
                DeviceUdid = "udid-12345-abcde",
                Status = AppLifecycleStatus.Active,
                ExpirationDate = DateTimeOffset.UtcNow.AddDays(7)
            };

            // Save
            await repo.SaveAppAsync(app);

            // Read
            var fetched = await repo.GetAppByIdAsync("app-test-1");
            fetched.Should().NotBeNull();
            fetched!.AppName.Should().Be("Sample App");
            fetched.BundleIdentifier.Should().Be("com.sample.app");
            fetched.Status.Should().Be(AppLifecycleStatus.Active);

            // Update status
            await repo.UpdateStatusAsync("app-test-1", AppLifecycleStatus.ExpiringSoon, "Expiring in 2 days");
            var updated = await repo.GetAppByIdAsync("app-test-1");
            updated!.Status.Should().Be(AppLifecycleStatus.ExpiringSoon);
            updated.LastErrorMessage.Should().Be("Expiring in 2 days");

            // Delete
            await repo.DeleteAppAsync("app-test-1");
            var deleted = await repo.GetAppByIdAsync("app-test-1");
            deleted.Should().BeNull();
        }
        finally
        {
            Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
            if (File.Exists(dbPath)) File.Delete(dbPath);
        }
    }

    [Fact]
    public async Task AppleIdentityService_CanAutoConfigureAndExportP12()
    {
        string testCredDir = Path.Combine(Path.GetTempPath(), "sidelink_test_creds_" + Guid.NewGuid().ToString("N"));
        try
        {
            var store = new DpapiCredentialStore(testCredDir, NullLogger<DpapiCredentialStore>.Instance);
            var identityService = new SideLink.Signing.AppleIdentityService(store, NullLogger<SideLink.Signing.AppleIdentityService>.Instance);
            
            var info = await identityService.AutoConfigureIdentityForAccountAsync("ahmedmenged100@gmail.com", "00008020-000E6D583C30003A");
            info.Should().NotBeNull();
            info.MobileProvisionPath.Should().NotBeNullOrEmpty();
            File.Exists(info.MobileProvisionPath).Should().BeTrue();
            info.P12Path.Should().NotBeNullOrEmpty();
            File.Exists(info.P12Path).Should().BeTrue();
            if (info.IsExpired)
            {
                info.IsReadyToSign.Should().BeFalse();
            }
            else
            {
                info.IsReadyToSign.Should().BeTrue();
            }

            // Optional local manual test for signing Spotify.ipa
            if (false && File.Exists(@"E:\downloads\Spotify.ipa"))
            {
                var signingService = new SideLink.Signing.SigningService(store, identityService, NullLogger<SideLink.Signing.SigningService>.Instance);
                var device = new SideLink.Core.Models.IosDevice { DeviceId = "00008020-000E6D583C30003A", DeviceName = "Ahmed iPhone" };
                var cfg = new SideLink.Core.Models.SigningConfiguration
                {
                    Method = SideLink.Core.Models.SigningMethodType.PersonalTeam,
                    AppleId = "ahmedmenged100@gmail.com",
                    CustomBundleId = "com.spotify.client.sidelinkj",
                    ModifyBundleId = true
                };

                if (info.IsExpired)
                {
                    var act = () => signingService.SignIpaAsync(@"E:\downloads\Spotify.ipa", cfg, device);
                    await act.Should().ThrowAsync<InvalidOperationException>();
                }
                else
                {
                    string signedPath = await signingService.SignIpaAsync(@"E:\downloads\Spotify.ipa", cfg, device);
                    File.Exists(signedPath).Should().BeTrue();
                    new FileInfo(signedPath).Length.Should().BeGreaterThan(1000000);
                }
            }
        }
        finally
        {
            if (Directory.Exists(testCredDir)) Directory.Delete(testCredDir, true);
        }
    }

    [Fact]
    public async Task DpapiCredentialStore_EncryptsAndDecryptsSecurely()
    {
        string tempDir = Path.Combine(Path.GetTempPath(), $"SideLink_creds_{Guid.NewGuid():N}");
        try
        {
            var store = new DpapiCredentialStore(tempDir, NullLogger<DpapiCredentialStore>.Instance);
            string appleId = "developer@example.com";
            string secretPassword = "SuperSecretPassword123!";

            // Save
            await store.SaveApplePasswordAsync(appleId, secretPassword);

            // Retrieve
            string? decrypted = await store.GetApplePasswordAsync(appleId);
            decrypted.Should().Be(secretPassword);

            // Delete
            await store.DeleteApplePasswordAsync(appleId);
            string? afterDelete = await store.GetApplePasswordAsync(appleId);
            afterDelete.Should().BeNull();
        }
        finally
        {
            if (Directory.Exists(tempDir)) Directory.Delete(tempDir, true);
        }
    }

    [Fact]
    public void SensitiveDataRedactor_MasksTokensAndPasswords()
    {
        string rawLog = "User authenticated. token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisToken password: MySecretApplePassword! inside log";
        string redacted = SensitiveDataRedactor.Redact(rawLog);

        redacted.Should().NotContain("MySecretApplePassword!");
        redacted.Should().NotContain("doNotLeakThisToken");
        redacted.Should().Contain("[REDACTED]");
    }

    [Fact]
    public void LinkUnlockService_ValidatesSignedAuthorizationTokens()
    {
        string secretKey = "SideLink-Secure-Verification-MasterKey-2026-X89!";
        string issuer = "SideLink-verification";
        string audience = "SideLink-client";
        string sessionId = "test-session-xyz";

        // Generate valid JWT
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim("sub", sessionId),
                new Claim("sessionId", sessionId)
            }),
            Expires = DateTime.UtcNow.AddMinutes(5),
            Issuer = issuer,
            Audience = audience,
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        string jwtString = tokenHandler.WriteToken(token);

        var service = new LinkUnlockService(new HttpClient(), "http://localhost:3000", secretKey, NullLogger<LinkUnlockService>.Instance);

        // Valid token with matching session
        bool isValid = service.ValidateAuthorizationToken(jwtString, sessionId);
        isValid.Should().BeTrue();

        // Mismatched session ID must be rejected
        bool isInvalidSession = service.ValidateAuthorizationToken(jwtString, "other-session-id");
        isInvalidSession.Should().BeFalse();
    }

    [Fact]
    public void SanitizeNestedBundles_InjectsMissingIdentifierAndPurgesOldSignatures()
    {
        string tempApp = Path.Combine(Path.GetTempPath(), $"TestApp_{Guid.NewGuid():N}.app");
        string nestedBundle = Path.Combine(tempApp, "ApplilinkNetworkResources.bundle");
        string sigDir = Path.Combine(nestedBundle, "_CodeSignature");

        try
        {
            Directory.CreateDirectory(nestedBundle);
            Directory.CreateDirectory(sigDir);
            File.WriteAllText(Path.Combine(sigDir, "CodeResources"), "fake-signature");

            // Create Info.plist without CFBundleIdentifier
            string plistNoId = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
                               "<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">\n" +
                               "<plist version=\"1.0\">\n" +
                               "<dict>\n" +
                               "    <key>CFBundleName</key>\n    <string>ApplilinkNetworkResources</string>\n" +
                               "    <key>CFBundlePackageType</key>\n    <string>BNDL</string>\n" +
                               "</dict>\n" +
                               "</plist>";
            string plistPath = Path.Combine(nestedBundle, "Info.plist");
            File.WriteAllText(plistPath, plistNoId);

            // Execute Sanitization
            SideLink.Signing.BundleIdentifierModifier.SanitizeNestedBundles(tempApp, "com.kipas.football.ios");

            // Assert _CodeSignature was purged
            Directory.Exists(sigDir).Should().BeFalse();

            // Assert CFBundleIdentifier was injected
            byte[] bytes = File.ReadAllBytes(plistPath);
            string xml = SideLink.Signing.BundleIdentifierModifier.ReadPlistAsXmlString(bytes);
            xml.Should().Contain("CFBundleIdentifier");
            xml.Should().Contain("com.kipas.football.ios.ApplilinkNetworkResources");
        }
        finally
        {
            if (Directory.Exists(tempApp)) Directory.Delete(tempApp, true);
        }
    }
}
