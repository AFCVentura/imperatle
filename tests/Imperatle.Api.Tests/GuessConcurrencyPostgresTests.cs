using Imperatle.Api.Controllers;
using Imperatle.Api.Data;
using Imperatle.Api.Dtos;
using Imperatle.Api.Game;
using Imperatle.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using static Imperatle.Api.Tests.PerksTestSupport;

namespace Imperatle.Api.Tests;

// Guesses fired at the same time for the same game, against a real Postgres
// (the in-memory database has no xmin and no unique index to race on).
// Skipped unless IMPERATLE_TEST_POSTGRES holds a connection string, e.g.
//   Host=localhost;Port=5432;Database=imperatle_fixes;Username=imperatle;Password=imperatle
// The database is migrated and its rows are left in place: each run plays as
// a fresh anonymous player, so it can share a database with the e2e suite.
public class GuessConcurrencyPostgresTests
{
    public const string ConnectionVariable = "IMPERATLE_TEST_POSTGRES";

    private static readonly string[] ProtectedDatabases = ["imperatle", "imperatle_dev", "imperatle_launch", "imperatle_qa"];

    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static string ConnectionString()
    {
        var connection = Environment.GetEnvironmentVariable(ConnectionVariable);
        Assert.SkipWhen(string.IsNullOrWhiteSpace(connection), $"{ConnectionVariable} is not set.");
        var database = new NpgsqlConnectionStringBuilder(connection).Database;
        Assert.DoesNotContain(database, ProtectedDatabases);
        return connection!;
    }

    private static ImperatleDbContext Open(string connection) =>
        new(new DbContextOptionsBuilder<ImperatleDbContext>().UseNpgsql(connection).Options);

    // Migrated, with a few active empires and today's challenge.
    private static async Task<(DailyChallenge Today, int WrongEmpireId)> PrepareAsync(string connection)
    {
        await using var db = Open(connection);
        await db.Database.MigrateAsync(Ct);
        if (await db.Empires.CountAsync(e => e.Active, Ct) < 2)
        {
            await SeedAsync(db, Empire("pg-race-a"), Empire("pg-race-b"), Empire("pg-race-c"));
        }

        var today = await ChallengeScheduler.EnsureForDateAsync(db, GameClock.Today());
        var wrong = await db.Empires.Where(e => e.Active && e.Id != today.EmpireId).Select(e => e.Id).FirstAsync(Ct);
        return (today, wrong);
    }

    // A wrong guess that was played (counted, with its comparison), as
    // opposed to the "already over" answer, which has none.
    private static bool Counted(IActionResult result) =>
        result is OkObjectResult { Value: GuessResponse { Comparison: not null } };

    private static void Report(string label, IActionResult[] results, int attemptsUsed)
    {
        var counted = results.Count(Counted);
        var over = results.Count(r => r is OkObjectResult { Value: GuessResponse { Comparison: null, GameOver: true } });
        var conflicts = results.Count(r => r is ConflictObjectResult);
        TestContext.Current.TestOutputHelper?.WriteLine(
            $"{label}: {results.Length} parallel guesses, {counted} counted, {over} answered 'already over', {conflicts} answered 409, counter {attemptsUsed}");
    }

    [Fact]
    public async Task Parallel_daily_guesses_never_pass_the_attempt_limit()
    {
        var connection = ConnectionString();
        var (today, wrong) = await PrepareAsync(connection);
        var player = new FakePlayer(supporter: false);

        // 12 at once, the first ones also racing to insert the day's row.
        var results = await Task.WhenAll(Enumerable.Range(0, 12).Select(async _ =>
        {
            await using var db = Open(connection);
            var controller = new ChallengesController(db, new TestEnvironment()).WithHttpContext();
            return await controller.Guess(new GuessRequest(wrong), player);
        }));

        await using var check = Open(connection);
        var row = await check.PlayerChallengeProgress.AsNoTracking().SingleAsync(p => p.AnonymousId == player.AnonymousId, Ct);
        Report("daily", results, row.AttemptsUsed);

        Assert.All(results, r => Assert.True(r is OkObjectResult or ConflictObjectResult, r.GetType().Name));
        Assert.Equal(GameRules.AttemptsAllowed, row.AttemptsUsed);
        Assert.True(row.Completed);
        Assert.False(row.Correct);
        Assert.Equal(row.AttemptsUsed, row.GuessedSlugs.Count);
        Assert.Equal(row.AttemptsUsed, results.Count(Counted));
        Assert.Equal(today.EmpireId, row.EmpireId);
    }

    [Fact]
    public async Task Parallel_first_guesses_create_a_single_row()
    {
        var connection = ConnectionString();
        var (_, wrong) = await PrepareAsync(connection);
        var player = new FakePlayer(supporter: false);

        // Fewer than the limit: every one of them must count.
        var results = await Task.WhenAll(Enumerable.Range(0, 4).Select(async _ =>
        {
            await using var db = Open(connection);
            var controller = new ChallengesController(db, new TestEnvironment()).WithHttpContext();
            return await controller.Guess(new GuessRequest(wrong), player);
        }));

        await using var check = Open(connection);
        var row = await check.PlayerChallengeProgress.AsNoTracking().SingleAsync(p => p.AnonymousId == player.AnonymousId, Ct);
        Report("first guesses", results, row.AttemptsUsed);

        Assert.Equal(results.Count(Counted), row.AttemptsUsed);
        Assert.Equal(row.AttemptsUsed, row.GuessedSlugs.Count);
        Assert.All(results, r => Assert.True(Counted(r) || r is ConflictObjectResult));
    }

    [Fact]
    public async Task Parallel_practice_guesses_never_pass_the_attempt_limit()
    {
        var connection = ConnectionString();
        var (_, wrong) = await PrepareAsync(connection);
        var player = new FakePlayer(supporter: true);
        var sessionId = Guid.NewGuid();

        await using (var db = Open(connection))
        {
            await FinishTodayAsync(db, player);
            var answer = await db.Empires.Where(e => e.Active && e.Id != wrong).Select(e => e.Id).FirstAsync(Ct);
            db.PracticeSessions.Add(new PracticeSession
            {
                Id = sessionId,
                AnonymousId = player.AnonymousId,
                EmpireId = answer,
                AttemptsAllowed = 3,
                HintsEnabled = true,
                CreatedAtUtc = DateTime.UtcNow,
            });
            await db.SaveChangesAsync(Ct);
        }

        var results = await Task.WhenAll(Enumerable.Range(0, 10).Select(async _ =>
        {
            await using var db = Open(connection);
            var controller = new PracticeController(db, player, new PracticeDifficultyTiers()).WithHttpContext();
            return await controller.Guess(sessionId, new GuessRequest(wrong), Ct);
        }));

        await using var check = Open(connection);
        var session = await check.PracticeSessions.AsNoTracking().SingleAsync(s => s.Id == sessionId, Ct);
        Report("practice", results, session.AttemptsUsed);

        Assert.Equal(3, session.AttemptsUsed);
        Assert.True(session.Completed);
        Assert.Equal(3, results.Count(Counted));
    }
}
