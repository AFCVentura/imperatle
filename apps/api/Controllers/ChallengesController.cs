using Imperatle.Api.Data;
using Imperatle.Api.Dtos;
using Imperatle.Api.Game;
using Imperatle.Api.Models;
using Imperatle.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Imperatle.Api.Controllers;

[ApiController]
[Route("challenges")]
public class ChallengesController(ImperatleDbContext db, IWebHostEnvironment env) : ControllerBase
{
    // Anonymous identity cookie, see AnonymousIdentity.
    public const string AnonymousCookieName = AnonymousIdentity.CookieName;

    [HttpGet("today")]
    public async Task<IActionResult> GetToday()
    {
        var today = GameClock.Today();

        var scheduled = await ChallengeScheduler.EnsureForDateAsync(db, today);
        var empire = await db.Empires.FindAsync(scheduled.EmpireId);

        var challengeNumber = await ChallengeScheduler.NumberForAsync(db, today);
        return Ok(new TodayChallengeResponse(today, GameRules.AttemptsAllowed, challengeNumber, empire?.MapShape is not null));
    }

    // The empire's shape for a day's challenge: bare coordinates, no name. By
    // date rather than "today" so it can be cached for good; future dates are
    // refused, or tomorrow's map would leak a day early.
    [HttpGet("{date}/map")]
    public async Task<IActionResult> GetMap(DateOnly date)
    {
        if (date > GameClock.Today())
        {
            return NotFound();
        }

        var shape = await db.DailyChallenges
            .Where(c => c.Date == date)
            .Select(c => c.Empire.MapShape)
            .FirstOrDefaultAsync();
        if (shape is null)
        {
            return NotFound();
        }

        // In Development the DEV buttons change today's empire, so a cached map
        // would show the previous empire's shape under the new one's clues.
        Response.Headers.CacheControl = env.IsDevelopment() ? "no-store" : "public, max-age=86400";
        return Content(shape, "application/json");
    }

    // The player's own game today, with the real guesses, so the board can
    // be rebuilt on another device or after the browser storage was cleared.
    // Signed in, it's the account's game. A visitor who never guessed gets an
    // empty round without being handed the anonymous cookie (the privacy
    // policy promises it only on the first guess).
    [HttpGet("today/progress")]
    public async Task<IActionResult> GetTodayProgress([FromServices] ICurrentPlayer player, CancellationToken ct)
    {
        Response.Headers.CacheControl = "no-store";
        var today = GameClock.Today();

        await ChallengeScheduler.EnsureForDateAsync(db, today);
        var challenge = await db.DailyChallenges
            .AsNoTracking()
            .Include(c => c.Empire)
            .ThenInclude(e => e.Hints)
            .FirstAsync(c => c.Date == today, ct);

        var known = player.UserId is not null || Request.Cookies.ContainsKey(AnonymousCookieName);
        var progress = known
            ? ArchiveRules.Preferred(await AccountService.ProgressOf(db, player)
                .AsNoTracking()
                .Where(p => p.Date == today)
                .ToListAsync(ct))
            : null;

        return Ok(await PlayedGuesses.ProgressAsync(db, today, challenge.Empire, progress, ct));
    }

    [HttpPost("today/guess")]
    [EnableRateLimiting("guess")]
    public async Task<IActionResult> Guess([FromBody] GuessRequest request, [FromServices] ICurrentPlayer player)
    {
        var today = GameClock.Today();

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

        // Played again from a fresh read if a simultaneous guess saved first.
        return await GuessConcurrency.RunAsync(db, async () =>
        {
            // Signed in, the attempts are the account's, shared by every device;
            // otherwise this browser's.
            var progress = await AccountService.FindProgressAsync(db, player, today);

            if (progress is null)
            {
                progress = new PlayerChallengeProgress
                {
                    AnonymousId = player.AnonymousId,
                    UserId = player.UserId,
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
            progress.GuessedSlugs = [.. progress.GuessedSlugs, guessedEmpire.Slug];
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
        });
    }

    // Dev-only: lets the debug button in the UI replay today's challenge
    // instead of waiting for tomorrow. Hidden entirely outside Development so
    // it can never become a public way to bypass the attempt tracking above.
    [HttpPost("today/reset")]
    public async Task<IActionResult> ResetToday([FromServices] ICurrentPlayer player)
    {
        if (!env.IsDevelopment())
        {
            return NotFound();
        }

        // The same rows the game reads: the account's when signed in.
        var today = GameClock.Today();
        var rows = await AccountService.ProgressOf(db, player).Where(p => p.Date == today).ToListAsync();
        if (rows.Count > 0)
        {
            db.PlayerChallengeProgress.RemoveRange(rows);
            await db.SaveChangesAsync();
        }

        return NoContent();
    }

}
