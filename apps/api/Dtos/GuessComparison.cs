using Imperatle.Api.Models;

namespace Imperatle.Api.Dtos;

// Per-guess feedback, shown right away under the guess, whatever the clue
// stage: how the answer compares with the guessed empire.
// - Area: bigger/smaller at the peak.
// - Era: Bigger = more recent, Smaller = older, Approximate = same era.
// - Shared (0-1), DistanceKm, BearingDegrees: where the answer is from the
//   guess (see EmpireGeometry); null when either empire has no map.
public record GuessComparison(
    ComparisonResult Area,
    ComparisonResult Era,
    double? Shared = null,
    int? DistanceKm = null,
    double? BearingDegrees = null);
