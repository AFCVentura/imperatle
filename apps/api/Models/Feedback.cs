namespace Imperatle.Api.Models;

// A message sent from the in-game feedback form. Stored even when the e-mail
// notification fails, so nothing a player sends gets lost.
public class Feedback
{
    public int Id { get; set; }
    public FeedbackCategory Category { get; set; }
    public string Message { get; set; } = "";
    // Optional, only if the player wants a reply.
    public string? Email { get; set; }
    public string? Locale { get; set; }
    public Guid? AnonymousId { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
