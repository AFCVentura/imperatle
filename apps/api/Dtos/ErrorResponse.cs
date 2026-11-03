namespace Imperatle.Api.Dtos;

// The body of a refusal the web app tells apart from others with the same
// status code, e.g. 409 "daily_not_finished" on the practice endpoints.
public record ErrorResponse(string Code);
