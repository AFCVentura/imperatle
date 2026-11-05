using Imperatle.Api.Data;
using Imperatle.Api.Models;
using Imperatle.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using static Imperatle.Api.Tests.PerksTestSupport;

namespace Imperatle.Api.Tests;

// Which rows the daily cleanup deletes. The rules run as a plain Where on the
// in-memory database (it has no ExecuteDelete); the DELETE itself runs
// against Postgres when IMPERATLE_TEST_POSTGRES is set.
public class DataCleanupTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    internal static readonly DateTime Now = new(2026, 11, 4, 12, 0, 0, DateTimeKind.Utc);
    internal static readonly CleanupOptions Options = new();

    internal static PracticeSession Practice(int empireId, DateTime createdAtUtc, bool completed = true) => new()
    {
        Id = Guid.NewGuid(),
        AnonymousId = Guid.NewGuid(),
        EmpireId = empireId,
        AttemptsAllowed = 7,
        Completed = completed,
        CreatedAtUtc = createdAtUtc,
    };

    internal static UserSession Session(Guid userId, DateTime lastSeenUtc, DateTime? revokedAtUtc = null) => new()
    {
        Id = Guid.NewGuid(),
        UserId = userId,
        CreatedAtUtc = lastSeenUtc,
        LastSeenUtc = lastSeenUtc,
        RevokedAtUtc = revokedAtUtc,
    };

    internal static User NewUser() => new()
    {
        Id = Guid.NewGuid(),
        GoogleSubject = "cleanup-" + Guid.NewGuid(),
        Email = "cleanup@example.com",
        CreatedAtUtc = Now,
    };

    [Fact]
    public async Task Practice_rounds_go_after_30_days_finished_or_not()
    {
        await using var db = NewDb();
        var empire = (await SeedAsync(db, Empire("cleanup-a"))).Values.Single();
        var old = Practice(empire.Id, Now.AddDays(-31));
        var oldUnfinished = Practice(empire.Id, Now.AddDays(-30).AddMinutes(-1), completed: false);
        var recent = Practice(empire.Id, Now.AddDays(-29));
        var today = Practice(empire.Id, Now.AddMinutes(-5), completed: false);
        db.PracticeSessions.AddRange(old, oldUnfinished, recent, today);
        await db.SaveChangesAsync(Ct);

        var deleted = await db.PracticeSessions.Where(DataCleanup.StalePracticeSession(Now, Options)).Select(s => s.Id).ToListAsync(Ct);

        Assert.Equal(new[] { old.Id, oldUnfinished.Id }.Order(), deleted.Order());
    }

    [Fact]
    public async Task Login_sessions_go_when_revoked_over_7_days_ago_or_expired()
    {
        await using var db = NewDb();
        var userId = Guid.NewGuid();
        var active = Session(userId, Now.AddHours(-2));
        var revokedLongAgo = Session(userId, Now.AddDays(-10), revokedAtUtc: Now.AddDays(-8));
        var revokedRecently = Session(userId, Now.AddDays(-2), revokedAtUtc: Now.AddDays(-1));
        // Cookie lifetime (180 days) plus the LastSeenUtc lag (1 day) has passed.
        var expired = Session(userId, Now.AddDays(-182));
        // Within the lifetime: the cookie may still be out there.
        var idle = Session(userId, Now.AddDays(-179));
        var revokedRecentlyButExpired = Session(userId, Now.AddDays(-200), revokedAtUtc: Now.AddDays(-1));
        db.UserSessions.AddRange(active, revokedLongAgo, revokedRecently, expired, idle, revokedRecentlyButExpired);
        await db.SaveChangesAsync(Ct);

        var deleted = await db.UserSessions.Where(DataCleanup.DeadUserSession(Now, Options)).Select(s => s.Id).ToListAsync(Ct);

        Assert.Equal(new[] { revokedLongAgo.Id, expired.Id, revokedRecentlyButExpired.Id }.Order(), deleted.Order());
    }

    [Fact]
    public async Task Retention_comes_from_the_options()
    {
        await using var db = NewDb();
        var empire = (await SeedAsync(db, Empire("cleanup-b"))).Values.Single();
        var tenDaysOld = Practice(empire.Id, Now.AddDays(-10));
        db.PracticeSessions.Add(tenDaysOld);
        db.UserSessions.Add(Session(Guid.NewGuid(), Now.AddDays(-3), revokedAtUtc: Now.AddDays(-3)));
        await db.SaveChangesAsync(Ct);
        var shorter = new CleanupOptions { PracticeRetentionDays = 7, RevokedSessionRetentionDays = 2 };

        Assert.Equal(1, await db.PracticeSessions.CountAsync(DataCleanup.StalePracticeSession(Now, shorter), Ct));
        Assert.Equal(1, await db.UserSessions.CountAsync(DataCleanup.DeadUserSession(Now, shorter), Ct));
        Assert.Equal(0, await db.PracticeSessions.CountAsync(DataCleanup.StalePracticeSession(Now, Options), Ct));
        Assert.Equal(0, await db.UserSessions.CountAsync(DataCleanup.DeadUserSession(Now, Options), Ct));
    }

    // A failing run (here: the in-memory provider refuses ExecuteDelete) is
    // logged, and the service keeps going and stops cleanly.
    [Fact]
    public async Task A_failed_run_is_logged_and_never_escapes_the_loop()
    {
        var services = new ServiceCollection();
        var databaseName = Guid.NewGuid().ToString();
        services.AddDbContext<ImperatleDbContext>(o => o.UseInMemoryDatabase(databaseName));
        await using var provider = services.BuildServiceProvider();
        var logger = new RecordingLogger();
        var options = new CleanupOptions { InitialDelay = TimeSpan.Zero, Interval = TimeSpan.FromHours(1) };
        using var service = new DataCleanupService(
            provider.GetRequiredService<IServiceScopeFactory>(),
            new StaticOptions(options),
            TimeProvider.System,
            logger);

        await service.StartAsync(Ct);
        await logger.FirstError.Task.WaitAsync(TimeSpan.FromSeconds(10), Ct);
        await service.StopAsync(Ct);

        Assert.True(service.ExecuteTask!.IsCompletedSuccessfully);
    }

    [Fact]
    public async Task Disabled_cleanup_does_not_run()
    {
        var services = new ServiceCollection();
        await using var provider = services.BuildServiceProvider();
        var logger = new RecordingLogger();
        var options = new CleanupOptions { Enabled = false, InitialDelay = TimeSpan.Zero, Interval = TimeSpan.FromMilliseconds(10) };
        using var service = new DataCleanupService(
            provider.GetRequiredService<IServiceScopeFactory>(),
            new StaticOptions(options),
            TimeProvider.System,
            logger);

        await service.StartAsync(Ct);
        await Task.Delay(100, Ct);
        await service.StopAsync(Ct);

        // Running would have failed loudly: there is no DbContext registered.
        Assert.Empty(logger.Entries);
        Assert.True(service.ExecuteTask!.IsCompletedSuccessfully);
    }

    private sealed class StaticOptions(CleanupOptions value) : IOptionsMonitor<CleanupOptions>
    {
        public CleanupOptions CurrentValue => value;
        public CleanupOptions Get(string? name) => value;
        public IDisposable? OnChange(Action<CleanupOptions, string?> listener) => null;
    }

    private sealed class RecordingLogger : ILogger<DataCleanupService>
    {
        public List<(LogLevel Level, string Message)> Entries { get; } = [];
        public TaskCompletionSource FirstError { get; } = new(TaskCreationOptions.RunContinuationsAsynchronously);

        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            lock (Entries)
            {
                Entries.Add((logLevel, formatter(state, exception)));
            }

            if (logLevel == LogLevel.Error)
            {
                FirstError.TrySetResult();
            }
        }
    }
}

// Shares the "Postgres" collection with GuessConcurrencyPostgresTests so the
// two never migrate the same fresh database at once.
[Collection(PostgresCollection.Name)]
public class DataCleanupPostgresTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    // The real DELETEs, twice at once as two replicas would run them.
    [Fact]
    public async Task Run_deletes_only_dead_rows_in_postgres_even_when_replicas_overlap()
    {
        var connection = Environment.GetEnvironmentVariable(GuessConcurrencyPostgresTests.ConnectionVariable);
        Assert.SkipWhen(string.IsNullOrWhiteSpace(connection), $"{GuessConcurrencyPostgresTests.ConnectionVariable} is not set.");
        Assert.DoesNotContain(new Npgsql.NpgsqlConnectionStringBuilder(connection).Database, new[] { "imperatle", "imperatle_dev", "imperatle_launch", "imperatle_qa" });
        ImperatleDbContext Open() => new(new DbContextOptionsBuilder<ImperatleDbContext>().UseNpgsql(connection).Options);

        // Real time here: the database may hold other runs' rows, and the
        // cutoffs must not catch the rows that should stay.
        var now = DateTime.UtcNow;
        var user = DataCleanupTests.NewUser();
        PracticeSession oldRound, newRound;
        UserSession dead, live;
        await using (var db = Open())
        {
            await db.Database.MigrateAsync(Ct);
            if (!await db.Empires.AnyAsync(Ct))
            {
                await SeedAsync(db, Empire("pg-cleanup-a"));
            }

            var empireId = await db.Empires.Select(e => e.Id).FirstAsync(Ct);
            oldRound = DataCleanupTests.Practice(empireId, now.AddDays(-40));
            newRound = DataCleanupTests.Practice(empireId, now.AddDays(-1));
            dead = DataCleanupTests.Session(user.Id, now.AddDays(-20), revokedAtUtc: now.AddDays(-15));
            live = DataCleanupTests.Session(user.Id, now.AddHours(-1));
            db.Users.Add(user);
            db.PracticeSessions.AddRange(oldRound, newRound);
            db.UserSessions.AddRange(dead, live);
            await db.SaveChangesAsync(Ct);
        }

        await Task.WhenAll(Enumerable.Range(0, 2).Select(async _ =>
        {
            await using var db = Open();
            await DataCleanup.RunAsync(db, now, DataCleanupTests.Options, Ct);
        }));

        await using (var db = Open())
        {
            var rounds = await db.PracticeSessions.Where(s => s.Id == oldRound.Id || s.Id == newRound.Id).Select(s => s.Id).ToListAsync(Ct);
            var sessions = await db.UserSessions.Where(s => s.UserId == user.Id).Select(s => s.Id).ToListAsync(Ct);
            Assert.Equal([newRound.Id], rounds);
            Assert.Equal([live.Id], sessions);

            await db.PracticeSessions.Where(s => s.Id == newRound.Id).ExecuteDeleteAsync(Ct);
            await db.Users.Where(u => u.Id == user.Id).ExecuteDeleteAsync(Ct);
        }
    }
}
