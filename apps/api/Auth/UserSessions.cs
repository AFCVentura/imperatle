using System.Security.Claims;
using Imperatle.Api.Data;
using Imperatle.Api.Models;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;

namespace Imperatle.Api.Auth;

// Server-side login sessions (see UserSession). A table of sessions rather
// than a version counter on the user, because a normal logout must end only
// this browser's session; one row per session gives both that and "all
// devices" with a single primary-key lookup per request. There is no cache:
// every replica reads the same row, so a logout takes effect on all of them
// with the very next request.
public static class UserSessions
{
    public static readonly TimeSpan TouchInterval = TimeSpan.FromDays(1);

    // How long the login cookie lives after the last request that renewed it
    // (sliding expiration, set in Program.cs).
    public static readonly TimeSpan CookieLifetime = TimeSpan.FromDays(180);

    // Creates the session row and the login cookie that points at it.
    public static async Task SignInAsync(HttpContext http, ImperatleDbContext db, Guid userId, CancellationToken ct = default)
    {
        var now = DateTime.UtcNow;
        var session = new UserSession { Id = Guid.NewGuid(), UserId = userId, CreatedAtUtc = now, LastSeenUtc = now };
        db.UserSessions.Add(session);
        await db.SaveChangesAsync(ct);

        var identity = new ClaimsIdentity(
            [
                new Claim(AuthConstants.UserIdClaim, userId.ToString()),
                new Claim(AuthConstants.SessionIdClaim, session.Id.ToString()),
            ],
            AuthConstants.SessionScheme);
        await http.SignInAsync(
            AuthConstants.SessionScheme,
            new ClaimsPrincipal(identity),
            new AuthenticationProperties { IsPersistent = true });
    }

    public static Guid? GetSessionId(ClaimsPrincipal? principal) =>
        Guid.TryParse(principal?.FindFirstValue(AuthConstants.SessionIdClaim), out var id) ? id : null;

    // True while the cookie's session is live for that user. Touches
    // LastSeenUtc when it is more than a day old.
    public static async Task<bool> IsActiveAsync(ImperatleDbContext db, Guid userId, Guid sessionId, CancellationToken ct = default)
    {
        var lastSeen = await db.UserSessions
            .AsNoTracking()
            .Where(s => s.Id == sessionId && s.UserId == userId && s.RevokedAtUtc == null)
            .Select(s => (DateTime?)s.LastSeenUtc)
            .FirstOrDefaultAsync(ct);
        if (lastSeen is null)
        {
            return false;
        }

        var now = DateTime.UtcNow;
        if (now - lastSeen > TouchInterval)
        {
            var session = await db.UserSessions.FindAsync([sessionId], ct);
            if (session is not null)
            {
                session.LastSeenUtc = now;
                await db.SaveChangesAsync(ct);
                db.Entry(session).State = EntityState.Detached;
            }
        }

        return true;
    }

    public static async Task RevokeAsync(ImperatleDbContext db, Guid sessionId, CancellationToken ct = default)
    {
        var session = await db.UserSessions.FirstOrDefaultAsync(s => s.Id == sessionId && s.RevokedAtUtc == null, ct);
        if (session is not null)
        {
            session.RevokedAtUtc = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
        }
    }

    public static async Task<int> RevokeAllAsync(ImperatleDbContext db, Guid userId, CancellationToken ct = default)
    {
        var sessions = await db.UserSessions.Where(s => s.UserId == userId && s.RevokedAtUtc == null).ToListAsync(ct);
        var now = DateTime.UtcNow;
        foreach (var session in sessions)
        {
            session.RevokedAtUtc = now;
        }

        await db.SaveChangesAsync(ct);
        return sessions.Count;
    }
}
