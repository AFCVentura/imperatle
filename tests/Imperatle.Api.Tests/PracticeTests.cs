using System.Text.Json;
using Imperatle.Api.Controllers;
using Imperatle.Api.Dtos;
using Imperatle.Api.Game;
using Imperatle.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using static Imperatle.Api.Tests.PerksTestSupport;

namespace Imperatle.Api.Tests;

public class PracticeTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static readonly PracticeDifficultyTiers Tiers = new(new Dictionary<string, PracticeDifficulty>
    {
        ["famous"] = PracticeDifficulty.Easy,
        ["obscure-but-huge"] = PracticeDifficulty.Hard,
    });

    // --- Options and difficulty ------------------------------------------------

    [Theory]
    [InlineData(2, false)]
    [InlineData(3, true)]
    [InlineData(7, true)]
    [InlineData(10, true)]
    [InlineData(11, false)]
    public void Attempts_must_be_between_3_and_10(int attempts, bool valid)
    {
        Assert.Equal(valid, PracticeRules.IsValid(new PracticeOptions(Attempts: attempts)));
    }

    // The web app sends difficulty and map by name, eras and continents as
    // lists of numbers like every other game enum; anything left out takes
    // its default.
    [Fact]
    public void Options_read_from_the_web_apps_json()
    {
        var web = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        var read = JsonSerializer.Deserialize<PracticeOptions>(
            """{"difficulty":"Hard","attempts":5,"hints":false,"map":"Outline","eras":[0,2],"continents":[]}""", web)!;
        Assert.Equal(new PracticeOptions(PracticeDifficulty.Hard, 5, false, PracticeMapMode.Outline), read with { Eras = null, Continents = null });
        Assert.Equal([BroadEra.Antiquity, BroadEra.Modern], read.Eras);
        Assert.Empty(read.Continents!);
        Assert.Equal(new PracticeOptions(), JsonSerializer.Deserialize<PracticeOptions>("{}", web));
    }

    [Fact]
    public void Unknown_enum_values_are_rejected()
    {
        Assert.False(PracticeRules.IsValid(new PracticeOptions(Difficulty: (PracticeDifficulty)42)));
        Assert.False(PracticeRules.IsValid(new PracticeOptions(Map: (PracticeMapMode)42)));
        Assert.False(PracticeRules.IsValid(new PracticeOptions(Eras: [BroadEra.Modern, (BroadEra)42])));
        Assert.False(PracticeRules.IsValid(new PracticeOptions(Continents: [(Continent)42])));
        Assert.True(PracticeRules.IsValid(new PracticeOptions(Eras: [BroadEra.Modern, BroadEra.Antiquity], Continents: [Continent.Africa, Continent.Asia])));
    }

    [Fact]
    public void Listed_tiers_win_and_the_rest_go_by_area()
    {
        Assert.Equal(PracticeDifficulty.Easy, Tiers.TierFor("famous", 10));
        Assert.Equal(PracticeDifficulty.Hard, Tiers.TierFor("obscure-but-huge", 20_000_000));
        Assert.Equal(PracticeDifficulty.Easy, Tiers.TierFor("unlisted", 5_000_000));
        Assert.Equal(PracticeDifficulty.Medium, Tiers.TierFor("unlisted", 1_500_000));
        Assert.Equal(PracticeDifficulty.Hard, Tiers.TierFor("unlisted", 1_499_999));
    }

    [Fact]
    public void Tiers_file_parses_with_its_own_thresholds_and_first_listing_wins()
    {
        var tiers = PracticeDifficultyTiers.Parse("""
            { "thresholdsKm2": { "easy": 100, "medium": 10 }, "easy": ["x"], "hard": ["x", "y"] }
            """);
        Assert.Equal(PracticeDifficulty.Easy, tiers.TierFor("x", 0));
        Assert.Equal(PracticeDifficulty.Hard, tiers.TierFor("y", 1000));
        Assert.Equal(PracticeDifficulty.Medium, tiers.TierFor("z", 50));
    }

    // The shipped suggestion covers every empire, each in one tier only.
    [Fact]
    public void Shipped_tiers_file_lists_every_empire_once()
    {
        var json = JsonDocument.Parse(File.ReadAllText(PracticeDifficultyTiers.DefaultPath)).RootElement;
        var listed = new[] { "easy", "medium", "hard" }
            .SelectMany(tier => json.GetProperty(tier).EnumerateArray().Select(e => e.GetString()!))
            .ToList();
        var slugs = Directory.GetFiles(EmpireContentLoaderDirectory(), "*.json").Select(Path.GetFileNameWithoutExtension).ToList();

        Assert.Equal(listed.Count, listed.Distinct().Count());
        Assert.Equal(slugs.Order(), listed.Order());
    }

    private static string EmpireContentLoaderDirectory() => Imperatle.Api.Data.EmpireContentLoader.DefaultDirectory;

    [Fact]
    public void Filters_combine_difficulty_era_and_primary_continent()
    {
        var candidates = new List<PracticeRules.Candidate>
        {
            new(1, "famous", 10, 100, [Continent.Europe]),
            new(2, "obscure-but-huge", 20_000_000, 100, [Continent.Asia]),
            new(3, "big", 6_000_000, 1600, [Continent.Asia, Continent.Europe]),
            new(4, "small", 100, -500, [Continent.Africa]),
        };

        Assert.Equal([1, 2, 3, 4], PracticeRules.Eligible(candidates, new PracticeOptions(), Tiers));
        Assert.Equal([1, 3], PracticeRules.Eligible(candidates, new PracticeOptions(PracticeDifficulty.Easy), Tiers));
        Assert.Equal([2, 4], PracticeRules.Eligible(candidates, new PracticeOptions(PracticeDifficulty.Hard), Tiers));
        Assert.Equal([1, 2, 4], PracticeRules.Eligible(candidates, new PracticeOptions(Eras: [BroadEra.Antiquity]), Tiers));
        Assert.Equal([3], PracticeRules.Eligible(candidates, new PracticeOptions(Eras: [BroadEra.Modern]), Tiers));
        Assert.Equal([1, 3], PracticeRules.Eligible(candidates, new PracticeOptions(Continents: [Continent.Europe]), Tiers));
        // Several picks: any of them.
        Assert.Equal([1, 2, 3, 4], PracticeRules.Eligible(candidates, new PracticeOptions(Eras: [BroadEra.Antiquity, BroadEra.Modern]), Tiers));
        Assert.Equal([1, 3, 4], PracticeRules.Eligible(candidates, new PracticeOptions(Continents: [Continent.Europe, Continent.Africa]), Tiers));
        Assert.Equal([3], PracticeRules.Eligible(candidates, new PracticeOptions(Eras: [BroadEra.Modern], Continents: [Continent.Asia, Continent.Africa]), Tiers));
        // Empty lists mean any, like null.
        Assert.Equal([1, 2, 3, 4], PracticeRules.Eligible(candidates, new PracticeOptions(Eras: [], Continents: []), Tiers));
    }

    [Fact]
    public void Picking_skips_recent_empires_while_others_are_left()
    {
        var random = new Random(1);
        for (var i = 0; i < 50; i++)
        {
            Assert.Equal(3, PracticeRules.Pick([1, 2, 3], [1, 2], random));
        }
        // Every one was played recently: any of them will do.
        Assert.Contains(PracticeRules.Pick([1, 2], [1, 2], random), new[] { 1, 2 });
    }

    // --- Endpoints ---------------------------------------------------------------

    private static async Task<(PracticeController Controller, FakePlayer Player, Dictionary<string, Empire> Empires, Imperatle.Api.Data.ImperatleDbContext Db)> SetupAsync(int empireCount = 4)
    {
        var db = NewDb();
        var empires = await SeedAsync(db, Enumerable.Range(0, empireCount).Select(i => Empire($"e{i}")).ToArray());
        var player = new FakePlayer(supporter: true);
        await FinishTodayAsync(db, player);
        return (new PracticeController(db, player, Tiers).WithHttpContext(), player, empires, db);
    }

    private static PracticeSessionResponse Started(IActionResult result) =>
        Assert.IsType<PracticeSessionResponse>(Assert.IsType<OkObjectResult>(result).Value);

    private static GuessResponse Guessed(IActionResult result) =>
        Assert.IsType<GuessResponse>(Assert.IsType<OkObjectResult>(result).Value);

    [Fact]
    public async Task Non_supporters_get_403_on_every_endpoint()
    {
        var (controller, player, empires, db) = await SetupAsync();
        await using var _ = db;
        var session = Started(await controller.Start(new PracticeOptions(), Ct));
        player.Supporter = false;

        Assert.Equal(403, Assert.IsType<StatusCodeResult>(await controller.Pool(new PracticeOptions(), Ct)).StatusCode);
        Assert.Equal(403, Assert.IsType<StatusCodeResult>(await controller.Start(new PracticeOptions(), Ct)).StatusCode);
        Assert.Equal(403, Assert.IsType<StatusCodeResult>(await controller.Get(session.Id, Ct)).StatusCode);
        Assert.Equal(403, Assert.IsType<StatusCodeResult>(await controller.GetMap(session.Id, Ct)).StatusCode);
        Assert.Equal(403, Assert.IsType<StatusCodeResult>(await controller.Guess(session.Id, new GuessRequest(empires["e0"].Id), Ct)).StatusCode);
    }

    [Fact]
    public async Task Invalid_options_are_rejected_and_too_narrow_ones_are_unprocessable()
    {
        var (controller, _, _, db) = await SetupAsync(empireCount: 1);
        await using var _ = db;

        Assert.IsType<BadRequestResult>(await controller.Start(new PracticeOptions(Attempts: 50), Ct));
        // One empire left: can't start, whatever today's empire is.
        Assert.IsType<UnprocessableEntityResult>(await controller.Start(new PracticeOptions(), Ct));
        var pool = Assert.IsType<PracticePoolResponse>(Assert.IsType<OkObjectResult>(await controller.Pool(new PracticeOptions(), Ct)).Value);
        Assert.Equal(1, pool.Count);
    }

    // The empire never leaves the server before the round ends: not in the
    // start response, not in a reload, not in a wrong guess's response.
    [Fact]
    public async Task The_answer_stays_secret_until_the_round_ends()
    {
        var (controller, _, empires, db) = await SetupAsync();
        await using var _ = db;
        var json = new JsonSerializerOptions(JsonSerializerDefaults.Web);

        var start = await controller.Start(new PracticeOptions(Attempts: 3), Ct);
        var session = Started(start);
        var stored = await db.PracticeSessions.Include(s => s.Empire).SingleAsync(Ct);
        var answer = stored.Empire;
        var wrong = empires.Values.First(e => e.Id != answer.Id);

        void AssertNoLeak(object? value)
        {
            var text = JsonSerializer.Serialize(value, json);
            Assert.DoesNotContain(answer.NameEn, text);
            Assert.DoesNotContain(answer.Slug + "\"", text);
            Assert.DoesNotContain($"\"id\":{answer.Id},", text);
        }

        AssertNoLeak(session);
        Assert.Null(session.Answer);
        AssertNoLeak(Started(await controller.Get(session.Id, Ct)));

        for (var attempt = 1; attempt < 3; attempt++)
        {
            var response = Guessed(await controller.Guess(session.Id, new GuessRequest(wrong.Id), Ct));
            Assert.False(response.GameOver);
            Assert.Null(response.Answer);
            AssertNoLeak(response);
        }
        AssertNoLeak(Started(await controller.Get(session.Id, Ct)));

        var last = Guessed(await controller.Guess(session.Id, new GuessRequest(wrong.Id), Ct));
        Assert.True(last.GameOver);
        Assert.Equal(answer.Id, last.Answer!.Id);
        Assert.Equal(answer.Id, Started(await controller.Get(session.Id, Ct)).Answer!.Id);
    }

    [Fact]
    public async Task Rounds_follow_the_chosen_attempts_and_clue_setting()
    {
        var (controller, _, empires, db) = await SetupAsync();
        await using var _ = db;

        var withoutClues = Started(await controller.Start(new PracticeOptions(Attempts: 5, Hints: false, Map: PracticeMapMode.Outline), Ct));
        Assert.Equal(new PracticeOptions(Attempts: 5, Hints: false, Map: PracticeMapMode.Outline), withoutClues.Options with { Eras = null, Continents = null });
        Assert.Empty(withoutClues.Options.Eras!);
        Assert.Empty(withoutClues.Options.Continents!);
        var answerId = (await db.PracticeSessions.SingleAsync(s => s.Id == withoutClues.Id, Ct)).EmpireId;
        var wrong = empires.Values.First(e => e.Id != answerId);

        for (var attempt = 1; attempt < 5; attempt++)
        {
            var response = Guessed(await controller.Guess(withoutClues.Id, new GuessRequest(wrong.Id), Ct));
            Assert.False(response.GameOver);
            Assert.Null(response.Reveal);
            Assert.NotNull(response.Comparison); // the arrows are always there
        }
        Assert.True(Guessed(await controller.Guess(withoutClues.Id, new GuessRequest(wrong.Id), Ct)).GameOver);

        var withClues = Started(await controller.Start(new PracticeOptions(), Ct));
        var answer2 = (await db.PracticeSessions.SingleAsync(s => s.Id == withClues.Id, Ct)).EmpireId;
        var wrong2 = empires.Values.First(e => e.Id != answer2);
        var first = Guessed(await controller.Guess(withClues.Id, new GuessRequest(wrong2.Id), Ct));
        Assert.NotNull(first.Reveal!.BroadEra);
        var won = Guessed(await controller.Guess(withClues.Id, new GuessRequest(answer2), Ct));
        Assert.True(won.Correct);
        Assert.True(won.GameOver);
    }

    // Once today's game is over its answer is no secret any more, so every
    // empire can be drawn, today's included.
    [Fact]
    public async Task Todays_daily_empire_can_be_drawn_once_the_daily_game_is_over()
    {
        var (controller, _, _, db) = await SetupAsync(empireCount: 3);
        await using var _ = db;
        var today = await ChallengeScheduler.EnsureForDateAsync(db, GameClock.Today());

        for (var i = 0; i < 60; i++)
        {
            Started(await controller.Start(new PracticeOptions(), Ct));
        }

        Assert.Contains(today.EmpireId, await db.PracticeSessions.Select(s => s.EmpireId).ToListAsync(Ct));
    }

    private static void AssertDailyNotFinished(IActionResult result)
    {
        var conflict = Assert.IsType<ConflictObjectResult>(result);
        Assert.Equal(PracticeRules.DailyNotFinished, Assert.IsType<ErrorResponse>(conflict.Value).Code);
    }

    // Before today's game is over, practice could show today's empire (or
    // leave it out, which gives it away by elimination): every endpoint
    // answers 409, a resumed round too. Non-supporters still get 403 first.
    [Fact]
    public async Task Every_endpoint_waits_for_todays_game_to_be_over()
    {
        var db = NewDb();
        await using var _ = db;
        var empires = await SeedAsync(db, Empire("e0"), Empire("e1"), Empire("e2"));
        var today = await ChallengeScheduler.EnsureForDateAsync(db, GameClock.Today());
        var player = new FakePlayer(supporter: true);
        var controller = new PracticeController(db, player, Tiers).WithHttpContext();
        var daily = new ChallengesController(db, new TestEnvironment()).WithHttpContext();
        var wrong = empires.Values.First(e => e.Id != today.EmpireId);

        // A round from yesterday (or before a reset) still on the device.
        var old = new PracticeSession
        {
            Id = Guid.NewGuid(),
            AnonymousId = player.AnonymousId,
            EmpireId = wrong.Id,
            AttemptsAllowed = 7,
            HintsEnabled = true,
            CreatedAtUtc = DateTime.UtcNow,
        };
        db.PracticeSessions.Add(old);
        await db.SaveChangesAsync(Ct);

        async Task AllRefused()
        {
            AssertDailyNotFinished(await controller.Pool(new PracticeOptions(), Ct));
            AssertDailyNotFinished(await controller.Start(new PracticeOptions(), Ct));
            AssertDailyNotFinished(await controller.Get(old.Id, Ct));
            AssertDailyNotFinished(await controller.GetMap(old.Id, Ct));
            AssertDailyNotFinished(await controller.Guess(old.Id, new GuessRequest(wrong.Id), Ct));
        }

        // Not played yet, then halfway through.
        await AllRefused();
        await daily.Guess(new GuessRequest(wrong.Id), player);
        await AllRefused();
        Assert.Equal(0, (await db.PracticeSessions.SingleAsync(Ct)).AttemptsUsed);

        player.Supporter = false;
        Assert.Equal(403, Assert.IsType<StatusCodeResult>(await controller.Pool(new PracticeOptions(), Ct)).StatusCode);
        player.Supporter = true;

        // Lost on the last attempt: open.
        for (var i = 1; i < GameRules.AttemptsAllowed; i++)
        {
            await daily.Guess(new GuessRequest(wrong.Id), player);
        }
        Assert.IsType<OkObjectResult>(await controller.Pool(new PracticeOptions(), Ct));
        Started(await controller.Get(old.Id, Ct));
        Started(await controller.Start(new PracticeOptions(), Ct));
    }

    [Fact]
    public async Task Winning_today_opens_practice_and_signed_in_it_is_the_accounts_game()
    {
        var db = NewDb();
        await using var _ = db;
        await SeedAsync(db, Empire("e0"), Empire("e1"));
        var today = await ChallengeScheduler.EnsureForDateAsync(db, GameClock.Today());
        var userId = Guid.NewGuid();
        var laptop = new FakePlayer(supporter: true, userId: userId);
        var phone = new FakePlayer(supporter: true, userId: userId);
        var onPhone = new PracticeController(db, phone, Tiers).WithHttpContext();

        AssertDailyNotFinished(await onPhone.Pool(new PracticeOptions(), Ct));
        await new ChallengesController(db, new TestEnvironment()).WithHttpContext().Guess(new GuessRequest(today.EmpireId), laptop);
        Assert.IsType<OkObjectResult>(await onPhone.Pool(new PracticeOptions(), Ct));
    }

    [Fact]
    public async Task Practice_does_not_touch_the_daily_progress()
    {
        var (controller, _, empires, db) = await SetupAsync();
        await using var _ = db;

        var session = Started(await controller.Start(new PracticeOptions(Attempts: 3), Ct));
        for (var i = 0; i < 3; i++)
        {
            await controller.Guess(session.Id, new GuessRequest(empires["e0"].Id), Ct);
        }

        // Still the one finished daily row from the setup, as it was.
        var daily = await db.PlayerChallengeProgress.SingleAsync(Ct);
        Assert.Equal(1, daily.AttemptsUsed);
        Assert.Empty(daily.GuessedSlugs);
    }

    [Fact]
    public async Task Another_players_round_is_not_found()
    {
        var (controller, _, empires, db) = await SetupAsync();
        await using var _ = db;
        var session = Started(await controller.Start(new PracticeOptions(), Ct));

        var strangerPlayer = new FakePlayer(supporter: true);
        await FinishTodayAsync(db, strangerPlayer);
        var stranger = new PracticeController(db, strangerPlayer, Tiers).WithHttpContext();
        Assert.IsType<NotFoundResult>(await stranger.Get(session.Id, Ct));
        Assert.IsType<NotFoundResult>(await stranger.GetMap(session.Id, Ct));
        Assert.IsType<NotFoundResult>(await stranger.Guess(session.Id, new GuessRequest(empires["e0"].Id), Ct));

        var map = Assert.IsType<ContentResult>(await controller.GetMap(session.Id, Ct));
        Assert.Equal(Shape, map.Content);
        Assert.StartsWith("private", controller.Response.Headers.CacheControl.ToString());
    }
}

internal sealed class TestEnvironment : Microsoft.AspNetCore.Hosting.IWebHostEnvironment
{
    public string EnvironmentName { get; set; } = "Production";
    public string ApplicationName { get; set; } = "Imperatle.Api";
    public string WebRootPath { get; set; } = "";
    public Microsoft.Extensions.FileProviders.IFileProvider WebRootFileProvider { get; set; } = new Microsoft.Extensions.FileProviders.NullFileProvider();
    public string ContentRootPath { get; set; } = "";
    public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } = new Microsoft.Extensions.FileProviders.NullFileProvider();
}
