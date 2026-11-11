using Imperatle.Api.Controllers;
using Imperatle.Api.Dtos;
using Imperatle.Api.Game;
using Imperatle.Api.Models;
using Microsoft.AspNetCore.Mvc;
using static Imperatle.Api.Tests.PerksTestSupport;

namespace Imperatle.Api.Tests;

// A guessed empire's shape is only served to the player who guessed it, in
// that round: serving any shape would let a script match the day's map
// against every empire.
public class GuessMapTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static readonly PracticeDifficultyTiers Tiers = new(new Dictionary<string, PracticeDifficulty>());

    [Fact]
    public async Task Daily_game_serves_only_the_shapes_this_player_guessed()
    {
        await using var db = NewDb();
        var empires = await SeedAsync(db, Empire("a"), Empire("b"), Empire("c"));
        var today = GameClock.Today();
        var challenge = await ChallengeScheduler.EnsureForDateAsync(db, today);
        var others = empires.Values.Where(e => e.Id != challenge.EmpireId).ToList();
        var player = new FakePlayer(supporter: false);
        var controller = new ChallengesController(db, new TestEnvironment()).WithHttpContext();

        // Nothing guessed yet: not even the empire about to be guessed.
        Assert.IsType<NotFoundResult>(await controller.GetGuessMap(today, others[0].Id, player, Ct));

        await controller.Guess(new GuessRequest(others[0].Id), player);
        var shape = Assert.IsType<ContentResult>(await controller.GetGuessMap(today, others[0].Id, player, Ct));
        Assert.Equal(Shape, shape.Content);

        // Not guessed: the other wrong empire, and the answer itself.
        Assert.IsType<NotFoundResult>(await controller.GetGuessMap(today, others[1].Id, player, Ct));
        Assert.IsType<NotFoundResult>(await controller.GetGuessMap(today, challenge.EmpireId, player, Ct));
        // Another player, or another day.
        Assert.IsType<NotFoundResult>(await controller.GetGuessMap(today, others[0].Id, new FakePlayer(supporter: false), Ct));
        Assert.IsType<NotFoundResult>(await controller.GetGuessMap(today.AddDays(-1), others[0].Id, player, Ct));
    }

    [Fact]
    public async Task Practice_serves_only_the_shapes_guessed_in_that_round()
    {
        await using var db = NewDb();
        var empires = await SeedAsync(db, Empire("p0"), Empire("p1"), Empire("p2"), Empire("p3"));
        var player = new FakePlayer(supporter: true);
        await FinishTodayAsync(db, player);
        var controller = new PracticeController(db, player, Tiers).WithHttpContext();

        var round = Assert.IsType<PracticeSessionResponse>(Assert.IsType<OkObjectResult>(await controller.Start(new PracticeOptions(), Ct)).Value);
        Assert.Equal(BorderConfidence.Precise, round.MapBorderConfidence);
        var answerId = db.PracticeSessions.Single(s => s.Id == round.Id).EmpireId;
        var wrong = empires.Values.Where(e => e.Id != answerId).ToList();

        Assert.IsType<NotFoundResult>(await controller.GetGuessMap(round.Id, wrong[0].Id, Ct));
        await controller.Guess(round.Id, new GuessRequest(wrong[0].Id), Ct);
        Assert.IsType<ContentResult>(await controller.GetGuessMap(round.Id, wrong[0].Id, Ct));
        Assert.IsType<NotFoundResult>(await controller.GetGuessMap(round.Id, wrong[1].Id, Ct));
        Assert.IsType<NotFoundResult>(await controller.GetGuessMap(round.Id, answerId, Ct));

        player.Supporter = false;
        Assert.Equal(403, Assert.IsType<StatusCodeResult>(await controller.GetGuessMap(round.Id, wrong[0].Id, Ct)).StatusCode);
    }
}
