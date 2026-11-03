namespace Imperatle.Api.Models;

// A player who signed in with Google. Accounts are optional: everything a
// signed-out browser plays is kept under its anonymous id and moves to the
// account on login (see AccountService.ClaimAnonymousProgressAsync).
public class User
{
    public Guid Id { get; set; }

    // Google's stable "sub" claim. E-mail and name can change, this can't.
    public string GoogleSubject { get; set; } = "";
    public string Email { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public DateTime CreatedAtUtc { get; set; }

    // Null = not a supporter. Set by the Paddle webhook.
    public DateTime? SupporterSinceUtc { get; set; }
    public string? PaddleTransactionId { get; set; }
}
