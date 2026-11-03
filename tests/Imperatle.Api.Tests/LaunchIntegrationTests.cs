using System.Net;
using System.Net.Http.Json;
using Imperatle.Api.Controllers;
using Imperatle.Api.Data;
using Imperatle.Api.Dtos;
using Imperatle.Api.Game;
using Imperatle.Api.Models;
using Imperatle.Api.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using static Imperatle.Api.Tests.PerksTestSupport;

namespace Imperatle.Api.Tests;

// What the three launch features have to agree on: the daily game, the
// archive, the stats and practice all read the same player's rows, the
// guesses are stored so another device can rebuild the board, and the
// practice pool reads its options from the query string.
public class LaunchIntegrationTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static ChallengesController Challenges(ImperatleDbContext db, string? cookieAnonymousId = null)
    {
        var context = new DefaultHttpContext();
        if (cookieAnonymousId is not null)
        {
            context.Request.Headers.Cookie = $"{ChallengesController.AnonymousCookieName}={cookieAnonymousId}";
        }

        return new ChallengesController(db, new FakeEnvironment()) { ControllerContext = new ControllerContext { HttpContext = context } };
    }

    private static ChallengeProgressResponse Progress(IActionResult result) =>
        Assert.IsType<ChallengeProgressResponse>(Assert.IsType<OkObjectResult>(result).Value);

    [Fact]
    public async Task A_second_device_signed_in_rebuilds_the_board_with_the_real_guesses()
    {
        await using var db = NewDb();
        var empires = await SeedAsync(db, Empire("a", areaKm2: 1000), Empire("b", areaKm2: 5000), Empire("c", areaKm2: 9000));
        var today = await ChallengeScheduler.EnsureForDateAsync(db, GameClock.Today());
        var wrong = empires.Values.Where(e => e.Id != today.EmpireId).ToList();
        var userId = Guid.NewGuid();
        var laptop = new FakePlayer(false, Guid.NewGuid(), userId);
        var phone = new FakePlayer(false, Guid.NewGuid(), userId);

        await Challenges(db).Guess(new GuessRequest(wrong[0].Id), laptop);
        await Challenges(db).Guess(new GuessRequest(wrong[1].Id), laptop);

        var onPhone = Progress(await Challenges(db).GetTodayProgress(phone, Ct));
        Assert.Equal(2, onPhone.AttemptsUsed);
        Assert.False(onPhone.Completed);
        Assert.Equal([wrong[0].Id, wrong[1].Id], onPhone.Guesses.Select(g => g.EmpireId));
        Assert.All(onPhone.Guesses, g => Assert.NotNull(g.Comparison));
        Assert.NotNull(onPhone.Reveal);
        // The answer stays on the server until the round ends.
        Assert.Null(onPhone.Answer);

        // The phone finishes the round; the laptop sees the same end.
        await Challenges(db).Guess(new GuessRequest(today.EmpireId), phone);
        var onLaptop = Progress(await Challenges(db).GetTodayProgress(laptop, Ct));
        Assert.True(onLaptop.Completed);
        Assert.True(onLaptop.Correct);
        Assert.Equal(3, onLaptop.Guesses.Count);
        Assert.True(onLaptop.Guesses[^1].Correct);
        Assert.Null(onLaptop.Guesses[^1].Comparison);
        Assert.NotNull(onLaptop.Answer);
    }

    [Fact]
    public async Task A_visitor_who_never_guessed_gets_an_empty_round_and_no_cookie()
    {
        await using var db = NewDb();
        await SeedAsync(db, Empire("a"), Empire("b"));
        await ChallengeScheduler.EnsureForDateAsync(db, GameClock.Today());
        var controller = Challenges(db);

        var progress = Progress(await controller.GetTodayProgress(new FakePlayer(false), Ct));

        Assert.Equal(0, progress.AttemptsUsed);
        Assert.Empty(progress.Guesses);
        Assert.Null(progress.Reveal);
        Assert.False(controller.Response.Headers.ContainsKey("Set-Cookie"));
    }

    [Fact]
    public async Task Stats_signed_in_count_the_account_games_from_every_device()
    {
        await using var db = NewDb();
        await SeedAsync(db, Empire("a"), Empire("b"));
        var userId = Guid.NewGuid();
        var laptop = Guid.NewGuid();
        var phone = Guid.NewGuid();
        var today = GameClock.Today();
        foreach (var (offset, browser) in new[] { (-1, laptop), (0, phone) })
        {
            var challenge = await ChallengeScheduler.EnsureForDateAsync(db, today.AddDays(offset));
            db.PlayerChallengeProgress.Add(new PlayerChallengeProgress
            {
                AnonymousId = browser,
                UserId = userId,
                Date = challenge.Date,
                EmpireId = challenge.EmpireId,
                AttemptsUsed = 2,
                Completed = true,
                Correct = true,
            });
        }
        await db.SaveChangesAsync(Ct);

        var context = new DefaultHttpContext();
        context.Request.Headers.Cookie = $"{ChallengesController.AnonymousCookieName}={laptop}";
        var stats = await new StatsController(db, new FakePlayer(false, laptop, userId))
        {
            ControllerContext = new ControllerContext { HttpContext = context },
        }.Get();

        Assert.Equal(2, stats.Me.Played);
        Assert.Equal(2, stats.Me.CurrentStreak);
    }

    [Fact]
    public async Task Archive_and_daily_game_read_the_same_account_row()
    {
        await using var db = NewDb();
        var empires = await SeedAsync(db, Empire("a"), Empire("b"), Empire("c"));
        var yesterday = await ChallengeScheduler.EnsureForDateAsync(db, GameClock.Today().AddDays(-1));
        var wrong = empires.Values.First(e => e.Id != yesterday.EmpireId);
        var userId = Guid.NewGuid();

        // Played yesterday as the daily game on the laptop...
        db.PlayerChallengeProgress.Add(new PlayerChallengeProgress
        {
            AnonymousId = Guid.NewGuid(),
            UserId = userId,
            Date = yesterday.Date,
            EmpireId = yesterday.EmpireId,
            AttemptsUsed = 1,
            GuessedSlugs = [wrong.Slug],
        });
        await db.SaveChangesAsync(Ct);

        // ...and continued from the archive on the phone.
        var phone = new FakePlayer(true, Guid.NewGuid(), userId);
        var archive = new ArchiveController(db, phone).WithHttpContext();
        var day = Assert.IsType<ArchiveChallengeResponse>(Assert.IsType<OkObjectResult>(await archive.Get(yesterday.Date, Ct)).Value);
        Assert.Equal(1, day.AttemptsUsed);
        Assert.Equal([wrong.Id], day.Guesses.Select(g => g.EmpireId));

        await archive.Guess(yesterday.Date, new GuessRequest(wrong.Id), Ct);
        var row = await db.PlayerChallengeProgress.SingleAsync(Ct);
        Assert.Equal(2, row.AttemptsUsed);
        Assert.Equal([wrong.Slug, wrong.Slug], row.GuessedSlugs);
        Assert.True(row.FromArchive);
    }

    [Fact]
    public async Task Deleting_an_account_also_deletes_its_practice_rounds()
    {
        await using var db = NewDb();
        var empires = await SeedAsync(db, Empire("a"));
        var user = new User { Id = Guid.NewGuid(), GoogleSubject = "g", CreatedAtUtc = DateTime.UtcNow };
        db.Users.Add(user);
        db.PracticeSessions.Add(new PracticeSession { Id = Guid.NewGuid(), UserId = user.Id, EmpireId = empires["a"].Id, CreatedAtUtc = DateTime.UtcNow });
        db.PracticeSessions.Add(new PracticeSession { Id = Guid.NewGuid(), EmpireId = empires["a"].Id, CreatedAtUtc = DateTime.UtcNow });
        await db.SaveChangesAsync(Ct);

        Assert.True(await AccountService.DeleteAccountAsync(db, user.Id, Ct));

        Assert.Null((await db.PracticeSessions.SingleAsync(Ct)).UserId);
    }

    [Fact]
    public async Task Login_moves_the_browser_practice_rounds_into_the_account()
    {
        await using var db = NewDb();
        var empires = await SeedAsync(db, Empire("a"));
        var browser = Guid.NewGuid();
        var userId = Guid.NewGuid();
        db.PracticeSessions.Add(new PracticeSession { Id = Guid.NewGuid(), AnonymousId = browser, EmpireId = empires["a"].Id, CreatedAtUtc = DateTime.UtcNow });
        await db.SaveChangesAsync(Ct);

        await AccountService.ClaimAnonymousProgressAsync(db, browser, userId, Ct);

        Assert.Equal(userId, (await db.PracticeSessions.SingleAsync(Ct)).UserId);
    }

    // GET /practice/pool through the real MVC pipeline: the options come from
    // the query string exactly as apps/web/src/lib/api.ts builds it.
    [Fact]
    public async Task Practice_pool_reads_its_options_from_the_query_string()
    {
        var databaseName = Guid.NewGuid().ToString();
        var root = new InMemoryDatabaseRoot();
        var player = new FakePlayer(true);
        ImperatleDbContext OpenDb() => new(new DbContextOptionsBuilder<ImperatleDbContext>().UseInMemoryDatabase(databaseName, root).Options);
        await using (var seed = OpenDb())
        {
            await SeedAsync(seed,
                Empire("old-europe", peakYear: 100, continent: Continent.Europe),
                Empire("old-asia", peakYear: 200, continent: Continent.Asia),
                Empire("new-europe", peakYear: 1900, continent: Continent.Europe));
        }

        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseTestServer();
        builder.Services.AddControllers().AddApplicationPart(typeof(PracticeController).Assembly);
        builder.Services.AddDbContext<ImperatleDbContext>(o => o.UseInMemoryDatabase(databaseName, root));
        builder.Services.AddScoped<ICurrentPlayer>(_ => player);
        builder.Services.AddSingleton(new PracticeDifficultyTiers());
        await using var app = builder.Build();
        app.MapControllers();
        await app.StartAsync(Ct);
        var client = app.GetTestClient();

        // Until today's game is over: 409 with the code the web app reads.
        var waiting = await client.GetAsync("/practice/pool", Ct);
        Assert.Equal(HttpStatusCode.Conflict, waiting.StatusCode);
        Assert.Equal("""{"code":"daily_not_finished"}""", await waiting.Content.ReadAsStringAsync(Ct));
        await using (var played = OpenDb())
        {
            await FinishTodayAsync(played, player);
        }

        async Task<int> Count(string query)
        {
            var response = await client.GetAsync($"/practice/pool?{query}", Ct);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            return (await response.Content.ReadFromJsonAsync<PracticePoolResponse>(Ct))!.Count;
        }

        // Defaults, all filters, then each filter on its own (numbers for
        // era and continent, names for difficulty and map, as the web sends).
        Assert.Equal(3, await Count(""));
        Assert.Equal(3, await Count("difficulty=Any&attempts=7&hints=true&map=Progressive"));
        Assert.Equal(2, await Count($"difficulty=Any&attempts=7&hints=true&map=Progressive&continent={(int)Continent.Europe}"));
        Assert.Equal(2, await Count($"difficulty=Any&attempts=5&hints=false&map=Full&era={(int)BroadEra.Antiquity}"));
        Assert.Equal(1, await Count($"era={(int)BroadEra.Antiquity}&continent={(int)Continent.Asia}"));

        // Out-of-range attempts are refused, not silently replaced by the default.
        var invalid = await client.GetAsync("/practice/pool?attempts=50", Ct);
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
    }

    private sealed class FakeEnvironment : IWebHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Production";
        public string ApplicationName { get; set; } = "Imperatle.Api";
        public string WebRootPath { get; set; } = "";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string ContentRootPath { get; set; } = "";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
