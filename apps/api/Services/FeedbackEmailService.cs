using System.Net.Http.Headers;
using Imperatle.Api.Models;

namespace Imperatle.Api.Services;

// Notifies the site owner of new feedback through Resend's HTTP API (same
// approach as the Ghibli Fan Tribute contact form). The recipient is always
// the owner ("Feedback:NotifyEmail"); the player's e-mail only goes in
// Reply-To, so the form can't be used to e-mail third parties. Without
// "Resend:ApiKey" in Development, the message is only logged.
public class FeedbackEmailService(
    HttpClient httpClient,
    IConfiguration configuration,
    IHostEnvironment environment,
    ILogger<FeedbackEmailService> logger)
{
    public async Task NotifyAsync(Feedback feedback)
    {
        var apiKey = configuration["Resend:ApiKey"];
        var from = configuration["Resend:From"];
        var to = configuration["Feedback:NotifyEmail"];

        var subject = $"[Imperatle] Feedback: {feedback.Category}";
        var body = $"""
            Categoria: {feedback.Category}
            E-mail: {feedback.Email ?? "(não informado)"}
            Idioma: {feedback.Locale ?? "?"}
            Recebido em: {feedback.CreatedAtUtc:yyyy-MM-dd HH:mm} UTC

            {feedback.Message}
            """;

        if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(from) || string.IsNullOrWhiteSpace(to))
        {
            if (environment.IsDevelopment())
            {
                logger.LogInformation("Resend not configured, feedback e-mail only logged:\n{Subject}\n{Body}", subject, body);
            }
            else
            {
                logger.LogError("Resend:ApiKey, Resend:From or Feedback:NotifyEmail missing; feedback {Id} saved without notification.", feedback.Id);
            }
            return;
        }

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, "emails")
            {
                // Plain text only: nothing the player typed becomes HTML.
                Content = JsonContent.Create(new
                {
                    from,
                    to = new[] { to },
                    reply_to = feedback.Email,
                    subject,
                    text = body,
                }),
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

            using var response = await httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                logger.LogError("Resend rejected the feedback e-mail ({Status}): {Body}",
                    (int)response.StatusCode, await response.Content.ReadAsStringAsync());
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send the feedback e-mail through Resend.");
        }
    }
}
