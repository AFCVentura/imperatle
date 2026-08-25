namespace Imperatle.Api.Models;

// How precisely ReferenceYear is known. Historical sourcing for older or less
// documented empires often only supports an approximate year or a century, not
// an exact one.
public enum YearPrecision
{
    Exact,
    Approximate,
    Century,
}
