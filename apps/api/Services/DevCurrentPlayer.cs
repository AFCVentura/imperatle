using Imperatle.Api.Controllers;

namespace Imperatle.Api.Services;

// Temporary stand-in until accounts land (the accounts branch owns the real
// ICurrentPlayer): anonymous cookie only, never logged in, and a supporter
// only in Development when Dev:IsSupporter is true. Outside Development
// nobody is a supporter, so the perks stay locked in production.
public class DevCurrentPlayer(IHttpContextAccessor httpContextAccessor, IWebHostEnvironment env, IConfiguration config) : ICurrentPlayer
{
    private Guid? anonymousId;

    public Guid AnonymousId => anonymousId ??= ResolveAnonymousId();

    public Guid? UserId => null;

    public Task<bool> IsSupporterAsync(CancellationToken ct = default) =>
        Task.FromResult(env.IsDevelopment() && config.GetValue("Dev:IsSupporter", false));

    private Guid ResolveAnonymousId()
    {
        var context = httpContextAccessor.HttpContext
            ?? throw new InvalidOperationException("ICurrentPlayer used outside an HTTP request.");
        return ChallengesController.GetOrCreateAnonymousId(context.Request, context.Response);
    }
}
