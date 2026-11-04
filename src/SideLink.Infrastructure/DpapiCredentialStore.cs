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

    private string GetAccountsListPath() => Path.Combine(_storageDir, "accounts.txt");

    public async Task SaveApplePasswordAsync(string appleId, string password)
    {
        if (string.IsNullOrWhiteSpace(appleId) || string.IsNullOrWhiteSpace(password))
            return;

        string cleanId = appleId.Trim();

        await Task.Run(() =>
        {
            byte[] plaintextBytes = Encoding.UTF8.GetBytes(password);
            byte[] encrypted = ProtectedData.Protect(plaintextBytes, Entropy, DataProtectionScope.CurrentUser);
            File.WriteAllBytes(GetFilePath(cleanId), encrypted);
            File.WriteAllText(Path.Combine(_storageDir, "last_account.txt"), cleanId);

            // Update accounts registry
            var accounts = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var listPath = GetAccountsListPath();
            if (File.Exists(listPath))
            {
                foreach (var line in File.ReadAllLines(listPath))
                {
                    if (!string.IsNullOrWhiteSpace(line)) accounts.Add(line.Trim());
                }
            }
            accounts.Add(cleanId);
            File.WriteAllLines(listPath, accounts);

            _logger.LogInformation("Securely stored credentials using Windows DPAPI for account {Account}", MaskAccount(cleanId));
        });
    }

    public async Task<IReadOnlyList<string>> GetAllSavedAppleIdsAsync()
    {
        return await Task.Run<IReadOnlyList<string>>(() =>
        {
            var listPath = GetAccountsListPath();
            if (!File.Exists(listPath)) return Array.Empty<string>();

            try
            {
                var validAccounts = new List<string>();
                foreach (var line in File.ReadAllLines(listPath))
                {
                    if (string.IsNullOrWhiteSpace(line)) continue;
                    string acc = line.Trim();
                    // Ensure the encrypted credential file actually exists
                    if (File.Exists(GetFilePath(acc)))
                    {
                        validAccounts.Add(acc);
                    }
                }
                return validAccounts;
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Failed to read accounts list: {Message}", ex.Message);
                return Array.Empty<string>();
            }
        });
    }

    public async Task<string?> GetLastAppleIdAsync()
    {
        return await Task.Run(() =>
        {
            var path = Path.Combine(_storageDir, "last_account.txt");
            if (!File.Exists(path)) return null;
            try
            {
                var text = File.ReadAllText(path).Trim();
                return string.IsNullOrWhiteSpace(text) ? null : text;
            }
            catch
            {
                return null;
            }
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

        string cleanId = appleId.Trim();
        var path = GetFilePath(cleanId);
        var lastAccPath = Path.Combine(_storageDir, "last_account.txt");
        var listPath = GetAccountsListPath();

        await Task.Run(() =>
        {
            if (File.Exists(path))
            {
                File.Delete(path);
                _logger.LogInformation("Removed credentials for account {Account}", MaskAccount(cleanId));
            }

            if (File.Exists(lastAccPath))
            {
                var current = File.ReadAllText(lastAccPath).Trim();
                if (string.Equals(current, cleanId, StringComparison.OrdinalIgnoreCase))
                {
                    File.Delete(lastAccPath);
                }
            }

            if (File.Exists(listPath))
            {
                try
                {
                    var accounts = File.ReadAllLines(listPath)
                        .Where(l => !string.IsNullOrWhiteSpace(l) && !string.Equals(l.Trim(), cleanId, StringComparison.OrdinalIgnoreCase))
                        .ToList();
                    File.WriteAllLines(listPath, accounts);
                }
                catch { }
            }
        });
    }

    private static string MaskAccount(string account)
    {
        if (account.Length <= 4) return "****";
        return account.Substring(0, 2) + "****" + account.Substring(account.Length - 2);
    }
}
