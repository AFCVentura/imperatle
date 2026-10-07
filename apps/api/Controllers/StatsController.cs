using Imperatle.Api.Data;
using Imperatle.Api.Dtos;
using Imperatle.Api.Game;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Imperatle.Api.Controllers;

[ApiController]
[Route("stats")]
public class StatsController(ImperatleDbContext db) : ControllerBase
{
    // The player's own history (by the anonymous cookie set on their first
    // guess) plus everyone's results for today's challenge.
    [HttpGet]
    public async Task<StatsResponse> Get()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var mine = Guid.TryParse(Request.Cookies[ChallengesController.AnonymousCookieName], out var anonymousId)
            ? await db.PlayerChallengeProgress
                .AsNoTracking()
                .Where(p => p.AnonymousId == anonymousId && p.Completed)
                .ToListAsync()
            : [];

        var everyoneToday = await db.PlayerChallengeProgress
            .AsNoTracking()
            .Where(p => p.Date == today && p.Completed)
            .ToListAsync();

        return new StatsResponse(StatsCalculator.ForPlayer(mine, today), StatsCalculator.ForToday(everyoneToday, today));
    }
}
