using Imperatle.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Imperatle.Api.Data;

// Copies the validated content files into the database: inserts new empires,
// updates existing ones by slug, and deactivates empires whose file is gone
// (they can't be deleted, past challenges and player history point to them).
// Idempotent, so it runs on every startup.
public static class EmpireContentImporter
{
    public static async Task<(int Added, int Updated, int Deactivated)> SyncAsync(
        ImperatleDbContext db, IReadOnlyList<EmpireContent> contents)
    {
        var existing = await db.Empires.Include(e => e.Hints).ToDictionaryAsync(e => e.Slug);
        int added = 0, updated = 0, deactivated = 0;

        foreach (var content in contents)
        {
            if (!existing.Remove(content.Slug, out var empire))
            {
                empire = new Empire { Slug = content.Slug };
                db.Empires.Add(empire);
                added++;
            }
            else
            {
                updated++;
            }

            Apply(content, empire);
        }

        // Whatever is left in the dictionary has no content file anymore.
        foreach (var orphan in existing.Values.Where(e => e.Active))
        {
            orphan.Active = false;
            deactivated++;
        }

        await db.SaveChangesAsync();
        return (added, updated, deactivated);
    }

    private static void Apply(EmpireContent c, Empire e)
    {
        e.Active = true;
        e.NameEn = c.Name.En;
        e.NamePt = c.Name.Pt;
        e.ReferenceYear = c.Peak.Year;
        e.ReferenceYearPrecision = c.Peak.Precision;
        e.StartYear = c.Start.Year;
        e.StartYearPrecision = c.Start.Precision;
        e.EndYear = c.End.Year;
        e.EndYearPrecision = c.End.Precision;
        e.DurationNotesEn = c.DurationNotes?.En ?? string.Empty;
        e.DurationNotesPt = c.DurationNotes?.Pt ?? string.Empty;
        e.PeakAreaKm2 = c.Area.Km2;
        e.AreaPrecision = c.Area.Precision;
        e.MapBorderConfidence = c.MapAccuracy;
        e.Continents = [.. c.Continents];
        e.PrimaryContinent = c.PrimaryContinent;
        e.CapitalEn = c.Capital.En;
        e.CapitalPt = c.Capital.Pt;
        e.LanguageEn = c.Language.En;
        e.LanguagePt = c.Language.Pt;
        e.ReligionEn = c.Religion.En;
        e.ReligionPt = c.Religion.Pt;
        e.MapFile = c.Map?.File;
        e.MapSourceUrl = c.Map?.SourceUrl;
        e.MapAuthor = c.Map?.Author;
        e.MapLicense = c.Map?.License;

        // Hints are matched by position, so re-importing updates their text
        // in place instead of recreating rows.
        for (var order = 0; order < c.Curiosities.Count; order++)
        {
            var hint = e.Hints.FirstOrDefault(h => h.Order == order);
            if (hint is null)
            {
                hint = new EmpireHint { Order = order };
                e.Hints.Add(hint);
            }
            hint.TextEn = c.Curiosities[order].En;
            hint.TextPt = c.Curiosities[order].Pt;
        }
        e.Hints.RemoveAll(h => h.Order >= c.Curiosities.Count);
    }
}
