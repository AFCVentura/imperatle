using System.Text;
using Imperatle.Api.Payments;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Imperatle.Api.Controllers;

// Paddle calls this server to server (no browser, so no CORS involved) after a
// purchase or a refund. No rate limit policy: Paddle retries on failure, and a
// request without a valid signature is turned away before the database.
[ApiController]
[Route("webhooks/paddle")]
public class PaddleWebhookController(
    PaddleWebhookProcessor processor,
    IOptions<PaddleOptions> options,
    TimeProvider clock,
    ILogger<PaddleWebhookController> logger) : ControllerBase
{
    // Paddle events are a few KB; anything far bigger isn't from Paddle.
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
        var check = PaddleSignature.Verify(
            Request.Headers[PaddleSignature.HeaderName],
            rawBody,
            settings.WebhookSecret,
            clock.GetUtcNow(),
            TimeSpan.FromSeconds(settings.WebhookToleranceSeconds));
        if (check != PaddleSignature.Result.Valid)
        {
            logger.LogWarning("Paddle webhook rejected: signature {Result}", check);
            return Unauthorized();
        }

        var outcome = await processor.ProcessAsync(Encoding.UTF8.GetString(rawBody), ct);
        return outcome == PaddleWebhookOutcome.Invalid ? BadRequest() : Ok();
    }
}
