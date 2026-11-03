using System.Text.Json;
using Imperatle.Api.Data;
using Imperatle.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Imperatle.Api.Payments;

public enum PaddleWebhookOutcome
{
    Granted,
    AlreadySupporter,
    Revoked,
    Refunded,          // full refund for a transaction no user holds
    Ignored,           // understood, nothing to do (other events, partial refunds...)
    Duplicate,         // event id already processed
    UserNotFound,      // not recorded, so a manual replay from Paddle can still apply it
    Invalid,           // signed, but not the JSON we expect
}

// Applies an already signature-checked Paddle event to the database. Only the
// events that matter for the lifetime Supporter purchase change anything:
// - transaction.completed with the Supporter price and custom_data.userId grants it;
// - adjustment.created/updated that is an approved FULL refund or chargeback
//   of the user's transaction revokes it.
public class PaddleWebhookProcessor(ImperatleDbContext db, IOptions<PaddleOptions> options, ILogger<PaddleWebhookProcessor> logger)
{
    public const string RefundedOutcome = "refunded";

    public async Task<PaddleWebhookOutcome> ProcessAsync(string json, CancellationToken ct = default)
    {
        PaddleEvent? evt;
        try
        {
            evt = PaddleEvent.Parse(json);
        }
        catch (JsonException)
        {
            evt = null;
        }
        if (evt is null)
        {
            return PaddleWebhookOutcome.Invalid;
        }

        if (await db.ProcessedWebhookEvents.AnyAsync(e => e.Id == evt.EventId, ct))
        {
            return PaddleWebhookOutcome.Duplicate;
        }

        var (outcome, transactionId) = evt.EventType switch
        {
            "transaction.completed" => await CompletedAsync(evt.Data, ct),
            "adjustment.created" or "adjustment.updated" => await AdjustmentAsync(evt.Data, ct),
            _ => (PaddleWebhookOutcome.Ignored, null),
        };

        if (outcome is PaddleWebhookOutcome.UserNotFound or PaddleWebhookOutcome.Invalid)
        {
            // Nothing saved and the id not recorded: once the cause is fixed,
            // replaying the event from the Paddle dashboard still works.
            db.ChangeTracker.Clear();
            return outcome;
        }

        db.ProcessedWebhookEvents.Add(new ProcessedWebhookEvent
        {
            Id = evt.EventId,
            EventType = evt.EventType,
            TransactionId = transactionId,
            Outcome = outcome is PaddleWebhookOutcome.Refunded or PaddleWebhookOutcome.Revoked
                ? RefundedOutcome
                : outcome.ToString().ToLowerInvariant(),
            ProcessedAtUtc = DateTime.UtcNow,
        });

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // The same event delivered twice at the same moment: the other
            // request recorded it first (primary key on the event id).
            db.ChangeTracker.Clear();
            return PaddleWebhookOutcome.Duplicate;
        }

        logger.LogInformation("Paddle {EventType} {EventId}: {Outcome}", evt.EventType, evt.EventId, outcome);
        return outcome;
    }

    private async Task<(PaddleWebhookOutcome, string?)> CompletedAsync(JsonElement data, CancellationToken ct)
    {
        var transactionId = data.GetStringOrNull("id");
        if (transactionId is null)
        {
            return (PaddleWebhookOutcome.Invalid, null);
        }

        var priceId = options.Value.SupporterPriceId;
        var hasSupporterPrice = !string.IsNullOrEmpty(priceId)
            && data.TryGetProperty("items", out var items) && items.ValueKind == JsonValueKind.Array
            && items.EnumerateArray().Any(i =>
                i.ValueKind == JsonValueKind.Object
                && i.TryGetProperty("price", out var price) && price.ValueKind == JsonValueKind.Object
                && price.GetStringOrNull("id") == priceId);
        if (!hasSupporterPrice)
        {
            return (PaddleWebhookOutcome.Ignored, transactionId);
        }

        // A late retry of this event can arrive after its refund was handled.
        if (await db.ProcessedWebhookEvents.AnyAsync(e => e.TransactionId == transactionId && e.Outcome == RefundedOutcome, ct))
        {
            return (PaddleWebhookOutcome.Ignored, transactionId);
        }

        var userIdText = data.TryGetProperty("custom_data", out var custom) && custom.ValueKind == JsonValueKind.Object
            ? custom.GetStringOrNull("userId")
            : null;
        if (!Guid.TryParse(userIdText, out var userId))
        {
            logger.LogWarning("Paddle transaction {TransactionId} has the Supporter price but no valid custom_data.userId", transactionId);
            return (PaddleWebhookOutcome.UserNotFound, transactionId);
        }

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null)
        {
            logger.LogWarning("Paddle transaction {TransactionId} is for unknown user {UserId}", transactionId, userId);
            return (PaddleWebhookOutcome.UserNotFound, transactionId);
        }

        if (user.SupporterSinceUtc is not null)
        {
            // Bought twice: the first purchase stays the one on record (the
            // second can be refunded in Paddle without touching the perks).
            return (PaddleWebhookOutcome.AlreadySupporter, transactionId);
        }

        user.SupporterSinceUtc = DateTime.UtcNow;
        user.PaddleTransactionId = transactionId;
        return (PaddleWebhookOutcome.Granted, transactionId);
    }

    private async Task<(PaddleWebhookOutcome, string?)> AdjustmentAsync(JsonElement data, CancellationToken ct)
    {
        var transactionId = data.GetStringOrNull("transaction_id");
        var action = data.GetStringOrNull("action");
        var type = data.GetStringOrNull("type");
        var status = data.GetStringOrNull("status");

        var fullRefund = action is "refund" or "chargeback" && type == "full" && status == "approved";
        if (transactionId is null || !fullRefund)
        {
            // Pending or rejected refunds, partial refunds, credits: Supporter stays.
            return (PaddleWebhookOutcome.Ignored, transactionId);
        }

        var user = await db.Users.FirstOrDefaultAsync(u => u.PaddleTransactionId == transactionId, ct);
        if (user is null)
        {
            return (PaddleWebhookOutcome.Refunded, transactionId);
        }

        user.SupporterSinceUtc = null;
        user.PaddleTransactionId = null;
        return (PaddleWebhookOutcome.Revoked, transactionId);
    }

    private sealed record PaddleEvent(string EventId, string EventType, JsonElement Data)
    {
        public static PaddleEvent? Parse(string json)
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (root.ValueKind != JsonValueKind.Object) return null;

            var id = root.GetStringOrNull("event_id");
            var type = root.GetStringOrNull("event_type");
            if (id is null || type is null || !root.TryGetProperty("data", out var data) || data.ValueKind != JsonValueKind.Object)
            {
                return null;
            }
            // Cloned because the JsonDocument is disposed when this returns.
            return new PaddleEvent(id, type, data.Clone());
        }
    }
}

internal static class JsonElementExtensions
{
    public static string? GetStringOrNull(this JsonElement element, string property) =>
        element.TryGetProperty(property, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() : null;
}
