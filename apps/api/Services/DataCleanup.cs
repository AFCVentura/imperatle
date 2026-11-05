using System.Linq.Expressions;
using Imperatle.Api.Auth;
using Imperatle.Api.Data;
using Imperatle.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Imperatle.Api.Services;

// "Cleanup" configuration section (Cleanup__Enabled=false turns it off).
public class CleanupOptions
{
    public const string SectionName = "Cleanup";

    public bool Enabled { get; set; } = true;

    // Time between runs, and before the first one (so a deploy's startup
    // work, migrations and content sync, is done first).
    public TimeSpan Interval { get; set; } = TimeSpan.FromDays(1);
    public TimeSpan InitialDelay { get; set; } = TimeSpan.FromMinutes(5);

    // Practice rounds are only read while they are played; after this they
    // go, finished or not.
    public int PracticeRetentionDays { get; set; } = 30;

    // A revoked login session is useless at once (AuthEvents refuses it);
    // it is kept a few days only to help when looking into a logout.
    public int RevokedSessionRetentionDays { get; set; } = 7;
}

// What the cleanup deletes. The rules are expressions so the tests can check
// them with a plain Where, and RunAsync can send each one to the database as
// a single DELETE.
public static class DataCleanup
{
    public static Expression<Func<PracticeSession, bool>> StalePracticeSession(DateTime nowUtc, CleanupOptions options)
    {
        var cutoff = nowUtc.AddDays(-options.PracticeRetentionDays);
        return s => s.CreatedAtUtc < cutoff;
    }

    // Revoked a while ago, or expired: the login cookie lasts
    // UserSessions.CookieLifetime after the last request that renewed it,
    // and LastSeenUtc trails that request by at most TouchInterval, so a
    // session not seen for longer than both has no cookie left anywhere.
    public static Expression<Func<UserSession, bool>> DeadUserSession(DateTime nowUtc, CleanupOptions options)
    {
        var revokedCutoff = nowUtc.AddDays(-options.RevokedSessionRetentionDays);
        var expiredCutoff = nowUtc - UserSessions.CookieLifetime - UserSessions.TouchInterval;
        return s => (s.RevokedAtUtc != null && s.RevokedAtUtc < revokedCutoff) || s.LastSeenUtc < expiredCutoff;
    }

    // One set-based DELETE per table: replicas running it at the same time
    // just find nothing left to delete.
    public static async Task<(int PracticeSessions, int UserSessions)> RunAsync(
        ImperatleDbContext db, DateTime nowUtc, CleanupOptions options, CancellationToken ct = default)
    {
        var practice = await db.PracticeSessions.Where(StalePracticeSession(nowUtc, options)).ExecuteDeleteAsync(ct);
        var sessions = await db.UserSessions.Where(DeadUserSession(nowUtc, options)).ExecuteDeleteAsync(ct);
        return (practice, sessions);
    }
}

// Runs DataCleanup about once a day on every replica (harmless, see RunAsync).
// A failed run is logged and retried at the next interval; nothing escapes
// the loop, so it never takes the API down.
public sealed class DataCleanupService(
    IServiceScopeFactory scopeFactory,
    IOptionsMonitor<CleanupOptions> options,
    TimeProvider time,
    ILogger<DataCleanupService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!await DelayAsync(options.CurrentValue.InitialDelay, stoppingToken))
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            var current = options.CurrentValue;
            if (current.Enabled)
            {
                await RunOnceAsync(current, stoppingToken);
            }

            if (!await DelayAsync(current.Interval, stoppingToken))
            {
                return;
            }
        }
    }

    private async Task RunOnceAsync(CleanupOptions current, CancellationToken ct)
    {
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<ImperatleDbContext>();
            var (practice, sessions) = await DataCleanup.RunAsync(db, time.GetUtcNow().UtcDateTime, current, ct);
            logger.LogInformation("Cleanup: {PracticeSessions} practice sessions and {UserSessions} login sessions deleted",
                practice, sessions);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            // Shutting down.
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Cleanup failed; trying again at the next run");
        }
    }

    // False when the app is stopping.
    private async Task<bool> DelayAsync(TimeSpan delay, CancellationToken ct)
    {
        try
        {
            await Task.Delay(delay < TimeSpan.Zero ? TimeSpan.Zero : delay, time, ct);
            return true;
        }
        catch (OperationCanceledException)
        {
            return false;
        }
    }
}
