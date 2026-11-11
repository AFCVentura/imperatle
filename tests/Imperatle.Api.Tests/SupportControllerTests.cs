using Imperatle.Api.Controllers;
using Imperatle.Api.Data;
using Imperatle.Api.Models;
using Imperatle.Api.Payments;
using Imperatle.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Stripe;

namespace Imperatle.Api.Tests;

// Opening the Stripe Checkout and showing the price, with Stripe replaced by a
// fake: who may buy, where Stripe sends the buyer back, and what a Stripe
// failure turns into.
public class SupportControllerTests
{
    private const string Origin = "https://imperatle.com";

    private static readonly StripeOptions Configured = new() { SecretKey = "sk_test_x", SupporterPriceId = "price_x" };

    private sealed class FakeCheckout : ISupporterCheckout
    {
        public SupporterCheckoutRequest? LastRequest { get; private set; }
        public bool Fail { get; init; }

        public Task<SupporterPrice?> GetPriceAsync(CancellationToken ct = default) => Fail
            ? throw new StripeException("down")
            : Task.FromResult<SupporterPrice?>(new SupporterPrice("usd", new Dictionary<string, long> { ["usd"] = 499, ["brl"] = 990 }));

        public Task<string> CreateSessionAsync(SupporterCheckoutRequest request, CancellationToken ct = default)
        {
            if (Fail) throw new StripeException("down");
            LastRequest = request;
            return Task.FromResult("https://checkout.stripe.com/c/pay/cs_test_1");
        }
    }

    private sealed class Player(Guid? userId, bool devSupporter = false) : ICurrentPlayer
    {
        public Guid AnonymousId { get; } = Guid.NewGuid();
        public Guid? UserId => userId;
        public Task<bool> IsSupporterAsync(CancellationToken ct = default) => Task.FromResult(devSupporter);
    }

    private static async Task<User> AddUserAsync(ImperatleDbContext db, bool supporter = false)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            GoogleSubject = Guid.NewGuid().ToString(),
            Email = "player@example.com",
            DisplayName = "Player",
            CreatedAtUtc = DateTime.UtcNow,
            SupporterSinceUtc = supporter ? DateTime.UtcNow : null,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync(TestContext.Current.CancellationToken);
        return user;
    }

    private static SupportController Controller(ImperatleDbContext db, ICurrentPlayer player, FakeCheckout checkout, StripeOptions? options = null)
    {
        var context = new DefaultHttpContext();
        context.Request.Headers.Origin = Origin;
        return new SupportController(
            db,
            player,
            checkout,
            Microsoft.Extensions.Options.Options.Create(options ?? Configured),
            NullLogger<SupportController>.Instance)
        {
            ControllerContext = new ControllerContext { HttpContext = context },
        };
    }

    [Fact]
    public async Task A_signed_in_non_supporter_gets_a_checkout_url_that_returns_to_the_site()
    {
        await using var db = PerksTestSupport.NewDb();
        var user = await AddUserAsync(db);
        var checkout = new FakeCheckout();

        var result = await Controller(db, new Player(user.Id), checkout)
            .Checkout(new SupportCheckoutRequest("pt"), TestContext.Current.CancellationToken);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.StartsWith("https://checkout.stripe.com/", Assert.IsType<SupportCheckoutResponse>(ok.Value).Url);
        Assert.NotNull(checkout.LastRequest);
        Assert.Equal(user.Id, checkout.LastRequest.UserId);
        Assert.Equal("pt", checkout.LastRequest.Locale);
        Assert.Equal($"{Origin}/pt?support=thanks", checkout.LastRequest.SuccessUrl);
        Assert.Equal($"{Origin}/pt?support=1", checkout.LastRequest.CancelUrl);
    }

    [Fact]
    public async Task An_unknown_locale_falls_back_to_english()
    {
        await using var db = PerksTestSupport.NewDb();
        var user = await AddUserAsync(db);
        var checkout = new FakeCheckout();

        await Controller(db, new Player(user.Id), checkout).Checkout(new SupportCheckoutRequest("xx"), TestContext.Current.CancellationToken);

        Assert.Equal($"{Origin}/en?support=thanks", checkout.LastRequest?.SuccessUrl);
    }

    [Fact]
    public async Task Signed_out_players_must_log_in_first()
    {
        await using var db = PerksTestSupport.NewDb();

        var result = await Controller(db, new Player(null), new FakeCheckout())
            .Checkout(new SupportCheckoutRequest("en"), TestContext.Current.CancellationToken);

        Assert.IsType<UnauthorizedResult>(result);
    }

    [Theory]
    [InlineData(true, false)]
    [InlineData(false, true)]
    public async Task A_supporter_is_never_sent_to_checkout_again(bool purchased, bool devSupporter)
    {
        await using var db = PerksTestSupport.NewDb();
        var user = await AddUserAsync(db, supporter: purchased);
        var checkout = new FakeCheckout();

        var result = await Controller(db, new Player(user.Id, devSupporter), checkout)
            .Checkout(new SupportCheckoutRequest("en"), TestContext.Current.CancellationToken);

        Assert.IsType<ConflictResult>(result);
        Assert.Null(checkout.LastRequest);
    }

    [Fact]
    public async Task Without_stripe_configured_the_purchase_is_unavailable()
    {
        await using var db = PerksTestSupport.NewDb();
        var user = await AddUserAsync(db);
        var controller = Controller(db, new Player(user.Id), new FakeCheckout(), new StripeOptions());

        var checkout = await controller.Checkout(new SupportCheckoutRequest("en"), TestContext.Current.CancellationToken);
        var price = await controller.Price(TestContext.Current.CancellationToken);

        Assert.Equal(StatusCodes.Status503ServiceUnavailable, Assert.IsType<StatusCodeResult>(checkout).StatusCode);
        Assert.False(price.Available);
    }

    [Fact]
    public async Task A_stripe_failure_is_a_bad_gateway_and_a_price_without_amounts()
    {
        await using var db = PerksTestSupport.NewDb();
        var user = await AddUserAsync(db);
        var controller = Controller(db, new Player(user.Id), new FakeCheckout { Fail = true });

        var checkout = await controller.Checkout(new SupportCheckoutRequest("en"), TestContext.Current.CancellationToken);
        var price = await controller.Price(TestContext.Current.CancellationToken);

        Assert.Equal(StatusCodes.Status502BadGateway, Assert.IsType<StatusCodeResult>(checkout).StatusCode);
        Assert.True(price.Available);
        Assert.Null(price.Amounts);
    }

    [Fact]
    public async Task The_price_lists_every_currency()
    {
        await using var db = PerksTestSupport.NewDb();

        var price = await Controller(db, new Player(null), new FakeCheckout()).Price(TestContext.Current.CancellationToken);

        Assert.True(price.Available);
        Assert.Equal("usd", price.DefaultCurrency);
        Assert.Equal(990, price.Amounts?["brl"]);
    }
}
