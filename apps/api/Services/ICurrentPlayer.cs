namespace Imperatle.Api.Services;

// Who is playing this request: always an anonymous browser id, plus the
// account when signed in. The accounts feature provides the real one.
public interface ICurrentPlayer
{
    Guid AnonymousId { get; }          // from the imperatle_aid cookie
    Guid? UserId { get; }              // null when not logged in
    Task<bool> IsSupporterAsync(CancellationToken ct = default);
}
