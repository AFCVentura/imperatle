namespace Imperatle.Api.Models;

// A guessed empire's area/duration compared against the correct answer's.
// Ascending order (Smaller < Approximate < Bigger) so the numeric value the
// API sends is meaningful if ever needed, not just an opaque label.
public enum ComparisonResult
{
    Smaller,
    Approximate,
    Bigger,
}
