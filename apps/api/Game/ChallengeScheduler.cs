using Imperatle.Api.Data;
using Imperatle.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Imperatle.Api.Game;

// Picks each day's empire. Rotation rule: every active empire appears once
// before any repeats (a "cycle"), in random order; when a new cycle starts,
// the last few empires of the previous one are held back so the same empire
// never shows up twice in a short span across the boundary.
//
// A row in DailyChallenges is the schedule itself: to pin a date (an
// anniversary, say), insert that row by hand and the scheduler leaves it alone.
public static class ChallengeScheduler
{
    // Days at the end of a cycle that can't open the next one.
    public const int CycleBoundaryGap = 3;

    // history: empire ids of past challenges, most recent first.
    public static int PickNext(IReadOnlyCollection<int> activeEmpireIds, IReadOnlyList<int> history, Random random)
    {
        if (activeEmpireIds.Count == 0)
        {
            throw new InvalidOperationException("No active empires to schedule.");
        }

        var active = activeEmpireIds.ToHashSet();

        // Walk back through the current cycle: it ends where an empire repeats
        // or once every active empire has been used.
        var usedInCycle = new HashSet<int>();
        foreach (var id in history)
        {
            if (usedInCycle.Contains(id) || usedInCycle.IsSupersetOf(active))
            {
                break;
            }
            usedInCycle.Add(id);
        }

        var candidates = active.Except(usedInCycle).ToList();
        if (candidates.Count == 0)
        {
            // New cycle: everyone is eligible except the most recent few.
            var gap = Math.Min(CycleBoundaryGap, active.Count - 1);
            var recent = history.Take(gap).ToHashSet();
            candidates = active.Except(recent).ToList();
        }

        candidates.Sort();
        return candidates[random.Next(candidates.Count)];
    }

    // Makes sure the given date has a challenge. Called on startup and lazily
    // by the API, so a server that runs for days without restarting still gets
    // a new challenge every day.
    public static async Task<DailyChallenge> EnsureForDateAsync(ImperatleDbContext db, DateOnly date)
    {
        var existing = await db.DailyChallenges.FirstOrDefaultAsync(c => c.Date == date);
        if (existing is not null)
        {
            return existing;
        }

        var activeIds = await db.Empires.Where(e => e.Active).Select(e => e.Id).ToListAsync();
        var history = await db.DailyChallenges
            .Where(c => c.Date < date)
            .OrderByDescending(c => c.Date)
            .Select(c => c.EmpireId)
            .Take(activeIds.Count + CycleBoundaryGap)
            .ToListAsync();

        var challenge = new DailyChallenge { Date = date, EmpireId = PickNext(activeIds, history, Random.Shared) };
        db.DailyChallenges.Add(challenge);
        try
        {
            await db.SaveChangesAsync();
            return challenge;
        }
        catch (DbUpdateException)
        {
            // Another request (or replica) scheduled the same date first; the
            // unique index on Date kept only one. Use theirs.
            db.Entry(challenge).State = EntityState.Detached;
            return await db.DailyChallenges.FirstAsync(c => c.Date == date);
        }
    }

    // Challenge #1 is the first scheduled day, so numbering starts at launch
    // without a hard-coded launch date.
    public static Task<int> NumberForAsync(ImperatleDbContext db, DateOnly date) =>
        db.DailyChallenges.CountAsync(c => c.Date <= date);
}
