using Imperatle.Api.Data;
using Imperatle.Api.Dtos;
using Imperatle.Api.Game;
using Imperatle.Api.Models;
using Imperatle.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Imperatle.Api.Controllers;

[ApiController]
[Route("stats")]
public class StatsController(ImperatleDbContext db, ICurrentPlayer player) : ControllerBase
{
    // The player's own history plus everyone's results for today's challenge.
    // Signed in, the history is the account's (every device); otherwise this
    // browser's (the anonymous cookie set on the first guess, never created
    // here). Past days played from the archive don't count: stats and streaks
    // are about the daily game.
    [HttpGet]
    public async Task<StatsResponse> Get()
    {
        var today = GameClock.Today();

        Guid? anonymousId = Guid.TryParse(Request.Cookies[ChallengesController.AnonymousCookieName], out var cookieId)
            ? cookieId
            : null;
        var userId = player.UserId;

        var mine = anonymousId is null && userId is null
            ? []
            : (await AccountService.ProgressOf(db, anonymousId, userId)
                    .AsNoTracking()
                    .Where(p => p.Completed && !p.FromArchive)
                    .ToListAsync())
                .GroupBy(p => p.Date)
                .Select(g => ArchiveRules.Preferred(g)!)
                .ToList();

        var everyoneToday = await db.PlayerChallengeProgress
            .AsNoTracking()
            .Where(p => p.Date == today && p.Completed && !p.FromArchive)
            .ToListAsync();

        var challengeNumber = await ChallengeScheduler.NumberForAsync(db, today);
        return new StatsResponse(
            StatsCalculator.ForPlayer(mine, today),
            StatsCalculator.ForToday(everyoneToday, today, challengeNumber));
    }
}
