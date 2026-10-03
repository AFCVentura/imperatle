namespace Imperatle.Api.Dtos;

public record GuessResponse(bool Correct, bool GameOver, ChallengeReveal? Reveal, EmpireAnswer? Answer, GuessComparison? Comparison);
