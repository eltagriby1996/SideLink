using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.IdentityModel.Tokens;
using BitLoader.Core.Models;
using BitLoader.Infrastructure;
using BitLoader.Verification;
using Xunit;

namespace BitLoader.Tests;

public class InfrastructureAndSecurityTests
{
    [Fact]
    public async Task SqliteAppRepository_PerformsFullCrudLifecycle()
    {
        string dbPath = Path.Combine(Path.GetTempPath(), $"bitloader_test_{Guid.NewGuid():N}.db");
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
    public async Task DpapiCredentialStore_EncryptsAndDecryptsSecurely()
    {
        string tempDir = Path.Combine(Path.GetTempPath(), $"bitloader_creds_{Guid.NewGuid():N}");
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
        string secretKey = "BitLoader-Secure-Verification-MasterKey-2026-X89!";
        string issuer = "bitloader-verification";
        string audience = "bitloader-client";
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
}
