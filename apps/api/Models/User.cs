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

    // Lifetime Supporter: set by the Stripe webhook when the purchase completes,
    // cleared again by a full refund or a lost dispute. Null = not a supporter.
    public DateTime? SupporterSinceUtc { get; set; }
    // The Stripe payment intent ("pi_...") of that purchase, to match refunds.
    public string? SupporterPaymentId { get; set; }
}
