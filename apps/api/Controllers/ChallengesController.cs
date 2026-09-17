using Imperatle.Api.Data;
using Imperatle.Api.Dtos;
using Imperatle.Api.Game;
using Imperatle.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Imperatle.Api.Controllers;

[ApiController]
[Route("challenges")]
public class ChallengesController(ImperatleDbContext db, IWebHostEnvironment env) : ControllerBase
{
    // Anonymous identity cookie -- a random id, not tied to any account yet.
    // Long-lived so a browser keeps its history across days without an account.
    private const string AnonymousCookieName = "imperatle_aid";

    [HttpGet("today")]
    public async Task<IActionResult> GetToday()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var hasChallengeToday = await db.DailyChallenges.AnyAsync(c => c.Date == today);
        if (!hasChallengeToday)
        {
            return NotFound();
        }

        var challengeNumber = today.DayNumber - GameRules.LaunchDate.DayNumber + 1;
        return Ok(new TodayChallengeResponse(today, GameRules.AttemptsAllowed, challengeNumber));
    }

    [HttpPost("today/guess")]
    [EnableRateLimiting("guess")]
    public async Task<IActionResult> Guess([FromBody] GuessRequest request)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var challenge = await db.DailyChallenges
            .Include(c => c.Empire)
            .ThenInclude(e => e.Hints)
            .FirstOrDefaultAsync(c => c.Date == today);

        if (challenge is null)
        {
            return NotFound();
        }

        var anonymousId = GetOrCreateAnonymousId();

        var progress = await db.PlayerChallengeProgress
            .FirstOrDefaultAsync(p => p.AnonymousId == anonymousId && p.Date == today);

        if (progress is null)
        {
            progress = new PlayerChallengeProgress
            {
                AnonymousId = anonymousId,
                Date = today,
                EmpireId = challenge.EmpireId,
            };
            db.PlayerChallengeProgress.Add(progress);
        }

        // Already finished today, server-side -- replaying the request (e.g. a
        // direct API call after the real game ended) can't buy more attempts.
        if (progress.Completed)
        {
            return Ok(new GuessResponse(progress.Correct, true, null, RevealBuilder.BuildAnswer(challenge.Empire)));
        }

        // The server counts attempts itself; the client's own guess history is
        // just a display convenience and is never trusted for game logic.
        progress.AttemptsUsed++;
        var attemptNumber = progress.AttemptsUsed;

        var correct = request.EmpireId == challenge.EmpireId;
        var attemptsExhausted = attemptNumber >= GameRules.AttemptsAllowed;
        var gameOver = correct || attemptsExhausted;

        if (gameOver)
        {
            progress.Completed = true;
            progress.Correct = correct;
            progress.CompletedAtUtc = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();

        if (gameOver)
        {
            return Ok(new GuessResponse(correct, true, null, RevealBuilder.BuildAnswer(challenge.Empire)));
        }

        return Ok(new GuessResponse(false, false, RevealBuilder.BuildReveal(challenge.Empire, attemptNumber), null));
    }

    // Dev-only: lets the debug button in the UI replay today's challenge
    // instead of waiting for tomorrow. Hidden entirely outside Development so
    // it can never become a public way to bypass the attempt tracking above.
    [HttpPost("today/reset")]
    public async Task<IActionResult> ResetToday()
    {
        if (!env.IsDevelopment())
        {
            return NotFound();
        }

        if (!Guid.TryParse(Request.Cookies[AnonymousCookieName], out var anonymousId))
        {
            return NoContent();
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var progress = await db.PlayerChallengeProgress
            .FirstOrDefaultAsync(p => p.AnonymousId == anonymousId && p.Date == today);

        if (progress is not null)
        {
            db.PlayerChallengeProgress.Remove(progress);
            await db.SaveChangesAsync();
        }

        return NoContent();
    }

    private Guid GetOrCreateAnonymousId()
    {
        if (Guid.TryParse(Request.Cookies[AnonymousCookieName], out var existing))
        {
            return existing;
        }

        var id = Guid.NewGuid();
        Response.Cookies.Append(AnonymousCookieName, id.ToString(), new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddYears(1),
        });
        return id;
    }
}
