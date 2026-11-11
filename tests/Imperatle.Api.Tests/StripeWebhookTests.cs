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

// The Supporter purchase webhook: signature checks, granting, refunds,
// disputes and idempotency, against EF Core's in-memory provider.
public class StripeWebhookTests
{
    private const string Secret = "whsec_test_secret";
    private const string Product = StripeWebhookProcessor.SupporterProduct;
    private static readonly DateTimeOffset Now = new(2026, 11, 10, 12, 0, 0, TimeSpan.Zero);

    private static readonly StripeOptions Options = new()
    {
        WebhookSecret = Secret,
        WebhookToleranceSeconds = 300,
    };

    private static ImperatleDbContext NewDb() => new(new DbContextOptionsBuilder<ImperatleDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString())
        .Options);

    private static StripeWebhookProcessor Processor(ImperatleDbContext db) =>
        new(db, NullLogger<StripeWebhookProcessor>.Instance);

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

    private static string Session(
        string eventId,
        string paymentId,
        Guid? userId,
        string product = Product,
        string paymentStatus = "paid",
        string eventType = "checkout.session.completed") => $$"""
        {
          "id": "{{eventId}}",
          "object": "event",
          "type": "{{eventType}}",
          "data": {
            "object": {
              "id": "cs_test_1",
              "object": "checkout.session",
              "mode": "payment",
              "payment_status": "{{paymentStatus}}",
              "payment_intent": "{{paymentId}}",
              "client_reference_id": {{(userId is null ? "null" : $"\"{userId}\"")}},
              "metadata": { "product": "{{product}}" }
            }
          }
        }
        """;

    private static string Refund(string eventId, string paymentId, bool full = true) => $$"""
        {
          "id": "{{eventId}}",
          "object": "event",
          "type": "charge.refunded",
          "data": {
            "object": {
              "id": "ch_1",
              "object": "charge",
              "payment_intent": "{{paymentId}}",
              "amount": 499,
              "amount_refunded": {{(full ? 499 : 100)}},
              "refunded": {{(full ? "true" : "false")}}
            }
          }
        }
        """;

    private static string DisputeClosed(string eventId, string paymentId, string status) => $$"""
        {
          "id": "{{eventId}}",
          "object": "event",
          "type": "charge.dispute.closed",
          "data": {
            "object": {
              "id": "dp_1",
              "object": "dispute",
              "charge": "ch_1",
              "payment_intent": "{{paymentId}}",
              "status": "{{status}}"
            }
          }
        }
        """;

    // ---- Signature -------------------------------------------------------

    [Fact]
    public void A_signature_made_with_the_secret_is_valid()
    {
        var body = Encoding.UTF8.GetBytes("""{"id":"evt_1"}""");
        var header = StripeSignature.BuildHeader(Now.ToUnixTimeSeconds(), body, Secret);

        Assert.Equal(StripeSignature.Result.Valid, StripeSignature.Verify(header, body, Secret, Now, TimeSpan.FromMinutes(5)));
    }

    [Fact]
    public void Matches_the_scheme_in_stripes_docs()
    {
        // HMAC-SHA256 hex of "1671552777.{body}" with the secret, computed independently.
        var body = Encoding.UTF8.GetBytes("{}");
        var expected = Convert.ToHexStringLower(System.Security.Cryptography.HMACSHA256.HashData(
            Encoding.UTF8.GetBytes("whsec_x"), Encoding.UTF8.GetBytes("1671552777.{}")));
        var at = DateTimeOffset.FromUnixTimeSeconds(1671552777);

        Assert.Equal(StripeSignature.Result.Valid,
            StripeSignature.Verify($"t=1671552777,v1={expected},v0=ignored", body, "whsec_x", at, TimeSpan.FromSeconds(5)));
    }

    [Fact]
    public void A_wrong_secret_or_a_changed_body_is_a_mismatch()
    {
        var body = Encoding.UTF8.GetBytes("""{"id":"evt_1"}""");
        var t = Now.ToUnixTimeSeconds();

        var otherSecret = StripeSignature.BuildHeader(t, body, "another_secret");
        Assert.Equal(StripeSignature.Result.Mismatch, StripeSignature.Verify(otherSecret, body, Secret, Now, TimeSpan.FromMinutes(5)));

        var header = StripeSignature.BuildHeader(t, body, Secret);
        var tampered = Encoding.UTF8.GetBytes("""{"id":"evt_2"}""");
        Assert.Equal(StripeSignature.Result.Mismatch, StripeSignature.Verify(header, tampered, Secret, Now, TimeSpan.FromMinutes(5)));

        // Even one added space breaks it: the raw body must not be reformatted.
        var spaced = Encoding.UTF8.GetBytes("""{"id": "evt_1"}""");
        Assert.Equal(StripeSignature.Result.Mismatch, StripeSignature.Verify(header, spaced, Secret, Now, TimeSpan.FromMinutes(5)));
    }

    [Fact]
    public void An_old_or_future_timestamp_is_stale()
    {
        var body = Encoding.UTF8.GetBytes("{}");
        var old = StripeSignature.BuildHeader(Now.AddMinutes(-6).ToUnixTimeSeconds(), body, Secret);
        var future = StripeSignature.BuildHeader(Now.AddMinutes(6).ToUnixTimeSeconds(), body, Secret);

        Assert.Equal(StripeSignature.Result.Stale, StripeSignature.Verify(old, body, Secret, Now, TimeSpan.FromMinutes(5)));
        Assert.Equal(StripeSignature.Result.Stale, StripeSignature.Verify(future, body, Secret, Now, TimeSpan.FromMinutes(5)));
    }

    [Fact]
    public void Any_of_several_v1_values_can_match_during_secret_rotation()
    {
        var body = Encoding.UTF8.GetBytes("{}");
        var t = Now.ToUnixTimeSeconds();
        var good = Convert.ToHexStringLower(StripeSignature.Compute(t, body, Secret));
        var header = $"t={t},v1={new string('0', 64)},v1={good}";

        Assert.Equal(StripeSignature.Result.Valid, StripeSignature.Verify(header, body, Secret, Now, TimeSpan.FromMinutes(5)));
    }

    [Theory]
    [InlineData(null, StripeSignature.Result.Missing)]
    [InlineData("", StripeSignature.Result.Missing)]
    [InlineData("garbage", StripeSignature.Result.Malformed)]
    [InlineData("t=abc,v1=00", StripeSignature.Result.Malformed)]
    [InlineData("t=1,v1=zz", StripeSignature.Result.Malformed)]
    [InlineData("v1=00", StripeSignature.Result.Malformed)]
    [InlineData("t=1", StripeSignature.Result.Malformed)]
    [InlineData("t=1,v0=00", StripeSignature.Result.Malformed)]
    public void Missing_or_malformed_headers_are_rejected(string? header, StripeSignature.Result expected)
    {
        Assert.Equal(expected, StripeSignature.Verify(header, "{}"u8, Secret, Now, TimeSpan.FromMinutes(5)));
    }

    [Fact]
    public void Without_a_configured_secret_nothing_is_accepted()
    {
        var body = Encoding.UTF8.GetBytes("{}");
        var header = StripeSignature.BuildHeader(Now.ToUnixTimeSeconds(), body, "");

        Assert.Equal(StripeSignature.Result.Missing, StripeSignature.Verify(header, body, "", Now, TimeSpan.FromMinutes(5)));
    }

    // ---- Processing ------------------------------------------------------

    [Fact]
    public async Task A_paid_supporter_session_grants_supporter()
    {
        await using var db = NewDb();
        var user = await AddUserAsync(db);

        var outcome = await Processor(db).ProcessAsync(Session("evt_1", "pi_1", user.Id), TestContext.Current.CancellationToken);

        Assert.Equal(StripeWebhookOutcome.Granted, outcome);
        var saved = await db.Users.SingleAsync(TestContext.Current.CancellationToken);
        Assert.NotNull(saved.SupporterSinceUtc);
        Assert.Equal("pi_1", saved.SupporterPaymentId);
        Assert.True(await db.ProcessedWebhookEvents.AnyAsync(e => e.Id == "evt_1", TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task An_unpaid_session_waits_for_the_async_payment()
    {
        await using var db = NewDb();
        var user = await AddUserAsync(db);

        Assert.Equal(StripeWebhookOutcome.Ignored,
            await Processor(db).ProcessAsync(Session("evt_1", "pi_1", user.Id, paymentStatus: "unpaid"), TestContext.Current.CancellationToken));
        Assert.Null((await db.Users.SingleAsync(TestContext.Current.CancellationToken)).SupporterSinceUtc);

        var outcome = await Processor(db).ProcessAsync(
            Session("evt_2", "pi_1", user.Id, paymentStatus: "paid", eventType: "checkout.session.async_payment_succeeded"),
            TestContext.Current.CancellationToken);

        Assert.Equal(StripeWebhookOutcome.Granted, outcome);
        Assert.NotNull((await db.Users.SingleAsync(TestContext.Current.CancellationToken)).SupporterSinceUtc);
    }

    [Fact]
    public async Task A_failed_async_payment_grants_nothing()
    {
        await using var db = NewDb();
        var user = await AddUserAsync(db);

        var outcome = await Processor(db).ProcessAsync(
            Session("evt_1", "pi_1", user.Id, paymentStatus: "unpaid", eventType: "checkout.session.async_payment_failed"),
            TestContext.Current.CancellationToken);

        Assert.Equal(StripeWebhookOutcome.Ignored, outcome);
        Assert.Null((await db.Users.SingleAsync(TestContext.Current.CancellationToken)).SupporterSinceUtc);
    }

    [Fact]
    public async Task A_replayed_event_is_applied_only_once()
    {
        await using var db = NewDb();
        var user = await AddUserAsync(db);
        var json = Session("evt_1", "pi_1", user.Id);

        Assert.Equal(StripeWebhookOutcome.Granted, await Processor(db).ProcessAsync(json, TestContext.Current.CancellationToken));

        // Revoke by refund, then replay the original purchase event: still revoked.
        Assert.Equal(StripeWebhookOutcome.Revoked,
            await Processor(db).ProcessAsync(Refund("evt_2", "pi_1"), TestContext.Current.CancellationToken));
        Assert.Equal(StripeWebhookOutcome.Duplicate, await Processor(db).ProcessAsync(json, TestContext.Current.CancellationToken));
        Assert.Null((await db.Users.SingleAsync(TestContext.Current.CancellationToken)).SupporterSinceUtc);
        Assert.Equal(2, await db.ProcessedWebhookEvents.CountAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task A_late_purchase_event_after_its_refund_does_not_grant_again()
    {
        await using var db = NewDb();
        var user = await AddUserAsync(db);
        await Processor(db).ProcessAsync(Session("evt_1", "pi_1", user.Id), TestContext.Current.CancellationToken);
        await Processor(db).ProcessAsync(Refund("evt_2", "pi_1"), TestContext.Current.CancellationToken);

        // A different event for the same payment (async success) arrives out of order.
        var outcome = await Processor(db).ProcessAsync(
            Session("evt_3", "pi_1", user.Id, eventType: "checkout.session.async_payment_succeeded"),
            TestContext.Current.CancellationToken);

        Assert.Equal(StripeWebhookOutcome.Ignored, outcome);
        Assert.Null((await db.Users.SingleAsync(TestContext.Current.CancellationToken)).SupporterSinceUtc);
    }

    [Fact]
    public async Task A_full_refund_revokes()
    {
        await using var db = NewDb();
        var user = await AddUserAsync(db);
        await Processor(db).ProcessAsync(Session("evt_1", "pi_1", user.Id), TestContext.Current.CancellationToken);

        var outcome = await Processor(db).ProcessAsync(Refund("evt_2", "pi_1"), TestContext.Current.CancellationToken);

        Assert.Equal(StripeWebhookOutcome.Revoked, outcome);
        var saved = await db.Users.SingleAsync(TestContext.Current.CancellationToken);
        Assert.Null(saved.SupporterSinceUtc);
        Assert.Null(saved.SupporterPaymentId);
    }

    [Fact]
    public async Task A_partial_refund_keeps_supporter()
    {
        await using var db = NewDb();
        var user = await AddUserAsync(db);
        await Processor(db).ProcessAsync(Session("evt_1", "pi_1", user.Id), TestContext.Current.CancellationToken);

        var outcome = await Processor(db).ProcessAsync(Refund("evt_2", "pi_1", full: false), TestContext.Current.CancellationToken);

        Assert.Equal(StripeWebhookOutcome.Ignored, outcome);
        Assert.NotNull((await db.Users.SingleAsync(TestContext.Current.CancellationToken)).SupporterSinceUtc);
    }

    [Theory]
    [InlineData("lost", StripeWebhookOutcome.Revoked)]
    [InlineData("won", StripeWebhookOutcome.Ignored)]
    [InlineData("warning_closed", StripeWebhookOutcome.Ignored)]
    public async Task Only_a_lost_dispute_revokes(string status, StripeWebhookOutcome expected)
    {
        await using var db = NewDb();
        var user = await AddUserAsync(db);
        await Processor(db).ProcessAsync(Session("evt_1", "pi_1", user.Id), TestContext.Current.CancellationToken);

        var outcome = await Processor(db).ProcessAsync(DisputeClosed("evt_2", "pi_1", status), TestContext.Current.CancellationToken);

        Assert.Equal(expected, outcome);
        var stillSupporter = (await db.Users.SingleAsync(TestContext.Current.CancellationToken)).SupporterSinceUtc is not null;
        Assert.Equal(expected != StripeWebhookOutcome.Revoked, stillSupporter);
    }

    [Fact]
    public async Task A_refund_of_another_payment_keeps_supporter()
    {
        await using var db = NewDb();
        var user = await AddUserAsync(db);
        await Processor(db).ProcessAsync(Session("evt_1", "pi_1", user.Id), TestContext.Current.CancellationToken);

        var outcome = await Processor(db).ProcessAsync(Refund("evt_2", "pi_other"), TestContext.Current.CancellationToken);

        Assert.Equal(StripeWebhookOutcome.Refunded, outcome);
        Assert.NotNull((await db.Users.SingleAsync(TestContext.Current.CancellationToken)).SupporterSinceUtc);
    }

    [Fact]
    public async Task A_session_for_another_product_is_ignored()
    {
        await using var db = NewDb();
        var user = await AddUserAsync(db);

        var outcome = await Processor(db).ProcessAsync(Session("evt_1", "pi_1", user.Id, product: "other_app"), TestContext.Current.CancellationToken);

        Assert.Equal(StripeWebhookOutcome.Ignored, outcome);
        Assert.Null((await db.Users.SingleAsync(TestContext.Current.CancellationToken)).SupporterSinceUtc);
    }

    [Fact]
    public async Task Buying_twice_keeps_the_first_purchase()
    {
        await using var db = NewDb();
        var user = await AddUserAsync(db);
        await Processor(db).ProcessAsync(Session("evt_1", "pi_1", user.Id), TestContext.Current.CancellationToken);

        var outcome = await Processor(db).ProcessAsync(Session("evt_2", "pi_2", user.Id), TestContext.Current.CancellationToken);

        Assert.Equal(StripeWebhookOutcome.AlreadySupporter, outcome);
        Assert.Equal("pi_1", (await db.Users.SingleAsync(TestContext.Current.CancellationToken)).SupporterPaymentId);
    }

    [Fact]
    public async Task An_unknown_or_missing_user_is_not_recorded_so_it_can_be_resent()
    {
        await using var db = NewDb();

        Assert.Equal(StripeWebhookOutcome.UserNotFound,
            await Processor(db).ProcessAsync(Session("evt_1", "pi_1", Guid.NewGuid()), TestContext.Current.CancellationToken));
        Assert.Equal(StripeWebhookOutcome.UserNotFound,
            await Processor(db).ProcessAsync(Session("evt_2", "pi_2", userId: null), TestContext.Current.CancellationToken));
        Assert.Empty(await db.ProcessedWebhookEvents.ToListAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Other_event_types_are_acknowledged_and_ignored()
    {
        await using var db = NewDb();

        var outcome = await Processor(db).ProcessAsync(
            """{"id":"evt_9","type":"customer.created","data":{"object":{"id":"cus_1"}}}""", TestContext.Current.CancellationToken);

        Assert.Equal(StripeWebhookOutcome.Ignored, outcome);
        Assert.True(await db.ProcessedWebhookEvents.AnyAsync(e => e.Id == "evt_9", TestContext.Current.CancellationToken));
    }

    [Theory]
    [InlineData("not json")]
    [InlineData("[]")]
    [InlineData("""{"type":"checkout.session.completed","data":{"object":{}}}""")]
    [InlineData("""{"id":"evt_1","type":"checkout.session.completed"}""")]
    [InlineData("""{"id":"evt_1","type":"checkout.session.completed","data":{}}""")]
    [InlineData("""{"id":"evt_1","type":"checkout.session.completed","data":{"object":{"mode":"payment"}}}""")]
    [InlineData("""{"id":"evt_1","type":"checkout.session.completed","data":{"object":{"id":"cs_1","mode":"payment","payment_status":"paid","metadata":{"product":"imperatle_supporter"}}}}""")]
    public async Task Malformed_payloads_are_invalid(string json)
    {
        await using var db = NewDb();

        Assert.Equal(StripeWebhookOutcome.Invalid, await Processor(db).ProcessAsync(json, TestContext.Current.CancellationToken));
    }

    // ---- Controller ------------------------------------------------------

    private static StripeWebhookController Controller(ImperatleDbContext db, string body, string? signature)
    {
        var context = new DefaultHttpContext();
        context.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(body));
        if (signature is not null)
        {
            context.Request.Headers[StripeSignature.HeaderName] = signature;
        }

        return new StripeWebhookController(
            Processor(db),
            Microsoft.Extensions.Options.Options.Create(Options),
            new FixedClock(Now),
            NullLogger<StripeWebhookController>.Instance)
        {
            ControllerContext = new ControllerContext { HttpContext = context },
        };
    }

    [Fact]
    public async Task The_endpoint_rejects_a_bad_signature_without_touching_the_database()
    {
        await using var db = NewDb();
        var user = await AddUserAsync(db);
        var body = Session("evt_1", "pi_1", user.Id);
        var forged = StripeSignature.BuildHeader(Now.ToUnixTimeSeconds(), Encoding.UTF8.GetBytes(body), "attacker_secret");

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
        var body = Session("evt_1", "pi_1", user.Id);
        var stale = StripeSignature.BuildHeader(Now.AddHours(-1).ToUnixTimeSeconds(), Encoding.UTF8.GetBytes(body), Secret);

        Assert.IsType<UnauthorizedResult>(await Controller(db, body, null).Receive(TestContext.Current.CancellationToken));
        Assert.IsType<UnauthorizedResult>(await Controller(db, body, stale).Receive(TestContext.Current.CancellationToken));
        Assert.Null((await db.Users.SingleAsync(TestContext.Current.CancellationToken)).SupporterSinceUtc);
    }

    [Fact]
    public async Task The_endpoint_grants_on_a_signed_event_and_acknowledges_its_replay()
    {
        await using var db = NewDb();
        var user = await AddUserAsync(db);
        var body = Session("evt_1", "pi_1", user.Id);
        var signature = StripeSignature.BuildHeader(Now.ToUnixTimeSeconds(), Encoding.UTF8.GetBytes(body), Secret);

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
        var signature = StripeSignature.BuildHeader(Now.ToUnixTimeSeconds(), Encoding.UTF8.GetBytes(body), Secret);

        Assert.IsType<BadRequestResult>(await Controller(db, body, signature).Receive(TestContext.Current.CancellationToken));
    }

    private sealed class FixedClock(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }
}
