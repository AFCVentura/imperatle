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
    public const string AnonymousCookieName = "imperatle_aid";

    [HttpGet("today")]
    public async Task<IActionResult> GetToday()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var scheduled = await ChallengeScheduler.EnsureForDateAsync(db, today);
        var empire = await db.Empires.FindAsync(scheduled.EmpireId);

        var challengeNumber = await ChallengeScheduler.NumberForAsync(db, today);
        var mapUrl = empire?.MapFile is null ? null : $"/maps/{empire.MapFile}";
        return Ok(new TodayChallengeResponse(today, GameRules.AttemptsAllowed, challengeNumber, mapUrl));
    }

    [HttpPost("today/guess")]
    [EnableRateLimiting("guess")]
    public async Task<IActionResult> Guess([FromBody] GuessRequest request)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        await ChallengeScheduler.EnsureForDateAsync(db, today);
        var challenge = await db.DailyChallenges
            .Include(c => c.Empire)
            .ThenInclude(e => e.Hints)
            .FirstAsync(c => c.Date == today);

        var guessedEmpire = await db.Empires.FindAsync(request.EmpireId);
        if (guessedEmpire is null || !guessedEmpire.Active)
        {
            return BadRequest();
        }

        var anonymousId = GetOrCreateAnonymousId(Request, Response);

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
            return Ok(new GuessResponse(progress.Correct, true, null, RevealBuilder.BuildAnswer(challenge.Empire), null));
        }

        // The server counts attempts itself; the client's own guess history is
        // just a display convenience and is never trusted for game logic.
        progress.AttemptsUsed++;
        var attemptNumber = progress.AttemptsUsed;

        var correct = request.EmpireId == challenge.EmpireId;
        var attemptsExhausted = attemptNumber >= GameRules.AttemptsAllowed;
        var gameOver = correct || attemptsExhausted;
        var comparison = correct ? null : RevealBuilder.BuildComparison(guessedEmpire, challenge.Empire);

        if (gameOver)
        {
            progress.Completed = true;
            progress.Correct = correct;
            progress.CompletedAtUtc = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();

        if (gameOver)
        {
            return Ok(new GuessResponse(correct, true, null, RevealBuilder.BuildAnswer(challenge.Empire), comparison));
        }

        return Ok(new GuessResponse(false, false, RevealBuilder.BuildReveal(challenge.Empire, attemptNumber), null, comparison));
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

    // Static so the dev tools (DevController) can identify the player the same way.
    internal static Guid GetOrCreateAnonymousId(HttpRequest request, HttpResponse response)
    {
        if (Guid.TryParse(request.Cookies[AnonymousCookieName], out var existing))
        {
            return existing;
        }

        var id = Guid.NewGuid();
        response.Cookies.Append(AnonymousCookieName, id.ToString(), new CookieOptions
        {
            HttpOnly = true,
            Secure = request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddYears(1),
        });
        return id;
    }
}
