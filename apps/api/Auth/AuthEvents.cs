using Imperatle.Api.Controllers;
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

    // Anything that goes wrong on the way back from Google (bad client secret,
    // expired state, a lost correlation cookie, Google being down) sends the
    // player back to the page they came from with ?login=error, where the web
    // app explains it, instead of a bare 500. The reason goes to the log.
    public static Task GoogleRemoteFailureAsync(RemoteFailureContext context)
    {
        var logger = context.HttpContext.RequestServices.GetRequiredService<ILoggerFactory>()
            .CreateLogger("Imperatle.Auth");
        logger.LogWarning(context.Failure, "Google login failed: {Reason}", context.Failure?.Message);

        context.Response.Redirect(AuthController.WithLoginError(ReturnUrlOf(context.HttpContext, context.Properties)));
        context.HandleResponse();
        return Task.CompletedTask;
    }

    // The player pressed "Cancel" on Google's screen: back to where they were,
    // with no error message, since nothing went wrong.
    public static Task GoogleAccessDeniedAsync(AccessDeniedContext context)
    {
        context.Response.Redirect(ReturnUrlOf(context.HttpContext, context.Properties));
        context.HandleResponse();
        return Task.CompletedTask;
    }

    private static string ReturnUrlOf(HttpContext httpContext, AuthenticationProperties? properties)
    {
        var origins = httpContext.RequestServices.GetRequiredService<AllowedOrigins>();
        return properties?.Items.TryGetValue(AuthConstants.ReturnUrlItem, out var stored) == true
            && origins.IsAllowedReturnUrl(stored)
                ? stored!
                : origins.Default;
    }

    // An API answers 401/403, it doesn't redirect to a login page.
    public static Task StatusInsteadOfRedirect(RedirectContext<CookieAuthenticationOptions> context, int status)
    {
        context.Response.StatusCode = status;
        return Task.CompletedTask;
    }
}
