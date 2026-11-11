using Imperatle.Api.Models;

namespace Imperatle.Api.Dtos;

// HasMap: whether GET /challenges/{date}/map has a shape to draw.
// MapBorderConfidence: how exact the map's borders are, shown on the map
// from the start (a caveat about the map, not a clue).
public record TodayChallengeResponse(DateOnly Date, int AttemptsAllowed, int ChallengeNumber, bool HasMap, BorderConfidence? MapBorderConfidence = null);
