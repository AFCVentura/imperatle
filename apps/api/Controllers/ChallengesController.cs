using Imperatle.Api.Data;
using Imperatle.Api.Dtos;
using Imperatle.Api.Game;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Imperatle.Api.Controllers;

[ApiController]
[Route("challenges")]
public class ChallengesController(ImperatleDbContext db) : ControllerBase
{
    [HttpGet("today")]
    public async Task<IActionResult> GetToday()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var hasChallengeToday = await db.DailyChallenges.AnyAsync(c => c.Date == today);
        if (!hasChallengeToday)
        {
            return NotFound();
        }

        return Ok(new TodayChallengeResponse(today, GameRules.AttemptsAllowed));
    }

    [HttpPost("today/guess")]
    public async Task<IActionResult> Guess([FromBody] GuessRequest request)
    {
        if (request.AttemptNumber < 1 || request.AttemptNumber > GameRules.AttemptsAllowed)
        {
            return BadRequest();
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var challenge = await db.DailyChallenges
            .Include(c => c.Empire)
            .ThenInclude(e => e.Hints)
            .FirstOrDefaultAsync(c => c.Date == today);

        if (challenge is null)
        {
            return NotFound();
        }

        var correct = request.EmpireId == challenge.EmpireId;
        var attemptsExhausted = request.AttemptNumber >= GameRules.AttemptsAllowed;
        var gameOver = correct || attemptsExhausted;

        if (gameOver)
        {
            return Ok(new GuessResponse(correct, true, null, RevealBuilder.BuildAnswer(challenge.Empire)));
        }

        return Ok(new GuessResponse(false, false, RevealBuilder.BuildReveal(challenge.Empire, request.AttemptNumber), null));
    }
}
