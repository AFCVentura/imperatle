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
    public YearPrecision ReferenceYearPrecision { get; set; }
    public BorderConfidence MapBorderConfidence { get; set; }

    public List<Continent> Continents { get; set; } = [];
    public Continent PrimaryContinent { get; set; }

    public string SubEraEn { get; set; } = string.Empty;
    public string SubEraPt { get; set; } = string.Empty;

    public string CapitalEn { get; set; } = string.Empty;
    public string CapitalPt { get; set; } = string.Empty;

    public string LanguageEn { get; set; } = string.Empty;
    public string LanguagePt { get; set; } = string.Empty;

    public string ReligionEn { get; set; } = string.Empty;
    public string ReligionPt { get; set; } = string.Empty;

    // Empire's lifespan, distinct from ReferenceYear (its peak).
    public int StartYear { get; set; }
    public YearPrecision StartYearPrecision { get; set; }
    public int EndYear { get; set; }
    public YearPrecision EndYearPrecision { get; set; }

    // Max 3, revealed in Order (0 = least obvious, 2 = most obvious).
    public List<EmpireHint> Hints { get; set; } = [];
}
