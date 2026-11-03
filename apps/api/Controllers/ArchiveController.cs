using Imperatle.Api.Data;
using Imperatle.Api.Dtos;
using Imperatle.Api.Game;
using Imperatle.Api.Models;
using Imperatle.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Imperatle.Api.Controllers;

// Past games, a supporter perk. Same rules as the daily game (7 attempts,
// clues by wrong-guess count, attempts counted here), on any scheduled day
// before today. Progress goes in the same per-date row as the daily game,
// flagged FromArchive so it stays out of the daily stats and streak. The map
// itself comes from GET /challenges/{date}/map, which already refuses future
// dates.
[ApiController]
[Route("archive")]
public class ArchiveController(ImperatleDbContext db, ICurrentPlayer player) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        if (!await player.IsSupporterAsync(ct))
        {
            return StatusCode(StatusCodes.Status403Forbidden);
        }

        var today = GameClock.Today();

        // Numbered over every scheduled day (as NumberForAsync does), then
        // cut to the past ones.
        var dates = await db.DailyChallenges
            .AsNoTracking()
            .Where(c => c.Date <= today)
            .OrderBy(c => c.Date)
            .Select(c => c.Date)
            .ToListAsync(ct);

        var progressByDate = (await MyProgress()
                .AsNoTracking()
                .Where(p => p.Date < today)
                .ToListAsync(ct))
            .GroupBy(p => p.Date)
            .ToDictionary(g => g.Key, g => ArchiveRules.Preferred(g)!);

        var days = dates
            .Select((date, index) => (date, number: index + 1))
            .Where(d => ArchiveRules.IsPlayable(d.date, today))
            .Select(d =>
            {
                var progress = progressByDate.GetValueOrDefault(d.date);
                return new ArchiveDay(d.date, d.number, ArchiveRules.StatusOf(progress), progress?.AttemptsUsed ?? 0);
            })
            .Reverse()
            .ToList();

        return Ok(new ArchiveListResponse(today, GameRules.AttemptsAllowed, days));
    }

    [HttpGet("{date}")]
    public async Task<IActionResult> Get(DateOnly date, CancellationToken ct)
    {
        if (!await player.IsSupporterAsync(ct))
        {
            return StatusCode(StatusCodes.Status403Forbidden);
        }

        var challenge = await FindPlayableAsync(date, ct);
        if (challenge is null)
        {
            return NotFound();
        }

        var progress = await FindProgressAsync(date, ct);
        return Ok(await BuildResponseAsync(challenge, progress, ct));
    }

    [HttpPost("{date}/guess")]
    [EnableRateLimiting("guess")]
    public async Task<IActionResult> Guess(DateOnly date, [FromBody] GuessRequest request, CancellationToken ct)
    {
        if (!await player.IsSupporterAsync(ct))
        {
            return StatusCode(StatusCodes.Status403Forbidden);
        }

        var challenge = await FindPlayableAsync(date, ct);
        if (challenge is null)
        {
            return NotFound();
        }

        var guessedEmpire = await db.Empires.FindAsync([request.EmpireId], ct);
        if (guessedEmpire is null || !guessedEmpire.Active)
        {
            return BadRequest();
        }

        var progress = await FindProgressAsync(date, ct, tracking: true);
        if (progress is null)
        {
            progress = new PlayerChallengeProgress
            {
                AnonymousId = player.AnonymousId,
                UserId = player.UserId,
                Date = date,
                EmpireId = challenge.EmpireId,
            };
            db.PlayerChallengeProgress.Add(progress);
        }

        if (progress.Completed)
        {
            return Ok(new GuessResponse(progress.Correct, true, null, RevealBuilder.BuildAnswer(challenge.Empire), null));
        }

        // Also when the day was started as the daily game and is finished
        // later from here: the result no longer counts as played on its day.
        progress.FromArchive = true;
        progress.AttemptsUsed++;
        var attemptNumber = progress.AttemptsUsed;

        var correct = request.EmpireId == challenge.EmpireId;
        var gameOver = correct || attemptNumber >= GameRules.AttemptsAllowed;
        var comparison = correct ? null : RevealBuilder.BuildComparison(guessedEmpire, challenge.Empire);

        if (gameOver)
        {
            progress.Completed = true;
            progress.Correct = correct;
            progress.CompletedAtUtc = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);

        return gameOver
            ? Ok(new GuessResponse(correct, true, null, RevealBuilder.BuildAnswer(challenge.Empire), comparison))
            : Ok(new GuessResponse(false, false, RevealBuilder.BuildReveal(challenge.Empire, attemptNumber), null, comparison));
    }

    // Null for today, a future date or a day nothing was scheduled.
    private async Task<DailyChallenge?> FindPlayableAsync(DateOnly date, CancellationToken ct)
    {
        if (!ArchiveRules.IsPlayable(date, GameClock.Today()))
        {
            return null;
        }

        return await db.DailyChallenges
            .Include(c => c.Empire)
            .ThenInclude(e => e.Hints)
            .FirstOrDefaultAsync(c => c.Date == date, ct);
    }

    // The account's rows as well as this browser's, once logged in.
    private IQueryable<PlayerChallengeProgress> MyProgress()
    {
        var anonymousId = player.AnonymousId;
        return player.UserId is { } userId
            ? db.PlayerChallengeProgress.Where(p => p.UserId == userId || p.AnonymousId == anonymousId)
            : db.PlayerChallengeProgress.Where(p => p.AnonymousId == anonymousId);
    }

    private async Task<PlayerChallengeProgress?> FindProgressAsync(DateOnly date, CancellationToken ct, bool tracking = false)
    {
        var query = MyProgress().Where(p => p.Date == date);
        var rows = await (tracking ? query : query.AsNoTracking()).ToListAsync(ct);
        return ArchiveRules.Preferred(rows);
    }

    private async Task<ArchiveChallengeResponse> BuildResponseAsync(DailyChallenge challenge, PlayerChallengeProgress? progress, CancellationToken ct)
    {
        var empire = challenge.Empire;
        var attemptsUsed = progress?.AttemptsUsed ?? 0;
        var completed = progress?.Completed ?? false;
        var number = await ChallengeScheduler.NumberForAsync(db, challenge.Date);

        return new ArchiveChallengeResponse(
            challenge.Date,
            number,
            GameRules.AttemptsAllowed,
            empire.MapShape is not null,
            attemptsUsed,
            completed,
            progress?.Correct ?? false,
            !completed && attemptsUsed > 0 ? RevealBuilder.BuildReveal(empire, attemptsUsed) : null,
            completed ? RevealBuilder.BuildAnswer(empire) : null);
    }
}
