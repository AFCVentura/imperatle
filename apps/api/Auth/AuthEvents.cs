using Imperatle.Api.Data;
using Imperatle.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;

namespace Imperatle.Api.Auth;

public static class AuthEvents
{
    // A login cookie stays valid for months; if the account was deleted in the
    // meantime (on another device), drop the cookie instead of acting for a
    // user that no longer exists.
    public static async Task ValidatePrincipalAsync(CookieValidatePrincipalContext context)
    {
        var userId = context.Principal is null ? null : HttpCurrentPlayer.GetUserId(context.Principal);
        var db = context.HttpContext.RequestServices.GetRequiredService<ImperatleDbContext>();

        if (userId is null || !await db.Users.AnyAsync(u => u.Id == userId))
        {
            context.RejectPrincipal();
            await context.HttpContext.SignOutAsync(AuthConstants.SessionScheme);
        }
    }

    // An API answers 401/403, it doesn't redirect to a login page.
    public static Task StatusInsteadOfRedirect(RedirectContext<CookieAuthenticationOptions> context, int status)
    {
        context.Response.StatusCode = status;
        return Task.CompletedTask;
    }
}
