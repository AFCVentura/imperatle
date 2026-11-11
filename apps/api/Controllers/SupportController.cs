using Imperatle.Api.Auth;
using Imperatle.Api.Data;
using Imperatle.Api.Payments;
using Imperatle.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Stripe;

namespace Imperatle.Api.Controllers;

public record SupportPriceResponse(bool Available, string? DefaultCurrency, IReadOnlyDictionary<string, long>? Amounts);

public record SupportCheckoutRequest(string? Locale);

public record SupportCheckoutResponse(string Url);

// The Supporter purchase from the web app's side: the price to show in the
// dialog, and the Stripe Checkout session the "buy" button sends the player to.
[ApiController]
[Route("support")]
public class SupportController(
    ImperatleDbContext db,
    ICurrentPlayer player,
    ISupporterCheckout checkout,
    IOptions<StripeOptions> options,
    ILogger<SupportController> logger) : ControllerBase
{
    // Available = the purchase is configured; Amounts null = Stripe didn't
    // answer, the dialog shows the purchase without the amount.
    private static readonly TimeSpan PriceTimeout = TimeSpan.FromSeconds(8);

    [HttpGet("price")]
    public async Task<SupportPriceResponse> Price(CancellationToken ct)
    {
        if (!options.Value.PurchaseConfigured)
        {
            return new SupportPriceResponse(false, null, null);
        }

        // Stripe unreachable or slow (seen locally on 12/11: the call hung for
        // over a minute and ended in a 500): the dialog still offers the
        // purchase, just without the amount. Short timeout so it doesn't wait.
        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeout.CancelAfter(PriceTimeout);
        try
        {
            var price = await checkout.GetPriceAsync(timeout.Token);
            Response.Headers.CacheControl = "public, max-age=300";
            return new SupportPriceResponse(true, price?.DefaultCurrency, price?.Amounts);
        }
        catch (Exception e) when (e is StripeException or HttpRequestException
            || (e is OperationCanceledException && !ct.IsCancellationRequested))
        {
            logger.LogWarning(e, "Could not read the Supporter price from Stripe");
            return new SupportPriceResponse(true, null, null);
        }
    }

    [HttpPost("checkout")]
    [RequireAllowedOrigin]
    [EnableRateLimiting("checkout")]
    public async Task<IActionResult> Checkout(SupportCheckoutRequest request, CancellationToken ct)
    {
        if (!options.Value.PurchaseConfigured)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable);
        }

        var user = player.UserId is Guid userId
            ? await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct)
            : null;
        if (user is null)
        {
            return Unauthorized();
        }

        // A supporter must never be charged again, whatever the page showed.
        if (user.SupporterSinceUtc is not null || await player.IsSupporterAsync(ct))
        {
            return Conflict();
        }

        // RequireAllowedOrigin already checked it's one of the web app's origins,
        // so Stripe only ever sends the buyer back to our own site.
        var origin = Request.Headers.Origin.ToString().TrimEnd('/');
        var locale = request.Locale is "pt" or "es" ? request.Locale : "en";

        try
        {
            var url = await checkout.CreateSessionAsync(new SupporterCheckoutRequest(
                user.Id,
                user.Email,
                locale,
                SuccessUrl: $"{origin}/{locale}?support=thanks",
                CancelUrl: $"{origin}/{locale}?support=1"), ct);
            return Ok(new SupportCheckoutResponse(url));
        }
        catch (Exception e) when (e is StripeException or HttpRequestException)
        {
            logger.LogError(e, "Could not create the Stripe Checkout session for user {UserId}", user.Id);
            return StatusCode(StatusCodes.Status502BadGateway);
        }
    }
}
