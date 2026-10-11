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
    // null = the empire still exists ("end": null in the file, never left out).
    YearValue? End,
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
    LocalizedText? Wikipedia = null,
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

// Where the shape comes from, merged: Cliopatria polities at a given year
// (e.g. an empire plus a dominion the dataset lists apart) and, for land the
// dataset misses, today's territories from Natural Earth by their 3-letter
// code (e.g. "PYF", French Polynesia, for a colonial empire). The empire
// generator and scripts/maps/build-shapes.mjs build Content/shapes/<slug>.json.
public record MapInfo(List<MapPart> Parts);

// Either Polity + Year, Country, or Draw + Ring. A country can be cut down to
// a box [west, south, east, north] in degrees, for one region of it (e.g. the
// tip of Chukotka a dataset border leaves out). A drawn part is an area traced
// by hand in the empire generator, a ring of [longitude, latitude] points,
// added to the shape ("add") or cut out of it ("remove").
public record MapPart(
    string? Polity = null,
    int? Year = null,
    string? Country = null,
    List<double>? Box = null,
    string? Draw = null,
    List<List<double>>? Ring = null);
