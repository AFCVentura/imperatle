namespace Imperatle.Api.Models;

public class Empire
{
    public int Id { get; set; }

    // Stable identifier, also the content file name (Content/empires/{Slug}.json).
    public string Slug { get; set; } = string.Empty;

    // False when the empire's content file was removed: it leaves the guess
    // list and the schedule, but stays in the database because past
    // challenges and player history point to it.
    public bool Active { get; set; } = true;

    // Map image inside the web app's public/maps folder (null = not ready yet,
    // the UI shows a placeholder), plus its attribution.
    public string? MapFile { get; set; }
    public string? MapSourceUrl { get; set; }
    public string? MapAuthor { get; set; }
    public string? MapLicense { get; set; }

    public string NameEn { get; set; } = string.Empty;
    public string NamePt { get; set; } = string.Empty;

    // Years are negative for BCE as historians write them (-27 = 27 BCE, no
    // year 0). This one is the "greatest territorial extent" point the map shows.
    public int ReferenceYear { get; set; }
    public YearPrecision ReferenceYearPrecision { get; set; }
    public BorderConfidence MapBorderConfidence { get; set; }

    public List<Continent> Continents { get; set; } = [];
    public Continent PrimaryContinent { get; set; }

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

    // Free-text caveat shown next to the duration in the UI, e.g. clarifying
    // that a range covers only one phase of a longer-named political entity
    // (the Roman Empire proper, not the Kingdom/Republic/Byzantine phases).
    // Empty string = no caveat needed for this empire.
    public string DurationNotesEn { get; set; } = string.Empty;
    public string DurationNotesPt { get; set; } = string.Empty;

    // Free-text caveat shown next to the religion in the UI, e.g. noting that
    // most subjects followed other faiths. Empty string = no caveat needed.
    public string ReligionNotesEn { get; set; } = string.Empty;
    public string ReligionNotesPt { get; set; } = string.Empty;

    // Territory at peak extent (same reference point as ReferenceYear), in km².
    public int PeakAreaKm2 { get; set; }
    public AreaPrecision AreaPrecision { get; set; }

    // Max 3, revealed in Order (0 = least obvious, 2 = most obvious).
    public List<EmpireHint> Hints { get; set; } = [];
}
