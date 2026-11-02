using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Logging;
using SideLink.Core.Interfaces;

namespace SideLink.Infrastructure;

public class DpapiCredentialStore : ICredentialStore
{
    private readonly string _storageDir;
    private readonly ILogger<DpapiCredentialStore> _logger;
    private static readonly byte[] Entropy = Encoding.UTF8.GetBytes("SideLink-Credential-Entropy-v1");

    public DpapiCredentialStore(string storageDir, ILogger<DpapiCredentialStore> logger)
    {
        _storageDir = storageDir;
        _logger = logger;
        if (!Directory.Exists(_storageDir))
        {
            Directory.CreateDirectory(_storageDir);
        }
    }

    private string GetFilePath(string key)
    {
        using var sha = SHA256.Create();
        var hash = Convert.ToHexString(sha.ComputeHash(Encoding.UTF8.GetBytes(key)));
        return Path.Combine(_storageDir, $"{hash}.dat");
    }

    public async Task SaveApplePasswordAsync(string appleId, string password)
    {
        if (string.IsNullOrWhiteSpace(appleId) || string.IsNullOrWhiteSpace(password))
            return;

        await Task.Run(() =>
        {
            byte[] plaintextBytes = Encoding.UTF8.GetBytes(password);
            byte[] encrypted = ProtectedData.Protect(plaintextBytes, Entropy, DataProtectionScope.CurrentUser);
            File.WriteAllBytes(GetFilePath(appleId), encrypted);
            _logger.LogInformation("Securely stored credentials using Windows DPAPI for account {Account}", MaskAccount(appleId));
        });
    }

    public async Task<string?> GetApplePasswordAsync(string appleId)
    {
        if (string.IsNullOrWhiteSpace(appleId))
            return null;

        var path = GetFilePath(appleId);
        if (!File.Exists(path))
            return null;

        return await Task.Run(() =>
        {
            try
            {
                byte[] encrypted = File.ReadAllBytes(path);
                byte[] decrypted = ProtectedData.Unprotect(encrypted, Entropy, DataProtectionScope.CurrentUser);
                return Encoding.UTF8.GetString(decrypted);
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Failed to decrypt credentials for account: {Message}", ex.Message);
                return null;
            }
        });
    }

    public async Task DeleteApplePasswordAsync(string appleId)
    {
        if (string.IsNullOrWhiteSpace(appleId))
            return;

        var path = GetFilePath(appleId);
        await Task.Run(() =>
        {
            if (File.Exists(path))
            {
                File.Delete(path);
                _logger.LogInformation("Removed credentials for account {Account}", MaskAccount(appleId));
            }
        });
    }

    private static string MaskAccount(string account)
    {
        if (account.Length <= 4) return "****";
        return account.Substring(0, 2) + "****" + account.Substring(account.Length - 2);
    }
}
