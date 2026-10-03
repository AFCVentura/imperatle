namespace Imperatle.Api.Models;

// How precisely PeakAreaKm2 is known. Mirrors YearPrecision's reasoning but
// without a "Century" tier -- that concept doesn't apply to an area figure.
public enum AreaPrecision
{
    Exact,
    Approximate,
}
