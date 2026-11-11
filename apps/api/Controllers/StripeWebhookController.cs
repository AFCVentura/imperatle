using System.Text;
using Imperatle.Api.Payments;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Imperatle.Api.Controllers;

// Stripe calls this server to server (no browser, so no CORS involved) after a
// purchase, a refund or a dispute. No rate limit policy: Stripe retries on
// failure, and a request without a valid signature is turned away before the
// database.
[ApiController]
[Route("webhooks/stripe")]
public class StripeWebhookController(
    StripeWebhookProcessor processor,
    IOptions<StripeOptions> options,
    TimeProvider clock,
    ILogger<StripeWebhookController> logger) : ControllerBase
{
    // Stripe events are a few KB; anything far bigger isn't from Stripe.
    private const int MaxBodyBytes = 256 * 1024;

    [HttpPost]
    [RequestSizeLimit(MaxBodyBytes)]
    public async Task<IActionResult> Receive(CancellationToken ct)
    {
        // The signature covers the exact bytes sent, so they are read as they
        // came, before any JSON parsing (no [FromBody] model binding here).
        using var buffer = new MemoryStream();
        await Request.Body.CopyToAsync(buffer, ct);
        var rawBody = buffer.ToArray();

        var settings = options.Value;
        var check = StripeSignature.Verify(
            Request.Headers[StripeSignature.HeaderName],
            rawBody,
            settings.WebhookSecret,
            clock.GetUtcNow(),
            TimeSpan.FromSeconds(settings.WebhookToleranceSeconds));
        if (check != StripeSignature.Result.Valid)
        {
            logger.LogWarning("Stripe webhook rejected: signature {Result}", check);
            return Unauthorized();
        }

        var outcome = await processor.ProcessAsync(Encoding.UTF8.GetString(rawBody), ct);
        return outcome == StripeWebhookOutcome.Invalid ? BadRequest() : Ok();
    }
}
