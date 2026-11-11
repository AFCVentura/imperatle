using System.Text.Json;
using Imperatle.Api.Data;
using Imperatle.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Imperatle.Api.Payments;

public enum StripeWebhookOutcome
{
    Granted,
    AlreadySupporter,
    Revoked,
    Refunded,          // full refund or lost dispute for a payment no user holds
    Ignored,           // understood, nothing to do (other events, partial refunds...)
    Duplicate,         // event id already processed
    UserNotFound,      // not recorded, so a resend from Stripe can still apply it
    Invalid,           // signed, but not the JSON we expect
}

// Applies an already signature-checked Stripe event to the database. Only the
// events that matter for the lifetime Supporter purchase change anything:
// - checkout.session.completed (paid) or checkout.session.async_payment_succeeded
//   for a Supporter session grants it to the client_reference_id user;
// - charge.refunded (fully) or charge.dispute.closed (lost) for the user's
//   payment intent revokes it.
public class StripeWebhookProcessor(ImperatleDbContext db, ILogger<StripeWebhookProcessor> logger)
{
    public const string RefundedOutcome = "refunded";

    // Written on every Supporter Checkout session (metadata.product), so a
    // session for anything else sold on the same Stripe account is ignored.
    public const string SupporterProduct = "imperatle_supporter";

    public async Task<StripeWebhookOutcome> ProcessAsync(string json, CancellationToken ct = default)
    {
        StripeEvent? evt;
        try
        {
            evt = StripeEvent.Parse(json);
        }
        catch (JsonException)
        {
            evt = null;
        }
        if (evt is null)
        {
            return StripeWebhookOutcome.Invalid;
        }

        if (await db.ProcessedWebhookEvents.AnyAsync(e => e.Id == evt.EventId, ct))
        {
            return StripeWebhookOutcome.Duplicate;
        }

        var (outcome, paymentId) = evt.EventType switch
        {
            "checkout.session.completed" => await SessionAsync(evt.Object, requirePaid: true, ct),
            "checkout.session.async_payment_succeeded" => await SessionAsync(evt.Object, requirePaid: false, ct),
            "charge.refunded" => await RefundAsync(evt.Object, ct),
            "charge.dispute.closed" => await DisputeAsync(evt.Object, ct),
            _ => (StripeWebhookOutcome.Ignored, null),
        };

        if (outcome is StripeWebhookOutcome.UserNotFound or StripeWebhookOutcome.Invalid)
        {
            // Nothing saved and the id not recorded: once the cause is fixed,
            // resending the event from the Stripe dashboard still works.
            db.ChangeTracker.Clear();
            return outcome;
        }

        db.ProcessedWebhookEvents.Add(new ProcessedWebhookEvent
        {
            Id = evt.EventId,
            EventType = evt.EventType,
            TransactionId = paymentId,
            Outcome = outcome is StripeWebhookOutcome.Refunded or StripeWebhookOutcome.Revoked
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
            return StripeWebhookOutcome.Duplicate;
        }

        logger.LogInformation("Stripe {EventType} {EventId}: {Outcome}", evt.EventType, evt.EventId, outcome);
        return outcome;
    }

    private async Task<(StripeWebhookOutcome, string?)> SessionAsync(JsonElement session, bool requirePaid, CancellationToken ct)
    {
        var sessionId = session.GetStringOrNull("id");
        if (sessionId is null)
        {
            return (StripeWebhookOutcome.Invalid, null);
        }

        var product = session.TryGetProperty("metadata", out var metadata) && metadata.ValueKind == JsonValueKind.Object
            ? metadata.GetStringOrNull("product")
            : null;
        if (product != SupporterProduct || session.GetStringOrNull("mode") != "payment")
        {
            return (StripeWebhookOutcome.Ignored, null);
        }

        // Boleto-like methods complete the session before the money lands
        // (payment_status "unpaid"); async_payment_succeeded follows when it does.
        if (requirePaid && session.GetStringOrNull("payment_status") != "paid")
        {
            return (StripeWebhookOutcome.Ignored, null);
        }

        var paymentId = session.GetStringOrNull("payment_intent");
        if (paymentId is null)
        {
            return (StripeWebhookOutcome.Invalid, null);
        }

        // A late retry of this event can arrive after its refund was handled.
        if (await db.ProcessedWebhookEvents.AnyAsync(e => e.TransactionId == paymentId && e.Outcome == RefundedOutcome, ct))
        {
            return (StripeWebhookOutcome.Ignored, paymentId);
        }

        if (!Guid.TryParse(session.GetStringOrNull("client_reference_id"), out var userId))
        {
            logger.LogWarning("Stripe session {SessionId} is a Supporter purchase without a valid client_reference_id", sessionId);
            return (StripeWebhookOutcome.UserNotFound, paymentId);
        }

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null)
        {
            logger.LogWarning("Stripe session {SessionId} is for unknown user {UserId}", sessionId, userId);
            return (StripeWebhookOutcome.UserNotFound, paymentId);
        }

        if (user.SupporterSinceUtc is not null)
        {
            // Bought twice: the first purchase stays the one on record (the
            // second can be refunded in Stripe without touching the perks).
            return (StripeWebhookOutcome.AlreadySupporter, paymentId);
        }

        user.SupporterSinceUtc = DateTime.UtcNow;
        user.SupporterPaymentId = paymentId;
        return (StripeWebhookOutcome.Granted, paymentId);
    }

    private async Task<(StripeWebhookOutcome, string?)> RefundAsync(JsonElement charge, CancellationToken ct)
    {
        var paymentId = charge.GetStringOrNull("payment_intent");
        // "refunded" is true only once the whole amount went back.
        var fullyRefunded = charge.TryGetProperty("refunded", out var refunded) && refunded.ValueKind == JsonValueKind.True;
        if (paymentId is null || !fullyRefunded)
        {
            return (StripeWebhookOutcome.Ignored, paymentId);
        }
        return await RevokeAsync(paymentId, ct);
    }

    private async Task<(StripeWebhookOutcome, string?)> DisputeAsync(JsonElement dispute, CancellationToken ct)
    {
        var paymentId = dispute.GetStringOrNull("payment_intent");
        if (paymentId is null || dispute.GetStringOrNull("status") != "lost")
        {
            // Won or withdrawn disputes: Supporter stays.
            return (StripeWebhookOutcome.Ignored, paymentId);
        }
        return await RevokeAsync(paymentId, ct);
    }

    private async Task<(StripeWebhookOutcome, string?)> RevokeAsync(string paymentId, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.SupporterPaymentId == paymentId, ct);
        if (user is null)
        {
            return (StripeWebhookOutcome.Refunded, paymentId);
        }

        user.SupporterSinceUtc = null;
        user.SupporterPaymentId = null;
        return (StripeWebhookOutcome.Revoked, paymentId);
    }

    // { "id": "evt_...", "type": "...", "data": { "object": { ... } } }
    private sealed record StripeEvent(string EventId, string EventType, JsonElement Object)
    {
        public static StripeEvent? Parse(string json)
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (root.ValueKind != JsonValueKind.Object) return null;

            var id = root.GetStringOrNull("id");
            var type = root.GetStringOrNull("type");
            if (id is null || type is null
                || !root.TryGetProperty("data", out var data) || data.ValueKind != JsonValueKind.Object
                || !data.TryGetProperty("object", out var obj) || obj.ValueKind != JsonValueKind.Object)
            {
                return null;
            }
            // Cloned because the JsonDocument is disposed when this returns.
            return new StripeEvent(id, type, obj.Clone());
        }
    }
}

internal static class JsonElementExtensions
{
    public static string? GetStringOrNull(this JsonElement element, string property) =>
        element.TryGetProperty(property, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() : null;
}
