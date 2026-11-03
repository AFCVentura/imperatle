using Imperatle.Api.Data;
using Imperatle.Api.Dtos;
using Imperatle.Api.Game;
using Imperatle.Api.Models;
using Imperatle.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Imperatle.Api.Controllers;

// Practice mode, a supporter perk: a random empire per round, with options
// picked before it starts. Each round is a PracticeSession row; the client
// only ever holds its id, so the empire stays on the server until the round
// ends, and attempts are counted here as in the daily game. Rounds never
// touch PlayerChallengeProgress, so the daily stats and streak can't move.
[ApiController]
[Route("practice")]
public class PracticeController(
    ImperatleDbContext db,
    ICurrentPlayer player,
    PracticeDifficultyTiers tiers) : ControllerBase
{
    // How many empires the options leave. Counted without holding back
    // today's daily empire, so toggling filters can't hint at what it is.
    [HttpGet("pool")]
    public async Task<IActionResult> Pool([FromQuery] PracticeOptions options, CancellationToken ct)
    {
        if (!await player.IsSupporterAsync(ct))
        {
            return StatusCode(StatusCodes.Status403Forbidden);
        }

        if (!PracticeRules.IsValid(options))
        {
            return BadRequest();
        }

        var (pool, _) = await PoolAsync(options, ct);
        return Ok(new PracticePoolResponse(pool.Count));
    }

    [HttpPost]
    [EnableRateLimiting("guess")]
    public async Task<IActionResult> Start([FromBody] PracticeOptions options, CancellationToken ct)
    {
        if (!await player.IsSupporterAsync(ct))
        {
            return StatusCode(StatusCodes.Status403Forbidden);
        }

        if (!PracticeRules.IsValid(options))
        {
            return BadRequest();
        }

        var (pool, todayEmpireId) = await PoolAsync(options, ct);
        if (pool.Count < PracticeRules.MinPoolSize)
        {
            return UnprocessableEntity();
        }
        var eligible = pool.Where(id => id != todayEmpireId).ToList();

        var recent = await MySessions()
            .OrderByDescending(s => s.CreatedAtUtc)
            .Take(PracticeRules.RecentRoundsHeldBack)
            .Select(s => s.EmpireId)
            .ToListAsync(ct);

        var session = new PracticeSession
        {
            Id = Guid.NewGuid(),
            AnonymousId = player.AnonymousId,
            UserId = player.UserId,
            EmpireId = PracticeRules.Pick(eligible, recent, Random.Shared),
            Difficulty = options.Difficulty,
            Era = options.Era,
            Continent = options.Continent,
            AttemptsAllowed = options.Attempts,
            HintsEnabled = options.Hints,
            MapMode = options.Map,
            CreatedAtUtc = DateTime.UtcNow,
        };
        db.PracticeSessions.Add(session);
        await db.SaveChangesAsync(ct);

        // Every candidate has a map (PoolAsync), so no need to load it.
        return Ok(new PracticeSessionResponse(session.Id, OptionsOf(session), true, 0, false, false, null, null));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
    {
        if (!await player.IsSupporterAsync(ct))
        {
            return StatusCode(StatusCodes.Status403Forbidden);
        }

        var session = await FindAsync(id, ct);
        if (session is null)
        {
            return NotFound();
        }

        return Ok(new PracticeSessionResponse(
            session.Id,
            OptionsOf(session),
            session.Empire.MapShape is not null,
            session.AttemptsUsed,
            session.Completed,
            session.Correct,
            session.Completed ? null : PracticeRules.RevealFor(session, session.Empire, session.AttemptsUsed),
            session.Completed ? RevealBuilder.BuildAnswer(session.Empire) : null));
    }

    // The round's shape: coordinates only, like the daily map. Only to the
    // player who owns the round, and never cached by a shared cache.
    [HttpGet("{id:guid}/map")]
    public async Task<IActionResult> GetMap(Guid id, CancellationToken ct)
    {
        if (!await player.IsSupporterAsync(ct))
        {
            return StatusCode(StatusCodes.Status403Forbidden);
        }

        var shape = await MySessions()
            .Where(s => s.Id == id)
            .Select(s => s.Empire.MapShape)
            .FirstOrDefaultAsync(ct);
        if (shape is null)
        {
            return NotFound();
        }

        Response.Headers.CacheControl = "private, max-age=86400";
        return Content(shape, "application/json");
    }

    [HttpPost("{id:guid}/guess")]
    [EnableRateLimiting("guess")]
    public async Task<IActionResult> Guess(Guid id, [FromBody] GuessRequest request, CancellationToken ct)
    {
        if (!await player.IsSupporterAsync(ct))
        {
            return StatusCode(StatusCodes.Status403Forbidden);
        }

        var session = await FindAsync(id, ct, tracking: true);
        if (session is null)
        {
            return NotFound();
        }

        var guessedEmpire = await db.Empires.FindAsync([request.EmpireId], ct);
        if (guessedEmpire is null || !guessedEmpire.Active)
        {
            return BadRequest();
        }

        if (session.Completed)
        {
            return Ok(new GuessResponse(session.Correct, true, null, RevealBuilder.BuildAnswer(session.Empire), null));
        }

        session.AttemptsUsed++;
        var attemptNumber = session.AttemptsUsed;

        var correct = request.EmpireId == session.EmpireId;
        var gameOver = correct || attemptNumber >= session.AttemptsAllowed;
        var comparison = correct ? null : RevealBuilder.BuildComparison(guessedEmpire, session.Empire);

        if (gameOver)
        {
            session.Completed = true;
            session.Correct = correct;
            session.CompletedAtUtc = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);

        return gameOver
            ? Ok(new GuessResponse(correct, true, null, RevealBuilder.BuildAnswer(session.Empire), comparison))
            : Ok(new GuessResponse(false, false, PracticeRules.RevealFor(session, session.Empire, attemptNumber), null, comparison));
    }

    // The empires matching the options, and today's daily empire, which a
    // round must skip: practice can't be a way to learn today's answer.
    private async Task<(List<int> Pool, int? TodayEmpireId)> PoolAsync(PracticeOptions options, CancellationToken ct)
    {
        // About a hundred rows: filtering in memory keeps the tier rule in
        // one place (PracticeRules) instead of translating it to SQL.
        var candidates = (await db.Empires
                .AsNoTracking()
                .Where(e => e.Active && e.MapShape != null)
                .Select(e => new { e.Id, e.Slug, e.PeakAreaKm2, e.ReferenceYear, e.PrimaryContinents })
                .ToListAsync(ct))
            .Select(e => new PracticeRules.Candidate(e.Id, e.Slug, e.PeakAreaKm2, e.ReferenceYear, e.PrimaryContinents));

        var todayEmpireId = await db.DailyChallenges
            .Where(c => c.Date == GameClock.Today())
            .Select(c => (int?)c.EmpireId)
            .FirstOrDefaultAsync(ct);

        return (PracticeRules.Eligible(candidates, options, tiers, excludedId: null), todayEmpireId);
    }

    private IQueryable<PracticeSession> MySessions()
    {
        var anonymousId = player.AnonymousId;
        return player.UserId is { } userId
            ? db.PracticeSessions.Where(s => s.UserId == userId || s.AnonymousId == anonymousId)
            : db.PracticeSessions.Where(s => s.AnonymousId == anonymousId);
    }

    // Someone else's round id answers 404, same as a made-up one.
    private Task<PracticeSession?> FindAsync(Guid id, CancellationToken ct, bool tracking = false)
    {
        var query = MySessions().Where(s => s.Id == id).Include(s => s.Empire).ThenInclude(e => e.Hints);
        return (tracking ? query : query.AsNoTracking()).FirstOrDefaultAsync(ct);
    }

    private static PracticeOptions OptionsOf(PracticeSession s) =>
        new(s.Difficulty, s.AttemptsAllowed, s.HintsEnabled, s.MapMode, s.Era, s.Continent);
}
