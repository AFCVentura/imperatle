using System.ComponentModel.DataAnnotations;
using Imperatle.Api.Models;

namespace Imperatle.Api.Dtos;

public record FeedbackRequest(
    FeedbackCategory Category,
    [Required, StringLength(2000, MinimumLength = 3)] string Message,
    [EmailAddress, StringLength(254)] string? Email,
    [StringLength(10)] string? Locale,
    // Honeypot: hidden in the form, so only bots fill it in.
    string? Website);
