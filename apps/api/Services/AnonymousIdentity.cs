namespace Imperatle.Api.Services;

// The imperatle_aid cookie: a random id per browser, not tied to anyone.
// Long-lived so a browser keeps its history across days without an account.
public static class AnonymousIdentity
{
    public const string CookieName = "imperatle_aid";

    public static Guid GetOrCreate(HttpRequest request, HttpResponse response)
    {
        if (Guid.TryParse(request.Cookies[CookieName], out var existing))
        {
            return existing;
        }

        return Issue(request, response);
    }

    // A fresh id, replacing the current one. Used on logout and account
    // deletion so the next person on this browser doesn't continue the
    // signed-out games of the previous account.
    public static Guid Issue(HttpRequest request, HttpResponse response)
    {
        var id = Guid.NewGuid();
        response.Cookies.Append(CookieName, id.ToString(), new CookieOptions
        {
            HttpOnly = true,
            Secure = request.IsHttps,
            SameSite = SameSiteMode.Lax,
            Expires = DateTimeOffset.UtcNow.AddYears(1),
        });
        return id;
    }
}
