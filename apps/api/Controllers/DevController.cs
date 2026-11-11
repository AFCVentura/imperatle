using Imperatle.Api.Data;
using Imperatle.Api.Dtos;
using Imperatle.Api.Game;
using Imperatle.Api.Models;
using Imperatle.Api.Services;
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
    // Pins today's challenge to one empire (by slug, or by id for the header's
    // answer picker, which only has the public list) and wipes this player's
    // progress, so the round starts clean (no clues revealed).
    [HttpPost("today/force/{slugOrId}")]
    public async Task<IActionResult> ForceToday(string slugOrId)
    {
        if (!env.IsDevelopment())
        {
            return NotFound();
        }

        var slug = int.TryParse(slugOrId, out var id)
            ? await db.Empires.Where(e => e.Id == id && e.Active).Select(e => e.Slug).FirstOrDefaultAsync()
            : await db.Empires.Where(e => e.Slug == slugOrId && e.Active).Select(e => e.Slug).FirstOrDefaultAsync();
        if (slug is null)
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

        var today = GameClock.Today();
        var current = await ChallengeScheduler.EnsureForDateAsync(db, today);
        var empires = await db.Empires.Where(e => e.Active).Include(e => e.Hints).OrderBy(e => e.Id).ToListAsync();
        var currentIndex = empires.FindIndex(e => e.Id == current.EmpireId);
        var next = empires[(currentIndex + 1) % empires.Count];

        await DevSeeder.ForceTodayAsync(db, next.Slug);
        var player = HttpContext.RequestServices.GetRequiredService<ICurrentPlayer>();
        await RemoveOwnProgressAsync();

        // Leave the last attempt free so the round is still playable.
        var wrongGuesses = empires
            .Where(e => e.Id != next.Id)
            .OrderBy(_ => Random.Shared.Next())
            .Take(GameRules.AttemptsAllowed - 1)
            .ToList();

        db.PlayerChallengeProgress.Add(new PlayerChallengeProgress
        {
            AnonymousId = player.AnonymousId,
            UserId = player.UserId,
            Date = today,
            EmpireId = next.Id,
            AttemptsUsed = wrongGuesses.Count,
            GuessedSlugs = [.. wrongGuesses.Select(g => g.Slug)],
        });
        await db.SaveChangesAsync();

        var guesses = wrongGuesses
            .Select(g => new DevGuess(g.Id, g.NameEn, g.NamePt, RevealBuilder.BuildComparison(g, next)))
            .ToList();
        return Ok(new DevPreviewResponse(today, guesses, RevealBuilder.BuildReveal(next, wrongGuesses.Count)));
    }

    private async Task RemoveOwnProgressAsync()
    {
        // The same rows the game reads: the account's when signed in.
        var player = HttpContext.RequestServices.GetRequiredService<ICurrentPlayer>();
        var today = GameClock.Today();
        var rows = await AccountService.ProgressOf(db, player).Where(p => p.Date == today).ToListAsync();
        if (rows.Count > 0)
        {
            db.PlayerChallengeProgress.RemoveRange(rows);
            await db.SaveChangesAsync();
        }
    }
}

public record DevGuess(int EmpireId, string NameEn, string NamePt, GuessComparison Comparison);

public record DevPreviewResponse(DateOnly Date, List<DevGuess> Guesses, ChallengeReveal Reveal);
