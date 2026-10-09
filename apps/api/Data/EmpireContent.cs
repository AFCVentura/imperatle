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
    LocalizedText? ReligionNotes = null,
    MapInfo? Map = null,
    [property: JsonPropertyName("$schema")] string? Schema = null)
{
    // The empire's shape (GeoJSON MultiPolygon, coordinates only), read from
    // Content/shapes/<slug>.json by the loader. Not part of the empire file.
    [JsonIgnore]
    public string? MapShape { get; init; }
}

public record LocalizedText(string En, string Pt);

// Negative = BCE as historians write it (-27 is 27 BCE); there is no year 0.
public record YearValue(int Year, YearPrecision Precision);

public record AreaValue(int Km2, AreaPrecision Precision);

// Where the shape comes from: one or more Cliopatria polities at a given
// year, merged (e.g. an empire plus a dominion the dataset lists apart).
// scripts/maps/build-shapes.mjs turns them into Content/shapes/<slug>.json.
public record MapInfo(List<MapPart> Parts);

public record MapPart(string Polity, int Year);
