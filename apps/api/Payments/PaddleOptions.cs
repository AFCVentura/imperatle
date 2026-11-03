namespace Imperatle.Api.Payments;

// "Paddle" configuration section (Paddle__WebhookSecret etc. in the environment).
public class PaddleOptions
{
    public const string SectionName = "Paddle";

    // "sandbox" or "production". Only informative on the API side (the
    // webhook secret already belongs to one environment), logged at startup.
    public string Environment { get; set; } = "sandbox";

    // Secret key of the notification destination (Paddle > Developer tools >
    // Notifications). Empty = the webhook rejects every request.
    public string WebhookSecret { get; set; } = "";

    // The Supporter (lifetime) price, "pri_...". A completed transaction only
    // grants Supporter when it contains this price.
    public string SupporterPriceId { get; set; } = "";

    // How old a signed request may be. Paddle's SDKs use 5 seconds; a little
    // more absorbs clock drift, and replays inside the window are caught by
    // the processed event ids anyway.
    public int WebhookToleranceSeconds { get; set; } = 300;
}
