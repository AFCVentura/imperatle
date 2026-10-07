using Imperatle.Api.Game;
using Microsoft.EntityFrameworkCore;

namespace Imperatle.Api.Data;

// Development-only tweaks on top of the real content (Content/empires).
public static class DevSeeder
{
    // forcedTodaySlug (Dev:ForceTodayEmpireSlug in appsettings.Development.json)
    // pins today's challenge to one empire, e.g. the one whose map is being tested.
    public static async Task ForceTodayAsync(ImperatleDbContext db, string? forcedTodaySlug)
    {
        if (string.IsNullOrWhiteSpace(forcedTodaySlug))
        {
            return;
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var todayChallenge = await ChallengeScheduler.EnsureForDateAsync(db, today);
        var forced = await db.Empires.FirstOrDefaultAsync(e => e.Slug == forcedTodaySlug && e.Active);
        if (forced is null || todayChallenge.EmpireId == forced.Id)
        {
            return;
        }

        todayChallenge.EmpireId = forced.Id;

        // Progress recorded against the previous empire no longer matches today's answer.
        var staleProgress = await db.PlayerChallengeProgress.Where(p => p.Date == today).ToListAsync();
        db.PlayerChallengeProgress.RemoveRange(staleProgress);

        await db.SaveChangesAsync();
    }
}
