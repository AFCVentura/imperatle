namespace Imperatle.Api.Models;

// A signed-in player (Google login). Playing never requires one; an account
// keeps the history across devices and is what a Supporter purchase attaches to.
public class User
{
    public Guid Id { get; set; }

    // Google's stable "sub" claim, never the e-mail (which can change).
    public string GoogleSubject { get; set; } = "";
    public string Email { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public DateTime CreatedAtUtc { get; set; }

    // Lifetime Supporter: set by the Paddle webhook when the purchase completes,
    // cleared again by a full refund or chargeback. Null = not a supporter.
    public DateTime? SupporterSinceUtc { get; set; }
    public string? PaddleTransactionId { get; set; }
}
