using System.Text.Json.Serialization;
using Imperatle.Api.Models;

namespace Imperatle.Api.Data;

// Shape of one Content/empires/<slug>.json file (see Content/empire.schema.json,
// which mirrors these records for editor autocomplete). The JSON files are the
// source of truth for the game's empires; EmpireContentImporter copies them
// into the database on startup.
// Optional fields come last, with defaults (required ones are enforced).
public record EmpireContent(
    string Slug,
    LocalizedText Name,
    YearValue Peak,
    YearValue Start,
    YearValue End,
    AreaValue Area,
    BorderConfidence MapAccuracy,
    List<Continent> Continents,
    Continent PrimaryContinent,
    LocalizedText Capital,
    LocalizedText Language,
    LocalizedText Religion,
    List<LocalizedText> Curiosities,
    LocalizedText? DurationNotes = null,
    MapInfo? Map = null,
    [property: JsonPropertyName("$schema")] string? Schema = null);

public record LocalizedText(string En, string Pt);

// Negative = BCE as historians write it (-27 is 27 BCE); there is no year 0.
public record YearValue(int Year, YearPrecision Precision);

public record AreaValue(int Km2, AreaPrecision Precision);

// File name inside the web app's public/maps folder, plus attribution.
public record MapInfo(string File, string? SourceUrl = null, string? Author = null, string? License = null);
