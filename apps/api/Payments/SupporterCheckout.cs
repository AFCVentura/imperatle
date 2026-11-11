using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Stripe;
using Stripe.Checkout;

namespace Imperatle.Api.Payments;

// The Supporter price in every currency it's sold in, in minor units
// ({ "usd": 499, "brl": 990, "eur": 499 }), plus the default one.
public record SupporterPrice(string DefaultCurrency, IReadOnlyDictionary<string, long> Amounts);

public record SupporterCheckoutRequest(Guid UserId, string Email, string Locale, string SuccessUrl, string CancelUrl);

// What the API asks of Stripe for the purchase; an interface so the
// controller can be tested without the network.
public interface ISupporterCheckout
{
    Task<SupporterPrice?> GetPriceAsync(CancellationToken ct = default);

    // Creates a hosted Checkout session and returns the URL to send the buyer to.
    Task<string> CreateSessionAsync(SupporterCheckoutRequest request, CancellationToken ct = default);
}

public class StripeSupporterCheckout(IOptions<StripeOptions> options, IMemoryCache cache) : ISupporterCheckout
{
    private const string PriceCacheKey = "stripe:supporter-price";

    private StripeClient Client() => new(options.Value.SecretKey);

    public async Task<SupporterPrice?> GetPriceAsync(CancellationToken ct = default)
    {
        if (cache.TryGetValue(PriceCacheKey, out SupporterPrice? cached))
        {
            return cached;
        }

        var price = await new PriceService(Client()).GetAsync(
            options.Value.SupporterPriceId,
            new PriceGetOptions { Expand = ["currency_options"] },
            cancellationToken: ct);

        var amounts = new Dictionary<string, long>();
        if (price.UnitAmount is long main)
        {
            amounts[price.Currency] = main;
        }
        foreach (var (currency, option) in price.CurrencyOptions ?? [])
        {
            if (option.UnitAmount is long amount)
            {
                amounts[currency] = amount;
            }
        }

        var result = amounts.Count == 0 ? null : new SupporterPrice(price.Currency, amounts);
        // Prices change rarely and by hand; an hour keeps Stripe out of every dialog open.
        cache.Set(PriceCacheKey, result, TimeSpan.FromHours(1));
        return result;
    }

    public async Task<string> CreateSessionAsync(SupporterCheckoutRequest request, CancellationToken ct = default)
    {
        var metadata = new Dictionary<string, string>
        {
            ["product"] = StripeWebhookProcessor.SupporterProduct,
            ["userId"] = request.UserId.ToString(),
        };

        var session = await new SessionService(Client()).CreateAsync(new SessionCreateOptions
        {
            Mode = "payment",
            LineItems = [new SessionLineItemOptions { Price = options.Value.SupporterPriceId, Quantity = 1 }],
            // The webhook grants Supporter to this user; the e-mail only fills the form.
            ClientReferenceId = request.UserId.ToString(),
            CustomerEmail = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email,
            Locale = request.Locale == "pt" ? "pt-BR" : "en",
            SuccessUrl = request.SuccessUrl,
            CancelUrl = request.CancelUrl,
            Metadata = metadata,
            PaymentIntentData = new SessionPaymentIntentDataOptions
            {
                Description = "Imperatle Supporter",
                Metadata = metadata,
            },
        }, cancellationToken: ct);

        return session.Url;
    }
}
