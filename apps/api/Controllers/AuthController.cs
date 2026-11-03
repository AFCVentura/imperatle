using System.Security.Claims;
using Imperatle.Api.Auth;
using Imperatle.Api.Data;
using Imperatle.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;

namespace Imperatle.Api.Controllers;

// Google login, done here in the API: the browser goes to /auth/google/login,
// Google sends it back to /signin-google (handled by the Google middleware),
// which forwards to /auth/google/complete, where the account is created or
// found, the login cookie is set and the browser returns to the web app.
[ApiController]
[Route("auth")]
public class AuthController(
    ImperatleDbContext db,
    ICurrentPlayer player,
    AllowedOrigins origins,
    IAuthenticationSchemeProvider schemes,
    ILogger<AuthController> logger) : ControllerBase
{
    [HttpGet("google/login")]
    public async Task<IActionResult> GoogleLogin([FromQuery] string? returnUrl)
    {
        returnUrl ??= origins.Default;
        if (!origins.IsAllowedReturnUrl(returnUrl))
        {
            return BadRequest();
        }

        // Not configured (no client id/secret): the web app gets an error flag
        // instead of a crash.
        if (await schemes.GetSchemeAsync(AuthConstants.GoogleScheme) is null)
        {
            return Redirect(WithLoginError(returnUrl));
        }

        var properties = new AuthenticationProperties
        {
            RedirectUri = Url.Action(nameof(GoogleComplete)),
            Items = { [AuthConstants.ReturnUrlItem] = returnUrl },
        };
        return Challenge(properties, AuthConstants.GoogleScheme);
    }

    [HttpGet("google/complete")]
    public async Task<IActionResult> GoogleComplete(CancellationToken ct)
    {
        var external = await HttpContext.AuthenticateAsync(AuthConstants.ExternalScheme);
        await HttpContext.SignOutAsync(AuthConstants.ExternalScheme);

        var returnUrl = external.Properties?.Items.TryGetValue(AuthConstants.ReturnUrlItem, out var stored) == true
            && origins.IsAllowedReturnUrl(stored)
                ? stored!
                : origins.Default;

        var subject = external.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!external.Succeeded || string.IsNullOrEmpty(subject))
        {
            logger.LogWarning("Google login could not be completed: {Failure}", external.Failure?.Message);
            return Redirect(WithLoginError(returnUrl));
        }

        var user = await AccountService.UpsertGoogleUserAsync(
            db,
            subject,
            external.Principal!.FindFirstValue(ClaimTypes.Email),
            external.Principal!.FindFirstValue(ClaimTypes.Name),
            ct);

        await AccountService.ClaimAnonymousProgressAsync(db, player.AnonymousId, user.Id, ct);

        var identity = new ClaimsIdentity([new Claim(AuthConstants.UserIdClaim, user.Id.ToString())], AuthConstants.SessionScheme);
        await HttpContext.SignInAsync(
            AuthConstants.SessionScheme,
            new ClaimsPrincipal(identity),
            new AuthenticationProperties { IsPersistent = true });

        return Redirect(returnUrl);
    }

    [HttpPost("logout")]
    [RequireAllowedOrigin]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(AuthConstants.SessionScheme);
        // A fresh anonymous id: the next person on this browser starts clean
        // instead of continuing this account's game of the day.
        AnonymousIdentity.Issue(Request, Response);
        return NoContent();
    }

    // The web app shows a message when it sees ?login=error.
    public static string WithLoginError(string returnUrl)
    {
        var builder = new UriBuilder(returnUrl);
        var query = builder.Query.TrimStart('?');
        builder.Query = string.IsNullOrEmpty(query) ? "login=error" : $"{query}&login=error";
        return builder.Uri.AbsoluteUri;
    }
}
