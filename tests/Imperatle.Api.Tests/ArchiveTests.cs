using Imperatle.Api.Controllers;
using Imperatle.Api.Dtos;
using Imperatle.Api.Game;
using Imperatle.Api.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using static Imperatle.Api.Tests.PerksTestSupport;

namespace Imperatle.Api.Tests;

public class ArchiveTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public void Only_days_before_today_are_playable()
    {
        var today = new DateOnly(2026, 11, 3);
        Assert.True(ArchiveRules.IsPlayable(today.AddDays(-1), today));
        Assert.True(ArchiveRules.IsPlayable(today.AddDays(-400), today));
        Assert.False(ArchiveRules.IsPlayable(today, today));
        Assert.False(ArchiveRules.IsPlayable(today.AddDays(1), today));
    }

    [Fact]
    public void Status_follows_the_progress_row()
    {
        Assert.Equal(ArchiveStatus.NotPlayed, ArchiveRules.StatusOf(null));
        Assert.Equal(ArchiveStatus.NotPlayed, ArchiveRules.StatusOf(new PlayerChallengeProgress()));
        Assert.Equal(ArchiveStatus.InProgress, ArchiveRules.StatusOf(new PlayerChallengeProgress { AttemptsUsed = 2 }));
        Assert.Equal(ArchiveStatus.Won, ArchiveRules.StatusOf(new PlayerChallengeProgress { AttemptsUsed = 3, Completed = true, Correct = true }));
        Assert.Equal(ArchiveStatus.Lost, ArchiveRules.StatusOf(new PlayerChallengeProgress { AttemptsUsed = 7, Completed = true }));
    }

    [Fact]
    public void The_accounts_row_wins_over_a_browsers_row()
    {
        var anonymous = new PlayerChallengeProgress { AttemptsUsed = 5, Completed = true };
        var account = new PlayerChallengeProgress { AttemptsUsed = 1, UserId = Guid.NewGuid() };
        Assert.Same(account, ArchiveRules.Preferred([anonymous, account]));
    }

    [Fact]
    public async Task Non_supporters_get_403_on_every_endpoint()
    {
        await using var db = NewDb();
        var empires = await SeedAsync(db, Empire("a"), Empire("b"));
        var yesterday = GameClock.Today().AddDays(-1);
        await ChallengeScheduler.EnsureForDateAsync(db, yesterday);
        var controller = new ArchiveController(db, new FakePlayer(supporter: false)).WithHttpContext();

        Assert.Equal(403, Assert.IsType<StatusCodeResult>(await controller.List(Ct)).StatusCode);
        Assert.Equal(403, Assert.IsType<StatusCodeResult>(await controller.Get(yesterday, Ct)).StatusCode);
        Assert.Equal(403, Assert.IsType<StatusCodeResult>(await controller.Guess(yesterday, new GuessRequest(empires["a"].Id), Ct)).StatusCode);
        Assert.Empty(db.PlayerChallengeProgress);
    }

    // The list never shows today (that's the daily game) nor a day already
    // scheduled ahead of time, and numbers days like the daily game does.
    [Fact]
    public async Task List_has_past_days_only_newest_first_with_the_players_results()
    {
        await using var db = NewDb();
        await SeedAsync(db, Empire("a"), Empire("b"), Empire("c"), Empire("d"), Empire("e"));
        var today = GameClock.Today();
        for (var offset = -3; offset <= 1; offset++)
        {
            await ChallengeScheduler.EnsureForDateAsync(db, today.AddDays(offset));
        }

        var player = new FakePlayer(supporter: true);
        var challenges = await db.DailyChallenges.ToDictionaryAsync(c => c.Date, Ct);
        db.PlayerChallengeProgress.AddRange(
            new PlayerChallengeProgress { AnonymousId = player.AnonymousId, Date = today.AddDays(-3), EmpireId = challenges[today.AddDays(-3)].EmpireId, AttemptsUsed = 2, Completed = true, Correct = true },
            new PlayerChallengeProgress { AnonymousId = player.AnonymousId, Date = today.AddDays(-1), EmpireId = challenges[today.AddDays(-1)].EmpireId, AttemptsUsed = 3 },
            // Someone else's game doesn't show up.
            new PlayerChallengeProgress { AnonymousId = Guid.NewGuid(), Date = today.AddDays(-2), EmpireId = challenges[today.AddDays(-2)].EmpireId, AttemptsUsed = 7, Completed = true });
        await db.SaveChangesAsync(Ct);

        var controller = new ArchiveController(db, player).WithHttpContext();
        var list = Assert.IsType<ArchiveListResponse>(Assert.IsType<OkObjectResult>(await controller.List(Ct)).Value);

        Assert.Equal(today, list.Today);
        Assert.Equal([today.AddDays(-1), today.AddDays(-2), today.AddDays(-3)], list.Days.Select(d => d.Date));
        Assert.Equal([3, 2, 1], list.Days.Select(d => d.ChallengeNumber));
        Assert.Equal([ArchiveStatus.InProgress, ArchiveStatus.NotPlayed, ArchiveStatus.Won], list.Days.Select(d => d.Status));
    }

    [Fact]
    public async Task Today_future_and_unscheduled_days_are_not_found()
    {
        await using var db = NewDb();
        var empires = await SeedAsync(db, Empire("a"), Empire("b"));
        var today = GameClock.Today();
        await ChallengeScheduler.EnsureForDateAsync(db, today);
        await ChallengeScheduler.EnsureForDateAsync(db, today.AddDays(1));
        var controller = new ArchiveController(db, new FakePlayer(supporter: true)).WithHttpContext();

        foreach (var date in new[] { today, today.AddDays(1), today.AddDays(-5) })
        {
            Assert.IsType<NotFoundResult>(await controller.Get(date, Ct));
            Assert.IsType<NotFoundResult>(await controller.Guess(date, new GuessRequest(empires["a"].Id), Ct));
        }
        Assert.Empty(db.PlayerChallengeProgress);
    }

    [Fact]
    public async Task A_past_day_plays_with_the_daily_rules_and_reveals_the_answer_only_at_the_end()
    {
        await using var db = NewDb();
        var empires = await SeedAsync(db, Empire("a"), Empire("b"));
        var day = GameClock.Today().AddDays(-2);
        var challenge = await ChallengeScheduler.EnsureForDateAsync(db, day);
        var wrong = empires.Values.First(e => e.Id != challenge.EmpireId);
        var controller = new ArchiveController(db, new FakePlayer(supporter: true)).WithHttpContext();

        var before = Assert.IsType<ArchiveChallengeResponse>(Assert.IsType<OkObjectResult>(await controller.Get(day, Ct)).Value);
        Assert.Equal(GameRules.AttemptsAllowed, before.AttemptsAllowed);
        Assert.True(before.HasMap);
        Assert.Null(before.Reveal);
        Assert.Null(before.Answer);

        for (var attempt = 1; attempt < GameRules.AttemptsAllowed; attempt++)
        {
            var response = Assert.IsType<GuessResponse>(Assert.IsType<OkObjectResult>(await controller.Guess(day, new GuessRequest(wrong.Id), Ct)).Value);
            Assert.False(response.GameOver);
            Assert.Null(response.Answer);
            Assert.NotNull(response.Reveal);
        }

        var mid = Assert.IsType<ArchiveChallengeResponse>(Assert.IsType<OkObjectResult>(await controller.Get(day, Ct)).Value);
        Assert.Equal(GameRules.AttemptsAllowed - 1, mid.AttemptsUsed);
        Assert.NotNull(mid.Reveal);
        Assert.Null(mid.Answer);

        var last = Assert.IsType<GuessResponse>(Assert.IsType<OkObjectResult>(await controller.Guess(day, new GuessRequest(wrong.Id), Ct)).Value);
        Assert.True(last.GameOver);
        Assert.False(last.Correct);
        Assert.Equal(challenge.EmpireId, last.Answer!.Id);

        // Finished: more guesses can't buy attempts.
        var replay = Assert.IsType<GuessResponse>(Assert.IsType<OkObjectResult>(await controller.Guess(day, new GuessRequest(challenge.EmpireId), Ct)).Value);
        Assert.False(replay.Correct);
        var row = await db.PlayerChallengeProgress.SingleAsync(Ct);
        Assert.Equal(GameRules.AttemptsAllowed, row.AttemptsUsed);
        Assert.True(row.FromArchive);
        Assert.Equal(day, row.Date);
    }

    // The daily game and the archive share the row for a date: a day already
    // finished as the daily game shows its result and can't be replayed, and
    // one left half-way can be finished from the archive (not counting for
    // the daily stats from then on).
    [Fact]
    public async Task A_day_started_as_the_daily_game_continues_in_the_same_row()
    {
        await using var db = NewDb();
        var empires = await SeedAsync(db, Empire("a"), Empire("b"));
        var day = GameClock.Today().AddDays(-1);
        var challenge = await ChallengeScheduler.EnsureForDateAsync(db, day);
        var player = new FakePlayer(supporter: true);
        db.PlayerChallengeProgress.Add(new PlayerChallengeProgress { AnonymousId = player.AnonymousId, Date = day, EmpireId = challenge.EmpireId, AttemptsUsed = 2 });
        await db.SaveChangesAsync(Ct);

        var controller = new ArchiveController(db, player).WithHttpContext();
        var response = Assert.IsType<GuessResponse>(Assert.IsType<OkObjectResult>(await controller.Guess(day, new GuessRequest(challenge.EmpireId), Ct)).Value);

        Assert.True(response.Correct);
        var row = await db.PlayerChallengeProgress.SingleAsync(Ct);
        Assert.Equal(3, row.AttemptsUsed);
        Assert.True(row.Completed);
        Assert.True(row.FromArchive);
    }

    [Fact]
    public async Task Archive_games_stay_out_of_the_daily_stats()
    {
        await using var db = NewDb();
        await SeedAsync(db, Empire("a"), Empire("b"), Empire("c"));
        var today = GameClock.Today();
        var anonymousId = Guid.NewGuid();
        for (var offset = -2; offset <= 0; offset++)
        {
            var challenge = await ChallengeScheduler.EnsureForDateAsync(db, today.AddDays(offset));
            db.PlayerChallengeProgress.Add(new PlayerChallengeProgress
            {
                AnonymousId = anonymousId,
                Date = challenge.Date,
                EmpireId = challenge.EmpireId,
                AttemptsUsed = 1,
                Completed = true,
                Correct = true,
                // Two days before today was caught up later, from the archive.
                FromArchive = offset == -2,
            });
        }
        await db.SaveChangesAsync(Ct);

        var context = new DefaultHttpContext();
        context.Request.Headers.Cookie = $"{ChallengesController.AnonymousCookieName}={anonymousId}";
        var controller = new StatsController(db, new FakePlayer(false, anonymousId)) { ControllerContext = new ControllerContext { HttpContext = context } };

        var stats = await controller.Get();
        Assert.Equal(2, stats.Me.Played);
        Assert.Equal(2, stats.Me.CurrentStreak);
    }
}
