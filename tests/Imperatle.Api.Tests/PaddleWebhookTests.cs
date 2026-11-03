using System.Text;
using Imperatle.Api.Controllers;
using Imperatle.Api.Data;
using Imperatle.Api.Models;
using Imperatle.Api.Payments;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace Imperatle.Api.Tests;

// The Supporter purchase webhook: signature checks, granting, refunds and
// idempotency, against EF Core's in-memory provider.
public class PaddleWebhookTests
{
    private const string Secret = "pdl_ntfset_test_secret";
    private const string PriceId = "pri_supporter";
    private static readonly DateTimeOffset Now = new(2026, 11, 3, 12, 0, 0, TimeSpan.Zero);

    private static readonly PaddleOptions Options = new()
    {
        WebhookSecret = Secret,
        SupporterPriceId = PriceId,
        WebhookToleranceSeconds = 300,
    };

    private static ImperatleDbContext NewDb() => new(new DbContextOptionsBuilder<ImperatleDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString())
        .Options);

    private static PaddleWebhookProcessor Processor(ImperatleDbContext db) =>
        new(db, Microsoft.Extensions.Options.Options.Create(Options), NullLogger<PaddleWebhookProcessor>.Instance);

    private static async Task<User> AddUserAsync(ImperatleDbContext db)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            GoogleSubject = Guid.NewGuid().ToString(),
            Email = "player@example.com",
            DisplayName = "Player",
            CreatedAtUtc = DateTime.UtcNow,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return user;
    }

    private static string Completed(string eventId, string transactionId, Guid? userId, string priceId = PriceId) => $$"""
        {
          "event_id": "{{eventId}}",
          "event_type": "transaction.completed",
          "occurred_at": "2026-11-03T12:00:00.000000Z",
          "notification_id": "ntf_1",
          "data": {
            "id": "{{transactionId}}",
            "status": "completed",
            "custom_data": {{(userId is null ? "null" : $$"""{ "userId": "{{userId}}" }""")}},
            "items": [ { "price": { "id": "{{priceId}}" }, "quantity": 1 } ]
          }
        }
        """;

    private static string Adjustment(string eventId, string transactionId, string action = "refund", string type = "full", string status = "approved", string eventType = "adjustment.updated") => $$"""
        {
          "event_id": "{{eventId}}",
          "event_type": "{{eventType}}",
          "occurred_at": "2026-11-03T12:00:00.000000Z",
          "notification_id": "ntf_2",
          "data": {
            "id": "adj_1",
            "action": "{{action}}",
            "type": "{{type}}",
            "status": "{{status}}",
            "transaction_id": "{{transactionId}}"
          }
        }
        """;

    // ---- Signature -------------------------------------------------------

    [Fact]
    public void A_signature_made_with_the_secret_is_valid()
    {
        var body = Encoding.UTF8.GetBytes("""{"event_id":"evt_1"}""");
        var header = PaddleSignature.BuildHeader(Now.ToUnixTimeSeconds(), body, Secret);

        Assert.Equal(PaddleSignature.Result.Valid, PaddleSignature.Verify(header, body, Secret, Now, TimeSpan.FromMinutes(5)));
    }

    [Fact]
    public void Matches_the_example_computed_like_paddles_docs()
    {
        // HMAC-SHA256 hex of "1671552777:{body}" with key "secret", computed independently.
        var body = Encoding.UTF8.GetBytes("{}");
        var expected = Convert.ToHexStringLower(System.Security.Cryptography.HMACSHA256.HashData(
            Encoding.UTF8.GetBytes("secret"), Encoding.UTF8.GetBytes("1671552777:{}")));
        var at = DateTimeOffset.FromUnixTimeSeconds(1671552777);

        Assert.Equal(PaddleSignature.Result.Valid,
            PaddleSignature.Verify($"ts=1671552777;h1={expected}", body, "secret", at, TimeSpan.FromSeconds(5)));
    }

    [Fact]
    public void A_wrong_secret_or_a_changed_body_is_a_mismatch()
    {
        var body = Encoding.UTF8.GetBytes("""{"event_id":"evt_1"}""");
        var ts = Now.ToUnixTimeSeconds();

        var otherSecret = PaddleSignature.BuildHeader(ts, body, "another_secret");
        Assert.Equal(PaddleSignature.Result.Mismatch, PaddleSignature.Verify(otherSecret, body, Secret, Now, TimeSpan.FromMinutes(5)));

        var header = PaddleSignature.BuildHeader(ts, body, Secret);
        var tampered = Encoding.UTF8.GetBytes("""{"event_id":"evt_2"}""");
        Assert.Equal(PaddleSignature.Result.Mismatch, PaddleSignature.Verify(header, tampered, Secret, Now, TimeSpan.FromMinutes(5)));

        // Even one added space breaks it: the raw body must not be reformatted.
        var spaced = Encoding.UTF8.GetBytes("""{"event_id": "evt_1"}""");
        Assert.Equal(PaddleSignature.Result.Mismatch, PaddleSignature.Verify(header, spaced, Secret, Now, TimeSpan.FromMinutes(5)));
    }

    [Fact]
    public void An_old_or_future_timestamp_is_stale()
    {
        var body = Encoding.UTF8.GetBytes("{}");
        var old = PaddleSignature.BuildHeader(Now.AddMinutes(-6).ToUnixTimeSeconds(), body, Secret);
        var future = PaddleSignature.BuildHeader(Now.AddMinutes(6).ToUnixTimeSeconds(), body, Secret);

        Assert.Equal(PaddleSignature.Result.Stale, PaddleSignature.Verify(old, body, Secret, Now, TimeSpan.FromMinutes(5)));
        Assert.Equal(PaddleSignature.Result.Stale, PaddleSignature.Verify(future, body, Secret, Now, TimeSpan.FromMinutes(5)));
    }

    [Fact]
    public void Any_of_several_h1_values_can_match_during_secret_rotation()
    {
        var body = Encoding.UTF8.GetBytes("{}");
        var ts = Now.ToUnixTimeSeconds();
        var good = Convert.ToHexStringLower(PaddleSignature.Compute(ts, body, Secret));
        var header = $"ts={ts};h1={new string('0', 64)};h1={good}";

        Assert.Equal(PaddleSignature.Result.Valid, PaddleSignature.Verify(header, body, Secret, Now, TimeSpan.FromMinutes(5)));
    }

    [Theory]
    [InlineData(null, PaddleSignature.Result.Missing)]
    [InlineData("", PaddleSignature.Result.Missing)]
    [InlineData("garbage", PaddleSignature.Result.Malformed)]
    [InlineData("ts=abc;h1=00", PaddleSignature.Result.Malformed)]
    [InlineData("ts=1;h1=zz", PaddleSignature.Result.Malformed)]
    [InlineData("h1=00", PaddleSignature.Result.Malformed)]
    [InlineData("ts=1", PaddleSignature.Result.Malformed)]
    public void Missing_or_malformed_headers_are_rejected(string? header, PaddleSignature.Result expected)
    {
        Assert.Equal(expected, PaddleSignature.Verify(header, "{}"u8, Secret, Now, TimeSpan.FromMinutes(5)));
    }

    [Fact]
    public void Without_a_configured_secret_nothing_is_accepted()
    {
        var body = Encoding.UTF8.GetBytes("{}");
        var header = PaddleSignature.BuildHeader(Now.ToUnixTimeSeconds(), body, "");

        Assert.Equal(PaddleSignature.Result.Missing, PaddleSignature.Verify(header, body, "", Now, TimeSpan.FromMinutes(5)));
    }

    // ---- Processing ------------------------------------------------------

    [Fact]
    public async Task A_completed_supporter_transaction_grants_supporter()
    {
        await using var db = NewDb();
        var user = await AddUserAsync(db);

        var outcome = await Processor(db).ProcessAsync(Completed("evt_1", "txn_1", user.Id), TestContext.Current.CancellationToken);

        Assert.Equal(PaddleWebhookOutcome.Granted, outcome);
        var saved = await db.Users.SingleAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(saved.SupporterSinceUtc);
        Assert.Equal("txn_1", saved.PaddleTransactionId);
        Assert.True(await db.ProcessedWebhookEvents.AnyAsync(e => e.Id == "evt_1", TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task A_replayed_event_is_applied_only_once()
    {
        await using var db = NewDb();
        var user = await AddUserAsync(db);
        var json = Completed("evt_1", "txn_1", user.Id);

        Assert.Equal(PaddleWebhookOutcome.Granted, await Processor(db).ProcessAsync(json, TestContext.Current.CancellationToken));
        var since = (await db.Users.SingleAsync(TestContext.Current.CancellationToken)).SupporterSinceUtc;

        // Revoke by refund, then replay the original purchase event: still revoked.
        Assert.Equal(PaddleWebhookOutcome.Revoked,
            await Processor(db).ProcessAsync(Adjustment("evt_2", "txn_1"), TestContext.Current.CancellationToken));
        Assert.Equal(PaddleWebhookOutcome.Duplicate, await Processor(db).ProcessAsync(json, TestContext.Current.CancellationToken));
        Assert.Null((await db.Users.SingleAsync(TestContext.Current.CancellationToken)).SupporterSinceUtc);
        Assert.NotNull(since);
        Assert.Equal(2, await db.ProcessedWebhookEvents.CountAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task A_late_purchase_event_after_its_refund_does_not_grant_again()
    {
        await using var db = NewDb();
        var user = await AddUserAsync(db);
        await Processor(db).ProcessAsync(Completed("evt_1", "txn_1", user.Id), TestContext.Current.CancellationToken);
        await Processor(db).ProcessAsync(Adjustment("evt_2", "txn_1"), TestContext.Current.CancellationToken);

        // A different delivery for the same transaction (new event id) arrives out of order.
        var outcome = await Processor(db).ProcessAsync(Completed("evt_3", "txn_1", user.Id), TestContext.Current.CancellationToken);

        Assert.Equal(PaddleWebhookOutcome.Ignored, outcome);
        Assert.Null((await db.Users.SingleAsync(TestContext.Current.CancellationToken)).SupporterSinceUtc);
    }

    [Theory]
    [InlineData("refund", "full", "approved", "adjustment.updated")]
    [InlineData("refund", "full", "approved", "adjustment.created")]
    [InlineData("chargeback", "full", "approved", "adjustment.created")]
    public async Task A_full_approved_refund_or_chargeback_revokes(string action, string type, string status, string eventType)
    {
        await using var db = NewDb();
        var user = await AddUserAsync(db);
        await Processor(db).ProcessAsync(Completed("evt_1", "txn_1", user.Id), TestContext.Current.CancellationToken);

        var outcome = await Processor(db).ProcessAsync(Adjustment("evt_2", "txn_1", action, type, status, eventType), TestContext.Current.CancellationToken);

        Assert.Equal(PaddleWebhookOutcome.Revoked, outcome);
        var saved = await db.Users.SingleAsync(TestContext.Current.CancellationToken);
        Assert.Null(saved.SupporterSinceUtc);
        Assert.Null(saved.PaddleTransactionId);
    }

    [Theory]
    [InlineData("refund", "partial", "approved")]
    [InlineData("refund", "full", "pending_approval")]
    [InlineData("refund", "full", "rejected")]
    [InlineData("credit", "full", "approved")]
    [InlineData("chargeback_warning", "full", "approved")]
    public async Task Partial_pending_rejected_or_non_refund_adjustments_keep_supporter(string action, string type, string status)
    {
        await using var db = NewDb();
        var user = await AddUserAsync(db);
        await Processor(db).ProcessAsync(Completed("evt_1", "txn_1", user.Id), TestContext.Current.CancellationToken);

        var outcome = await Processor(db).ProcessAsync(Adjustment("evt_2", "txn_1", action, type, status), TestContext.Current.CancellationToken);

        Assert.Equal(PaddleWebhookOutcome.Ignored, outcome);
        Assert.NotNull((await db.Users.SingleAsync(TestContext.Current.CancellationToken)).SupporterSinceUtc);
    }

    [Fact]
    public async Task A_refund_of_another_transaction_keeps_supporter()
    {
        await using var db = NewDb();
        var user = await AddUserAsync(db);
        await Processor(db).ProcessAsync(Completed("evt_1", "txn_1", user.Id), TestContext.Current.CancellationToken);

        var outcome = await Processor(db).ProcessAsync(Adjustment("evt_2", "txn_other"), TestContext.Current.CancellationToken);

        Assert.Equal(PaddleWebhookOutcome.Refunded, outcome);
        Assert.NotNull((await db.Users.SingleAsync(TestContext.Current.CancellationToken)).SupporterSinceUtc);
    }

    [Fact]
    public async Task A_transaction_for_another_price_is_ignored()
    {
        await using var db = NewDb();
        var user = await AddUserAsync(db);

        var outcome = await Processor(db).ProcessAsync(Completed("evt_1", "txn_1", user.Id, priceId: "pri_other"), TestContext.Current.CancellationToken);

        Assert.Equal(PaddleWebhookOutcome.Ignored, outcome);
        Assert.Null((await db.Users.SingleAsync(TestContext.Current.CancellationToken)).SupporterSinceUtc);
    }

    [Fact]
    public async Task Buying_twice_keeps_the_first_purchase()
    {
        await using var db = NewDb();
        var user = await AddUserAsync(db);
        await Processor(db).ProcessAsync(Completed("evt_1", "txn_1", user.Id), TestContext.Current.CancellationToken);

        var outcome = await Processor(db).ProcessAsync(Completed("evt_2", "txn_2", user.Id), TestContext.Current.CancellationToken);

        Assert.Equal(PaddleWebhookOutcome.AlreadySupporter, outcome);
        Assert.Equal("txn_1", (await db.Users.SingleAsync(TestContext.Current.CancellationToken)).PaddleTransactionId);
    }

    [Fact]
    public async Task An_unknown_or_missing_user_is_not_recorded_so_it_can_be_replayed()
    {
        await using var db = NewDb();

        Assert.Equal(PaddleWebhookOutcome.UserNotFound,
            await Processor(db).ProcessAsync(Completed("evt_1", "txn_1", Guid.NewGuid()), TestContext.Current.CancellationToken));
        Assert.Equal(PaddleWebhookOutcome.UserNotFound,
            await Processor(db).ProcessAsync(Completed("evt_2", "txn_2", userId: null), TestContext.Current.CancellationToken));
        Assert.Empty(await db.ProcessedWebhookEvents.ToListAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Other_event_types_are_acknowledged_and_ignored()
    {
        await using var db = NewDb();

        var outcome = await Processor(db).ProcessAsync(
            """{"event_id":"evt_9","event_type":"customer.created","data":{"id":"ctm_1"}}""", TestContext.Current.CancellationToken);

        Assert.Equal(PaddleWebhookOutcome.Ignored, outcome);
        Assert.True(await db.ProcessedWebhookEvents.AnyAsync(e => e.Id == "evt_9", TestContext.Current.CancellationToken));
    }

    [Theory]
    [InlineData("not json")]
    [InlineData("[]")]
    [InlineData("""{"event_type":"transaction.completed","data":{}}""")]
    [InlineData("""{"event_id":"evt_1","event_type":"transaction.completed"}""")]
    [InlineData("""{"event_id":"evt_1","event_type":"transaction.completed","data":{"status":"completed"}}""")]
    public async Task Malformed_payloads_are_invalid(string json)
    {
        await using var db = NewDb();

        Assert.Equal(PaddleWebhookOutcome.Invalid, await Processor(db).ProcessAsync(json, TestContext.Current.CancellationToken));
    }

    // ---- Controller ------------------------------------------------------

    private static PaddleWebhookController Controller(ImperatleDbContext db, string body, string? signature)
    {
        var context = new DefaultHttpContext();
        context.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(body));
        if (signature is not null)
        {
            context.Request.Headers[PaddleSignature.HeaderName] = signature;
        }

        return new PaddleWebhookController(
            Processor(db),
            Microsoft.Extensions.Options.Options.Create(Options),
            new FixedClock(Now),
            NullLogger<PaddleWebhookController>.Instance)
        {
            ControllerContext = new ControllerContext { HttpContext = context },
        };
    }

    [Fact]
    public async Task The_endpoint_rejects_a_bad_signature_without_touching_the_database()
    {
        await using var db = NewDb();
        var user = await AddUserAsync(db);
        var body = Completed("evt_1", "txn_1", user.Id);
        var forged = PaddleSignature.BuildHeader(Now.ToUnixTimeSeconds(), Encoding.UTF8.GetBytes(body), "attacker_secret");

        var result = await Controller(db, body, forged).Receive(TestContext.Current.CancellationToken);

        Assert.IsType<UnauthorizedResult>(result);
        Assert.Null((await db.Users.SingleAsync(TestContext.Current.CancellationToken)).SupporterSinceUtc);
        Assert.Empty(await db.ProcessedWebhookEvents.ToListAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task The_endpoint_rejects_a_missing_signature_and_a_stale_one()
    {
        await using var db = NewDb();
        var user = await AddUserAsync(db);
        var body = Completed("evt_1", "txn_1", user.Id);
        var stale = PaddleSignature.BuildHeader(Now.AddHours(-1).ToUnixTimeSeconds(), Encoding.UTF8.GetBytes(body), Secret);

        Assert.IsType<UnauthorizedResult>(await Controller(db, body, null).Receive(TestContext.Current.CancellationToken));
        Assert.IsType<UnauthorizedResult>(await Controller(db, body, stale).Receive(TestContext.Current.CancellationToken));
        Assert.Null((await db.Users.SingleAsync(TestContext.Current.CancellationToken)).SupporterSinceUtc);
    }

    [Fact]
    public async Task The_endpoint_grants_on_a_signed_event_and_acknowledges_its_replay()
    {
        await using var db = NewDb();
        var user = await AddUserAsync(db);
        var body = Completed("evt_1", "txn_1", user.Id);
        var signature = PaddleSignature.BuildHeader(Now.ToUnixTimeSeconds(), Encoding.UTF8.GetBytes(body), Secret);

        Assert.IsType<OkResult>(await Controller(db, body, signature).Receive(TestContext.Current.CancellationToken));
        Assert.IsType<OkResult>(await Controller(db, body, signature).Receive(TestContext.Current.CancellationToken));

        Assert.NotNull((await db.Users.SingleAsync(TestContext.Current.CancellationToken)).SupporterSinceUtc);
        Assert.Single(await db.ProcessedWebhookEvents.ToListAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task The_endpoint_answers_bad_request_to_a_signed_but_malformed_body()
    {
        await using var db = NewDb();
        const string body = "not json";
        var signature = PaddleSignature.BuildHeader(Now.ToUnixTimeSeconds(), Encoding.UTF8.GetBytes(body), Secret);

        Assert.IsType<BadRequestResult>(await Controller(db, body, signature).Receive(TestContext.Current.CancellationToken));
    }

    private sealed class FixedClock(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }
}
