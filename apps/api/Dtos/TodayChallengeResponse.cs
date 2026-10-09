namespace Imperatle.Api.Dtos;

// HasMap: whether GET /challenges/{date}/map has a shape to draw.
public record TodayChallengeResponse(DateOnly Date, int AttemptsAllowed, int ChallengeNumber, bool HasMap);
