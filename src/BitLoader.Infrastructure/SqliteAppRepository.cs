using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Logging;
using BitLoader.Core.Interfaces;
using BitLoader.Core.Models;

namespace BitLoader.Infrastructure;

public class SqliteAppRepository : IAppRepository
{
    private readonly string _connectionString;
    private readonly ILogger<SqliteAppRepository> _logger;

    public SqliteAppRepository(string dbFilePath, ILogger<SqliteAppRepository> logger)
    {
        _logger = logger;
        var dir = Path.GetDirectoryName(dbFilePath);
        if (!string.IsNullOrWhiteSpace(dir) && !Directory.Exists(dir))
        {
            Directory.CreateDirectory(dir);
        }
        _connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = dbFilePath,
            Mode = SqliteOpenMode.ReadWriteCreate
        }.ToString();

        InitializeDatabase();
    }

    private void InitializeDatabase()
    {
        using var connection = new SqliteConnection(_connectionString);
        connection.Open();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            CREATE TABLE IF NOT EXISTS ManagedApps (
                Id TEXT PRIMARY KEY,
                BundleIdentifier TEXT NOT NULL,
                AppName TEXT NOT NULL,
                Version TEXT NOT NULL,
                OriginalIpaPath TEXT,
                IconBase64 TEXT,
                InstalledAt TEXT NOT NULL,
                LastRefreshedAt TEXT,
                SigningMethod INTEGER NOT NULL,
                ExpirationDate TEXT,
                Status INTEGER NOT NULL,
                DeviceUdid TEXT NOT NULL,
                LastErrorMessage TEXT
            );
            CREATE INDEX IF NOT EXISTS IX_ManagedApps_BundleDevice ON ManagedApps (BundleIdentifier, DeviceUdid);
        ";
        command.ExecuteNonQuery();
    }

    public async Task<IReadOnlyList<ManagedApp>> GetAllAppsAsync()
    {
        var list = new List<ManagedApp>();
        using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = "SELECT Id, BundleIdentifier, AppName, Version, OriginalIpaPath, IconBase64, InstalledAt, LastRefreshedAt, SigningMethod, ExpirationDate, Status, DeviceUdid, LastErrorMessage FROM ManagedApps ORDER BY InstalledAt DESC";

        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            list.Add(ReadAppFromRecord(reader));
        }

        return list;
    }

    public async Task<ManagedApp?> GetAppByIdAsync(string id)
    {
        using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = "SELECT Id, BundleIdentifier, AppName, Version, OriginalIpaPath, IconBase64, InstalledAt, LastRefreshedAt, SigningMethod, ExpirationDate, Status, DeviceUdid, LastErrorMessage FROM ManagedApps WHERE Id = @Id";
        command.Parameters.AddWithValue("@Id", id);

        using var reader = await command.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return ReadAppFromRecord(reader);
        }
        return null;
    }

    public async Task<ManagedApp?> GetAppByBundleIdAsync(string bundleId, string deviceUdid)
    {
        using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = "SELECT Id, BundleIdentifier, AppName, Version, OriginalIpaPath, IconBase64, InstalledAt, LastRefreshedAt, SigningMethod, ExpirationDate, Status, DeviceUdid, LastErrorMessage FROM ManagedApps WHERE BundleIdentifier = @BundleId AND DeviceUdid = @DeviceUdid LIMIT 1";
        command.Parameters.AddWithValue("@BundleId", bundleId);
        command.Parameters.AddWithValue("@DeviceUdid", deviceUdid);

        using var reader = await command.ExecuteReaderAsync();
        if (await reader.ReadAsync())
        {
            return ReadAppFromRecord(reader);
        }
        return null;
    }

    public async Task SaveAppAsync(ManagedApp app)
    {
        using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = @"
            INSERT INTO ManagedApps (
                Id, BundleIdentifier, AppName, Version, OriginalIpaPath, IconBase64, InstalledAt, 
                LastRefreshedAt, SigningMethod, ExpirationDate, Status, DeviceUdid, LastErrorMessage
            ) VALUES (
                @Id, @BundleIdentifier, @AppName, @Version, @OriginalIpaPath, @IconBase64, @InstalledAt, 
                @LastRefreshedAt, @SigningMethod, @ExpirationDate, @Status, @DeviceUdid, @LastErrorMessage
            )
            ON CONFLICT(Id) DO UPDATE SET
                BundleIdentifier = excluded.BundleIdentifier,
                AppName = excluded.AppName,
                Version = excluded.Version,
                OriginalIpaPath = excluded.OriginalIpaPath,
                IconBase64 = excluded.IconBase64,
                LastRefreshedAt = excluded.LastRefreshedAt,
                SigningMethod = excluded.SigningMethod,
                ExpirationDate = excluded.ExpirationDate,
                Status = excluded.Status,
                DeviceUdid = excluded.DeviceUdid,
                LastErrorMessage = excluded.LastErrorMessage;
        ";

        command.Parameters.AddWithValue("@Id", app.Id);
        command.Parameters.AddWithValue("@BundleIdentifier", app.BundleIdentifier);
        command.Parameters.AddWithValue("@AppName", app.AppName);
        command.Parameters.AddWithValue("@Version", app.Version);
        command.Parameters.AddWithValue("@OriginalIpaPath", (object?)app.OriginalIpaPath ?? DBNull.Value);
        command.Parameters.AddWithValue("@IconBase64", (object?)app.IconBase64 ?? DBNull.Value);
        command.Parameters.AddWithValue("@InstalledAt", app.InstalledAt.ToString("O"));
        command.Parameters.AddWithValue("@LastRefreshedAt", app.LastRefreshedAt.HasValue ? (object)app.LastRefreshedAt.Value.ToString("O") : DBNull.Value);
        command.Parameters.AddWithValue("@SigningMethod", (int)app.SigningMethod);
        command.Parameters.AddWithValue("@ExpirationDate", app.ExpirationDate.HasValue ? (object)app.ExpirationDate.Value.ToString("O") : DBNull.Value);
        command.Parameters.AddWithValue("@Status", (int)app.Status);
        command.Parameters.AddWithValue("@DeviceUdid", app.DeviceUdid);
        command.Parameters.AddWithValue("@LastErrorMessage", (object?)app.LastErrorMessage ?? DBNull.Value);

        await command.ExecuteNonQueryAsync();
    }

    public async Task DeleteAppAsync(string id)
    {
        using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = "DELETE FROM ManagedApps WHERE Id = @Id";
        command.Parameters.AddWithValue("@Id", id);
        await command.ExecuteNonQueryAsync();
    }

    public async Task UpdateStatusAsync(string id, AppLifecycleStatus status, string? errorMessage = null)
    {
        using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync();

        using var command = connection.CreateCommand();
        command.CommandText = "UPDATE ManagedApps SET Status = @Status, LastErrorMessage = @Msg WHERE Id = @Id";
        command.Parameters.AddWithValue("@Status", (int)status);
        command.Parameters.AddWithValue("@Msg", (object?)errorMessage ?? DBNull.Value);
        command.Parameters.AddWithValue("@Id", id);
        await command.ExecuteNonQueryAsync();
    }

    private static ManagedApp ReadAppFromRecord(SqliteDataReader reader)
    {
        return new ManagedApp
        {
            Id = reader.GetString(0),
            BundleIdentifier = reader.GetString(1),
            AppName = reader.GetString(2),
            Version = reader.GetString(3),
            OriginalIpaPath = reader.IsDBNull(4) ? null : reader.GetString(4),
            IconBase64 = reader.IsDBNull(5) ? null : reader.GetString(5),
            InstalledAt = DateTimeOffset.Parse(reader.GetString(6)),
            LastRefreshedAt = reader.IsDBNull(7) ? null : DateTimeOffset.Parse(reader.GetString(7)),
            SigningMethod = (SigningMethodType)reader.GetInt32(8),
            ExpirationDate = reader.IsDBNull(9) ? null : DateTimeOffset.Parse(reader.GetString(9)),
            Status = (AppLifecycleStatus)reader.GetInt32(10),
            DeviceUdid = reader.GetString(11),
            LastErrorMessage = reader.IsDBNull(12) ? null : reader.GetString(12)
        };
    }
}
