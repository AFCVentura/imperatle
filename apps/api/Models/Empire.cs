namespace Imperatle.Api.Models;

public class Empire
{
    public int Id { get; set; }

    // Stable identifier used to locate this empire's map SVG in the
    // frontend's public/maps/{Slug}.svg -- the map file itself is not stored here.
    public string Slug { get; set; } = string.Empty;

    public string NameEn { get; set; } = string.Empty;
    public string NamePt { get; set; } = string.Empty;

    // Astronomical year numbering (negative = BCE), representing the
    // "greatest territorial extent" reference point already decided for the game.
    public int ReferenceYear { get; set; }
    public YearPrecision YearPrecision { get; set; }

    public List<EmpireHint> Hints { get; set; } = [];
}
