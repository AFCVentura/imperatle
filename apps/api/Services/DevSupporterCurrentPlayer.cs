namespace Imperatle.Api.Services;

// Development only (registered in Program.cs when Dev:IsSupporter is true):
// the real current player, except that everyone counts as a supporter, so the
// perks (past games, practice) can be tried without Google or Paddle set up.
// Identity (anonymous id, account) stays exactly as HttpCurrentPlayer sees it.
public sealed class DevSupporterCurrentPlayer(HttpCurrentPlayer inner) : ICurrentPlayer
{
    public Guid AnonymousId => inner.AnonymousId;

    public Guid? UserId => inner.UserId;

    public Task<bool> IsSupporterAsync(CancellationToken ct = default) => Task.FromResult(true);
}
