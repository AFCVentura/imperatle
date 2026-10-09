using Imperatle.Api.Controllers;
using Imperatle.Api.Data;
using Imperatle.Api.Game;
using Imperatle.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Imperatle.Api.Tests;

// Importer and scheduler against EF Core's in-memory provider: enough to check
// what gets written, without a Postgres server.
public class DatabaseTests
{
    private static ImperatleDbContext NewDb() => new(new DbContextOptionsBuilder<ImperatleDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString())
        .Options);

    private static EmpireContent Content(string slug, string capital = "Capital") => new(
        Slug: slug,
        Name: new(slug, slug + " pt"),
        Peak: new(100, YearPrecision.Exact),
        Start: new(50, YearPrecision.Exact),
        End: new(150, YearPrecision.Exact),
        Area: new(1000, AreaPrecision.Exact),
        MapAccuracy: BorderConfidence.Precise,
        Continents: [Continent.Europe],
        PrimaryContinent: Continent.Europe,
        Capital: new(capital, capital),
        Language: new("L", "L"),
        Religion: new("R", "R"),
        Curiosities: [new("1", "1"), new("2", "2"), new("3", "3")],
        Map: new([new("Polity", 100)]))
    {
        MapShape = Shape,
    };

    private const string Shape = """{"type":"MultiPolygon","coordinates":[[[[0,0],[0,1],[1,1],[0,0]]]]}""";

    [Fact]
    public async Task Import_adds_updates_and_deactivates_by_slug()
    {
        await using var db = NewDb();

        Assert.Equal((2, 0, 0), await EmpireContentImporter.SyncAsync(db, [Content("a"), Content("b")]));
        var firstHintIds = await db.Set<EmpireHint>().Select(h => h.Id).OrderBy(id => id).ToListAsync(TestContext.Current.CancellationToken);

        // "a" changes, "b" is removed from the content, "c" is new.
        Assert.Equal((1, 1, 1), await EmpireContentImporter.SyncAsync(db, [Content("a", "New capital"), Content("c")]));

        var empires = await db.Empires.Include(e => e.Hints).ToDictionaryAsync(e => e.Slug, TestContext.Current.CancellationToken);
        Assert.Equal("New capital", empires["a"].CapitalEn);
        Assert.Equal(Shape, empires["a"].MapShape);
        Assert.False(empires["b"].Active);
        Assert.True(empires["c"].Active);

        // Hints are updated in place, not recreated.
        Assert.Equal(3, empires["a"].Hints.Count);
        Assert.Subset(firstHintIds.ToHashSet(), empires["a"].Hints.Select(h => h.Id).ToHashSet());
    }

    [Fact]
    public async Task Scheduling_a_date_is_idempotent_and_skips_inactive_empires()
    {
        await using var db = NewDb();
        await EmpireContentImporter.SyncAsync(db, [Content("a"), Content("b")]);
        await EmpireContentImporter.SyncAsync(db, [Content("a")]); // "b" leaves the rotation

        var day = new DateOnly(2026, 11, 1);
        var first = await ChallengeScheduler.EnsureForDateAsync(db, day);
        var again = await ChallengeScheduler.EnsureForDateAsync(db, day);

        Assert.Equal(first.Id, again.Id);
        Assert.Equal("a", (await db.Empires.FindAsync([first.EmpireId], TestContext.Current.CancellationToken))!.Slug);
    }

    [Fact]
    public async Task Challenge_numbers_count_scheduled_days()
    {
        await using var db = NewDb();
        await EmpireContentImporter.SyncAsync(db, [Content("a"), Content("b"), Content("c")]);

        var launch = new DateOnly(2026, 11, 1);
        for (var i = 0; i < 3; i++)
        {
            await ChallengeScheduler.EnsureForDateAsync(db, launch.AddDays(i));
        }

        Assert.Equal(1, await ChallengeScheduler.NumberForAsync(db, launch));
        Assert.Equal(3, await ChallengeScheduler.NumberForAsync(db, launch.AddDays(2)));
    }

    // The map endpoint serves a day's shape, but never a future day's: that
    // would show tomorrow's empire a day early.
    [Fact]
    public async Task Map_is_served_up_to_today_but_never_for_a_future_day()
    {
        await using var db = NewDb();
        await EmpireContentImporter.SyncAsync(db, [Content("a")]);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        await ChallengeScheduler.EnsureForDateAsync(db, today);
        await ChallengeScheduler.EnsureForDateAsync(db, today.AddDays(1));
        var controller = new ChallengesController(db, null!)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() },
        };

        var served = Assert.IsType<ContentResult>(await controller.GetMap(today));
        Assert.Equal(Shape, served.Content);
        Assert.Equal("application/json", served.ContentType);

        Assert.IsType<NotFoundResult>(await controller.GetMap(today.AddDays(1)));
        Assert.IsType<NotFoundResult>(await controller.GetMap(today.AddDays(-30))); // no challenge that day
    }
}
