using Imperatle.Api.Data;
using Imperatle.Api.Dtos;
using Imperatle.Api.Game;
using Imperatle.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Imperatle.Api.Controllers;

// Dev-only tools behind the DEV buttons in the header, for checking content
// (maps, clues) without playing a real round. Every action 404s outside
// Development, same as ChallengesController.ResetToday.
[ApiController]
[Route("dev")]
public class DevController(ImperatleDbContext db, IWebHostEnvironment env) : ControllerBase
{
    // Pins today's challenge to one empire and wipes this player's progress,
    // so the round starts clean (no clues revealed).
    [HttpPost("today/force/{slug}")]
    public async Task<IActionResult> ForceToday(string slug)
    {
        if (!env.IsDevelopment())
        {
            return NotFound();
        }

        if (!await db.Empires.AnyAsync(e => e.Slug == slug && e.Active))
        {
            return NotFound();
        }

        await DevSeeder.ForceTodayAsync(db, slug);
        await RemoveOwnProgressAsync();
        return NoContent();
    }

    // Moves today's challenge to the next empire (by id, wrapping around) and
    // plays random wrong guesses for this player, up to the last attempt, so
    // every clue is already revealed. The client stores the returned guesses
    // and reveal as its local progress.
    [HttpPost("today/next-with-guesses")]
    public async Task<IActionResult> NextWithGuesses()
    {
        if (!env.IsDevelopment())
        {
            return NotFound();
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var current = await ChallengeScheduler.EnsureForDateAsync(db, today);
        var empires = await db.Empires.Where(e => e.Active).Include(e => e.Hints).OrderBy(e => e.Id).ToListAsync();
        var currentIndex = empires.FindIndex(e => e.Id == current.EmpireId);
        var next = empires[(currentIndex + 1) % empires.Count];

        await DevSeeder.ForceTodayAsync(db, next.Slug);
        await RemoveOwnProgressAsync();

        // Leave the last attempt free so the round is still playable.
        var wrongGuesses = empires
            .Where(e => e.Id != next.Id)
            .OrderBy(_ => Random.Shared.Next())
            .Take(GameRules.AttemptsAllowed - 1)
            .ToList();

        db.PlayerChallengeProgress.Add(new PlayerChallengeProgress
        {
            AnonymousId = ChallengesController.GetOrCreateAnonymousId(Request, Response),
            Date = today,
            EmpireId = next.Id,
            AttemptsUsed = wrongGuesses.Count,
        });
        await db.SaveChangesAsync();

        var guesses = wrongGuesses
            .Select(g => new DevGuess(g.Id, g.NameEn, g.NamePt, RevealBuilder.BuildComparison(g, next)))
            .ToList();
        return Ok(new DevPreviewResponse(today, guesses, RevealBuilder.BuildReveal(next, wrongGuesses.Count)));
    }

    private async Task RemoveOwnProgressAsync()
    {
        if (!Guid.TryParse(Request.Cookies[ChallengesController.AnonymousCookieName], out var anonymousId))
        {
            return;
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var progress = await db.PlayerChallengeProgress
            .FirstOrDefaultAsync(p => p.AnonymousId == anonymousId && p.Date == today);
        if (progress is not null)
        {
            db.PlayerChallengeProgress.Remove(progress);
            await db.SaveChangesAsync();
        }
    }
}

public record DevGuess(int EmpireId, string NameEn, string NamePt, GuessComparison Comparison);

public record DevPreviewResponse(DateOnly Date, List<DevGuess> Guesses, ChallengeReveal Reveal);
