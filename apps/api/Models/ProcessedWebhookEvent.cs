namespace Imperatle.Api.Models;

// Every Paddle webhook event that changed (or was deliberately ignored after
// being understood) is recorded by its event id, so a retry or a replayed
// request is acknowledged without being applied twice.
public class ProcessedWebhookEvent
{
    // Paddle's event_id ("evt_..."), unique across all events.
    public string Id { get; set; } = "";
    public string EventType { get; set; } = "";
    // The transaction the event was about ("txn_..."), when there is one. Lets
    // a late, out-of-order transaction.completed see that it was already refunded.
    public string? TransactionId { get; set; }
    public string Outcome { get; set; } = "";
    public DateTime ProcessedAtUtc { get; set; }
}
