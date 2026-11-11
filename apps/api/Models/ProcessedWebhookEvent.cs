namespace Imperatle.Api.Models;

// Every Stripe webhook event that changed (or was deliberately ignored after
// being understood) is recorded by its event id, so a retry or a replayed
// request is acknowledged without being applied twice.
public class ProcessedWebhookEvent
{
    // Stripe's event id ("evt_..."), unique across all events.
    public string Id { get; set; } = "";
    public string EventType { get; set; } = "";
    // The payment intent the event was about ("pi_..."), when there is one. Lets
    // a late, out-of-order transaction.completed see that it was already refunded.
    public string? TransactionId { get; set; }
    public string Outcome { get; set; } = "";
    public DateTime ProcessedAtUtc { get; set; }
}
