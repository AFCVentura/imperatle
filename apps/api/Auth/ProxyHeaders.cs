using Microsoft.AspNetCore.HttpOverrides;

namespace Imperatle.Api.Auth;

// Azure Container Apps ends TLS at its ingress and forwards plain HTTP, adding
// X-Forwarded-Proto and X-Forwarded-For. Both are applied:
// - the scheme, so the Google redirect URI and the Secure cookies are right;
// - the client IP, so the per-IP rate limits ("feedback", and "guess" before
//   the anonymous cookie exists) limit each visitor instead of every visitor
//   behind the ingress at once.
// Only the last hop is read (ForwardLimit = 1): it's the address the ingress
// itself appended, so a client can't pick its own IP by sending the header.
public static class ProxyHeaders
{
    public static void Configure(ForwardedHeadersOptions options)
    {
        options.ForwardedHeaders = ForwardedHeaders.XForwardedProto | ForwardedHeaders.XForwardedFor;
        options.ForwardLimit = 1;
        // The ingress address isn't fixed, so no allow-list of proxies.
        options.KnownIPNetworks.Clear();
        options.KnownProxies.Clear();
    }
}
