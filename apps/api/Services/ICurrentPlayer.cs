namespace Imperatle.Api.Services;

// Who is playing this request: always an anonymous browser id (the
// imperatle_aid cookie), plus the account when logged in.
public interface ICurrentPlayer
{
    Guid AnonymousId { get; }          // from the imperatle_aid cookie
    Guid? UserId { get; }              // null when not logged in
    Task<bool> IsSupporterAsync(CancellationToken ct = default);
}
