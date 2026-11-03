using Imperatle.Api.Data;
using Imperatle.Api.Game;
using Imperatle.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Imperatle.Api.Services;

// Account bookkeeping kept out of the controller so it can be tested against
// the in-memory database.
public static class AccountService
{
    // Finds the account for a Google subject, creating it on the first login.
    // E-mail and name are refreshed on every login, Google may have changed them.
    public static async Task<User> UpsertGoogleUserAsync(
        ImperatleDbContext db, string googleSubject, string? email, string? displayName, CancellationToken ct = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.GoogleSubject == googleSubject, ct);
        if (user is null)
        {
            user = new User
            {
                Id = Guid.NewGuid(),
                GoogleSubject = googleSubject,
                CreatedAtUtc = DateTime.UtcNow,
            };
            db.Users.Add(user);
        }

        user.Email = Truncate(email ?? "", 254);
        user.DisplayName = Truncate(string.IsNullOrWhiteSpace(displayName) ? user.Email : displayName.Trim(), 200);

        await db.SaveChangesAsync(ct);
        return user;
    }

    // Moves the games this browser played signed out into the account. Runs on
    // every login, so a second browser's history joins the same account.
    // When both have a game for the same day, the account's game wins and the
    // browser's copy is dropped (one game per person per day). Rows already
    // tagged to some account (even another one) are left alone. Idempotent:
    // a second run finds nothing left to move.
    public static async Task<int> ClaimAnonymousProgressAsync(
        ImperatleDbContext db, Guid anonymousId, Guid userId, CancellationToken ct = default)
    {
        // Practice rounds played signed out follow the player too.
        var practice = await db.PracticeSessions
            .Where(s => s.AnonymousId == anonymousId && s.UserId == null)
            .ToListAsync(ct);
        foreach (var session in practice)
        {
            session.UserId = userId;
        }

        var anonymousRows = await db.PlayerChallengeProgress
            .Where(p => p.AnonymousId == anonymousId && p.UserId == null)
            .ToListAsync(ct);
        if (anonymousRows.Count == 0)
        {
            await db.SaveChangesAsync(ct);
            return 0;
        }

        var dates = anonymousRows.Select(p => p.Date).ToList();
        var accountDates = (await db.PlayerChallengeProgress
            .Where(p => p.UserId == userId && dates.Contains(p.Date))
            .Select(p => p.Date)
            .ToListAsync(ct)).ToHashSet();

        foreach (var row in anonymousRows)
        {
            if (accountDates.Contains(row.Date))
            {
                db.PlayerChallengeProgress.Remove(row);
            }
            else
            {
                row.UserId = userId;
            }
        }

        await db.SaveChangesAsync(ct);
        return anonymousRows.Count;
    }

    // LGPD/GDPR: the account and every game tied to it.
    public static async Task<bool> DeleteAccountAsync(ImperatleDbContext db, Guid userId, CancellationToken ct = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null)
        {
            return false;
        }

        db.PlayerChallengeProgress.RemoveRange(db.PlayerChallengeProgress.Where(p => p.UserId == userId));
        db.PracticeSessions.RemoveRange(db.PracticeSessions.Where(s => s.UserId == userId));
        db.Users.Remove(user);
        await db.SaveChangesAsync(ct);
        return true;
    }

    // Every daily-game row that is this player's: signed in, the account's
    // rows (wherever they were played) plus this browser's rows not yet tagged
    // to any account; signed out, this browser's rows. The daily game, the
    // stats, the archive and the dev tools all read through this, so they
    // always agree on whose games they are.
    public static IQueryable<PlayerChallengeProgress> ProgressOf(ImperatleDbContext db, Guid? anonymousId, Guid? userId)
    {
        if (userId is Guid user)
        {
            return anonymousId is Guid browser
                ? db.PlayerChallengeProgress.Where(p => p.UserId == user || (p.AnonymousId == browser && p.UserId == null))
                : db.PlayerChallengeProgress.Where(p => p.UserId == user);
        }

        return anonymousId is Guid id
            ? db.PlayerChallengeProgress.Where(p => p.AnonymousId == id)
            : db.PlayerChallengeProgress.Where(_ => false);
    }

    public static IQueryable<PlayerChallengeProgress> ProgressOf(ImperatleDbContext db, ICurrentPlayer player) =>
        ProgressOf(db, player.AnonymousId, player.UserId);

    // The player's game for a day: the account's when signed in (wherever it
    // was played), otherwise this browser's. A signed-in player's untagged
    // browser row (played before the login, on this browser) is taken over.
    public static async Task<PlayerChallengeProgress?> FindProgressAsync(
        ImperatleDbContext db, ICurrentPlayer player, DateOnly date, CancellationToken ct = default)
    {
        var rows = await ProgressOf(db, player).Where(p => p.Date == date).ToListAsync(ct);
        var chosen = ArchiveRules.Preferred(rows);

        // Only when the account has no row of its own that day (Preferred puts
        // the account's first), so the one-row-per-account-per-day index holds.
        if (chosen is not null && chosen.UserId is null && player.UserId is Guid userId)
        {
            chosen.UserId = userId;
        }

        return chosen;
    }

    private static string Truncate(string value, int max) => value.Length <= max ? value : value[..max];
}
