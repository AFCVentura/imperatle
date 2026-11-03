using System.Security.Claims;
using Imperatle.Api.Auth;
using Imperatle.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Imperatle.Api.Services;

// ICurrentPlayer for a real request: the anonymous id comes from the
// imperatle_aid cookie (created on first use, like a guess does), the user id
// from the login cookie, already checked against the database by
// AuthEvents.ValidatePrincipalAsync.
public sealed class HttpCurrentPlayer(IHttpContextAccessor accessor, ImperatleDbContext db) : ICurrentPlayer
{
    private Guid? _anonymousId;
    private bool? _isSupporter;

    private HttpContext Context => accessor.HttpContext
        ?? throw new InvalidOperationException("ICurrentPlayer used outside a request.");

    public Guid AnonymousId => _anonymousId ??= AnonymousIdentity.GetOrCreate(Context.Request, Context.Response);

    public Guid? UserId => GetUserId(Context.User);

    public async Task<bool> IsSupporterAsync(CancellationToken ct = default)
    {
        if (UserId is not Guid userId)
        {
            return false;
        }

        return _isSupporter ??= await db.Users.AnyAsync(u => u.Id == userId && u.SupporterSinceUtc != null, ct);
    }

    public static Guid? GetUserId(ClaimsPrincipal user) =>
        user.Identity?.IsAuthenticated == true && Guid.TryParse(user.FindFirstValue(AuthConstants.UserIdClaim), out var id)
            ? id
            : null;
}
