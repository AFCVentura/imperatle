using Imperatle.Api.Models;

namespace Imperatle.Api.Dtos;

// Per-guess directional feedback, shown immediately regardless of hint
// stage -- similar in spirit to Wordle's per-guess letter feedback.
public record GuessComparison(ComparisonResult Area, ComparisonResult Duration);
