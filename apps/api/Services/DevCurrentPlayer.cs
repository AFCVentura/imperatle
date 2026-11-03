using Imperatle.Api.Controllers;

namespace Imperatle.Api.Services;

// TEMPORARY stand-in until the accounts feature lands its real ICurrentPlayer.
// Development only: never signed in, supporter flag from Dev:IsSupporter.
public class DevCurrentPlayer(IHttpContextAccessor http, IConfiguration config) : ICurrentPlayer
{
    public Guid AnonymousId =>
        Guid.TryParse(http.HttpContext?.Request.Cookies[ChallengesController.AnonymousCookieName], out var id) ? id : Guid.Empty;

    public Guid? UserId => null;

    public Task<bool> IsSupporterAsync(CancellationToken ct = default) =>
        Task.FromResult(config.GetValue("Dev:IsSupporter", false));
}
