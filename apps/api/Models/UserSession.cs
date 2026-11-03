namespace Imperatle.Api.Models;

// One signed-in browser. The login cookie carries this row's id, and every
// request checks that the row exists and is not revoked
// (AuthEvents.ValidatePrincipalAsync): logging out revokes the row, so a
// copy of the cookie stops working at once instead of lasting its 180 days.
// "Sign out of all devices" revokes every row of the account, and deleting
// the account deletes them.
public class UserSession
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public DateTime CreatedAtUtc { get; set; }

    // Refreshed at most once a day (UserSessions.TouchInterval), not on
    // every request.
    public DateTime LastSeenUtc { get; set; }

    public DateTime? RevokedAtUtc { get; set; }
}
