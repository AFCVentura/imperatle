namespace Imperatle.Api.Auth;

// The web app origins (Cors:AllowedOrigins). The same list decides where the
// login may send the browser back to and which pages may call logout or
// account deletion.
public sealed class AllowedOrigins
{
    private readonly HashSet<string> _origins;

    public AllowedOrigins(IEnumerable<string> origins)
    {
        _origins = origins.Select(o => o.TrimEnd('/')).ToHashSet(StringComparer.OrdinalIgnoreCase);
        Default = _origins.FirstOrDefault() ?? throw new ArgumentException("At least one origin is required.", nameof(origins));
    }

    // Where the login returns when no returnUrl was given.
    public string Default { get; }

    public bool IsAllowedOrigin(string? origin) =>
        !string.IsNullOrEmpty(origin) && _origins.Contains(origin.TrimEnd('/'));

    // Only absolute http(s) URLs on one of the allowed origins: no relative
    // paths, no other hosts, no user info tricks, no javascript: URLs. Keeps
    // the login from being an open redirect.
    public bool IsAllowedReturnUrl(string? returnUrl)
    {
        if (string.IsNullOrWhiteSpace(returnUrl)
            || !Uri.TryCreate(returnUrl, UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeHttp)
            || !string.IsNullOrEmpty(uri.UserInfo))
        {
            return false;
        }

        return IsAllowedOrigin(uri.GetLeftPart(UriPartial.Authority));
    }
}
