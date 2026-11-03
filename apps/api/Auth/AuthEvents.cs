using Imperatle.Api.Data;
using Imperatle.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace Imperatle.Api.Auth;

public static class AuthEvents
{
    // A login cookie stays valid for months, so every request checks its
    // server-side session: logged out (on this browser, or "all devices"
    // anywhere) or the account deleted, and the cookie is dropped instead of
    // acting for that user. A cookie without a session id is refused too.
    public static async Task ValidatePrincipalAsync(CookieValidatePrincipalContext context)
    {
        var userId = context.Principal is null ? null : HttpCurrentPlayer.GetUserId(context.Principal);
        var sessionId = UserSessions.GetSessionId(context.Principal);
        var db = context.HttpContext.RequestServices.GetRequiredService<ImperatleDbContext>();

        // Sessions are deleted with their account, so this covers a deleted
        // user as well.
        if (userId is not Guid user || sessionId is not Guid session
            || !await UserSessions.IsActiveAsync(db, user, session, context.HttpContext.RequestAborted))
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
