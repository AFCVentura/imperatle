using Imperatle.Api.Data;
using Imperatle.Api.Dtos;
using Imperatle.Api.Models;
using Imperatle.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Imperatle.Api.Controllers;

[ApiController]
[Route("feedback")]
public class FeedbackController(ImperatleDbContext db, FeedbackEmailService email) : ControllerBase
{
    [HttpPost]
    [EnableRateLimiting("feedback")]
    public async Task<IActionResult> Send([FromBody] FeedbackRequest request)
    {
        // A bot filled in the hidden field: pretend it worked, store nothing.
        if (!string.IsNullOrEmpty(request.Website))
        {
            return NoContent();
        }

        var feedback = new Feedback
        {
            Category = request.Category,
            Message = request.Message.Trim(),
            Email = string.IsNullOrWhiteSpace(request.Email) ? null : request.Email.Trim(),
            Locale = request.Locale,
            AnonymousId = Guid.TryParse(Request.Cookies[ChallengesController.AnonymousCookieName], out var id) ? id : null,
            CreatedAtUtc = DateTime.UtcNow,
        };
        db.Feedback.Add(feedback);
        await db.SaveChangesAsync();

        await email.NotifyAsync(feedback);
        return NoContent();
    }
}
