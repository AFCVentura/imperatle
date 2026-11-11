namespace Imperatle.Api.Payments;

// "Stripe" configuration section (Stripe__SecretKey etc. in the environment).
public class StripeOptions
{
    public const string SectionName = "Stripe";

    // Secret API key, "sk_test_..." or "sk_live_...". Creates the Checkout
    // sessions and reads the price. Empty = the purchase is unavailable.
    public string SecretKey { get; set; } = "";

    // Signing secret of the webhook endpoint ("whsec_...", Stripe > Developers
    // > Webhooks). Empty = the webhook rejects every request.
    public string WebhookSecret { get; set; } = "";

    // The Supporter (lifetime) price, "price_...", with one amount per
    // currency (currency_options); Checkout picks the buyer's currency.
    public string SupporterPriceId { get; set; } = "";

    // How old a signed request may be. Stripe's own libraries use 5 minutes;
    // replays inside the window are caught by the processed event ids anyway.
    public int WebhookToleranceSeconds { get; set; } = 300;

    public bool PurchaseConfigured => !string.IsNullOrWhiteSpace(SecretKey) && !string.IsNullOrWhiteSpace(SupporterPriceId);
}
