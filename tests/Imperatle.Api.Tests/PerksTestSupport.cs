using Imperatle.Api.Data;
using Imperatle.Api.Game;
using Imperatle.Api.Models;
using Imperatle.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Imperatle.Api.Tests;

// Shared by the archive and practice tests: an in-memory database with a few
// empires, and a player whose supporter flag the test sets.
internal static class PerksTestSupport
{
    public const string Shape = """{"type":"MultiPolygon","coordinates":[[[[0,0],[0,1],[1,1],[0,0]]]]}""";

    public static ImperatleDbContext NewDb() => new(new DbContextOptionsBuilder<ImperatleDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString())
        .Options);

    public static EmpireContent Empire(
        string slug,
        int areaKm2 = 1000,
        int peakYear = 100,
        Continent continent = Continent.Europe) => new(
        Slug: slug,
        Name: new($"{slug} name", $"{slug} nome"),
        Peak: new(peakYear, YearPrecision.Exact),
        Start: new(peakYear - 50, YearPrecision.Exact),
        End: new(peakYear + 50, YearPrecision.Exact),
        Area: new(areaKm2, AreaPrecision.Exact),
        MapAccuracy: BorderConfidence.Precise,
        Continents: [continent],
        PrimaryContinents: [continent],
        Capital: new($"{slug} capital", $"{slug} capital"),
        Language: new("L", "L"),
        Religion: new("R", "R"),
        Curiosities: [new("1", "1"), new("2", "2"), new("3", "3")],
        Map: new([new("Polity", peakYear)]),
        Wikipedia: null)
    {
        MapShape = Shape,
    };

    public static async Task<Dictionary<string, Empire>> SeedAsync(ImperatleDbContext db, params EmpireContent[] empires)
    {
        await EmpireContentImporter.SyncAsync(db, empires);
        return await db.Empires.ToDictionaryAsync(e => e.Slug);
    }

    public static T WithHttpContext<T>(this T controller) where T : ControllerBase
    {
        controller.ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
        return controller;
    }

    // Today's daily game, over for this player (won, or lost on the last
    // attempt): what practice waits for.
    public static async Task FinishTodayAsync(ImperatleDbContext db, ICurrentPlayer player, bool won = true)
    {
        var today = GameClock.Today();
        var challenge = await ChallengeScheduler.EnsureForDateAsync(db, today);
        db.PlayerChallengeProgress.Add(new PlayerChallengeProgress
        {
            AnonymousId = player.AnonymousId,
            UserId = player.UserId,
            Date = today,
            EmpireId = challenge.EmpireId,
            AttemptsUsed = won ? 1 : GameRules.AttemptsAllowed,
            Completed = true,
            Correct = won,
            CompletedAtUtc = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
    }

    public static async Task WrongGuessesAsync(Func<int, Task<IActionResult>> guess, int empireId, int count)
    {
        for (var i = 0; i < count; i++)
        {
            await guess(empireId);
        }
    }
}

internal sealed class FakePlayer(bool supporter, Guid? anonymousId = null, Guid? userId = null) : ICurrentPlayer
{
    public bool Supporter { get; set; } = supporter;
    public Guid AnonymousId { get; } = anonymousId ?? Guid.NewGuid();
    public Guid? UserId { get; } = userId;
    public Task<bool> IsSupporterAsync(CancellationToken ct = default) => Task.FromResult(Supporter);
}
