using Imperatle.Api.Auth;
using Imperatle.Api.Data;
using Imperatle.Api.Dtos;
using Imperatle.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Imperatle.Api.Controllers;

[ApiController]
[Route("me")]
public class MeController(ImperatleDbContext db, ICurrentPlayer player) : ControllerBase
{
    // Who is signed in, if anyone. Never cached: it changes on login/logout.
    [HttpGet]
    public async Task<MeResponse> Get(CancellationToken ct)
    {
        Response.Headers.CacheControl = "no-store";

        var user = player.UserId is Guid userId
            ? await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct)
            : null;

        if (user is null)
        {
            return new MeResponse(false, null);
        }

        // The purchase itself, or the Development-only Dev:IsSupporter override.
        var isSupporter = user.SupporterSinceUtc is not null || await player.IsSupporterAsync(ct);
        return new MeResponse(true, new MeUser(user.Id, user.DisplayName, user.Email, isSupporter));
    }

    // LGPD/GDPR: deletes the account and all its games, then signs out.
    [HttpDelete]
    [RequireAllowedOrigin]
    public async Task<IActionResult> Delete(CancellationToken ct)
    {
        if (player.UserId is not Guid userId)
        {
            return Unauthorized();
        }

        await AccountService.DeleteAccountAsync(db, userId, ct);
        await HttpContext.SignOutAsync(AuthConstants.SessionScheme);
        AnonymousIdentity.Issue(Request, Response);
        return NoContent();
    }
}
