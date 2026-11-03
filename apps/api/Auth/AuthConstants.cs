using Microsoft.AspNetCore.Authentication.Cookies;

namespace Imperatle.Api.Auth;

public static class AuthConstants
{
    // The login cookie, shared by imperatle.com and api.imperatle.com when
    // Auth:CookieDomain is set.
    public const string SessionScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    public const string SessionCookieName = "imperatle_session";

    // Short-lived cookie holding Google's answer between /signin-google and
    // /auth/google/complete.
    public const string ExternalScheme = "External";
    public const string ExternalCookieName = "imperatle_external";

    public const string GoogleScheme = "Google";

    // Our own User.Id inside the login cookie.
    public const string UserIdClaim = "imperatle:uid";

    // The server-side session (UserSession.Id) the login cookie belongs to.
    public const string SessionIdClaim = "imperatle:sid";

    public const string ReturnUrlItem = "returnUrl";
}
