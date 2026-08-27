using Imperatle.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Imperatle.Api.Data;

// Development-only test data -- NOT the real 20-30 curated empires for the
// actual game. Just enough to exercise the full guess/reveal flow end to end.
public static class DevSeeder
{
    public static async Task SeedAsync(ImperatleDbContext db)
    {
        if (!await db.Empires.AnyAsync())
        {
            db.Empires.AddRange(BuildTestEmpires());
            await db.SaveChangesAsync();
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var hasTodayChallenge = await db.DailyChallenges.AnyAsync(c => c.Date == today);
        if (!hasTodayChallenge)
        {
            var empires = await db.Empires.OrderBy(e => e.Id).ToListAsync();
            var pick = empires[today.DayNumber % empires.Count];
            db.DailyChallenges.Add(new DailyChallenge { Date = today, EmpireId = pick.Id });
            await db.SaveChangesAsync();
        }
    }

    private static List<Empire> BuildTestEmpires() =>
    [
        new Empire
        {
            Slug = "roman-empire",
            NameEn = "Roman Empire",
            NamePt = "Império Romano",
            ReferenceYear = 117,
            ReferenceYearPrecision = YearPrecision.Exact,
            MapBorderConfidence = BorderConfidence.Precise,
            Continents = [Continent.Europe, Continent.Africa, Continent.Asia],
            PrimaryContinent = Continent.Europe,
            SubEraEn = "Pax Romana",
            SubEraPt = "Pax Romana",
            CapitalEn = "Rome",
            CapitalPt = "Roma",
            LanguageEn = "Latin",
            LanguagePt = "Latim",
            ReligionEn = "Roman polytheism (later Christianity)",
            ReligionPt = "Politeísmo romano (depois cristianismo)",
            StartYear = -27,
            StartYearPrecision = YearPrecision.Exact,
            EndYear = 476,
            EndYearPrecision = YearPrecision.Exact,
            Hints =
            [
                new EmpireHint { Order = 0, TextEn = "Its road network connected the empire's farthest provinces.", TextPt = "Sua rede de estradas conectava as províncias mais distantes do império." },
                new EmpireHint { Order = 1, TextEn = "Its legal code influenced most of Western law for centuries.", TextPt = "Seu código legal influenciou a maior parte do direito ocidental por séculos." },
                new EmpireHint { Order = 2, TextEn = "Its capital gave its name to numerals still used today.", TextPt = "Sua capital deu nome a numerais ainda usados hoje." },
            ],
        },
        new Empire
        {
            Slug = "mongol-empire",
            NameEn = "Mongol Empire",
            NamePt = "Império Mongol",
            ReferenceYear = 1279,
            ReferenceYearPrecision = YearPrecision.Exact,
            MapBorderConfidence = BorderConfidence.Approximate,
            Continents = [Continent.Asia, Continent.Europe],
            PrimaryContinent = Continent.Asia,
            SubEraEn = "Pax Mongolica",
            SubEraPt = "Pax Mongólica",
            CapitalEn = "Karakorum",
            CapitalPt = "Karakorum",
            LanguageEn = "Mongolian",
            LanguagePt = "Mongol",
            ReligionEn = "Tengrism (religiously tolerant)",
            ReligionPt = "Tengrismo (tolerante religiosamente)",
            StartYear = 1206,
            StartYearPrecision = YearPrecision.Exact,
            EndYear = 1368,
            EndYearPrecision = YearPrecision.Approximate,
            Hints =
            [
                new EmpireHint { Order = 0, TextEn = "It was founded by a leader who united nomadic tribes under one banner.", TextPt = "Foi fundado por um líder que uniu tribos nômades sob uma só bandeira." },
                new EmpireHint { Order = 1, TextEn = "It became the largest contiguous land empire in history.", TextPt = "Tornou-se o maior império contíguo da história." },
                new EmpireHint { Order = 2, TextEn = "Its founder is known in the West primarily by a single name: Genghis.", TextPt = "Seu fundador é conhecido no Ocidente principalmente por um único nome: Gengis." },
            ],
        },
        new Empire
        {
            Slug = "ottoman-empire",
            NameEn = "Ottoman Empire",
            NamePt = "Império Otomano",
            ReferenceYear = 1683,
            ReferenceYearPrecision = YearPrecision.Exact,
            MapBorderConfidence = BorderConfidence.Precise,
            Continents = [Continent.Europe, Continent.Asia, Continent.Africa],
            PrimaryContinent = Continent.Asia,
            SubEraEn = "Classical Age",
            SubEraPt = "Era Clássica",
            CapitalEn = "Constantinople",
            CapitalPt = "Constantinopla",
            LanguageEn = "Ottoman Turkish",
            LanguagePt = "Turco Otomano",
            ReligionEn = "Sunni Islam",
            ReligionPt = "Islamismo sunita",
            StartYear = 1299,
            StartYearPrecision = YearPrecision.Approximate,
            EndYear = 1922,
            EndYearPrecision = YearPrecision.Exact,
            Hints =
            [
                new EmpireHint { Order = 0, TextEn = "It bridged two continents at its capital, which straddles a strait.", TextPt = "Fazia a ponte entre dois continentes em sua capital, situada num estreito." },
                new EmpireHint { Order = 1, TextEn = "It ended the millennium-long history of an earlier empire when it took that empire's capital.", TextPt = "Encerrou a história milenar de um império anterior ao tomar sua capital." },
                new EmpireHint { Order = 2, TextEn = "Its rule lasted over six centuries, ending in the early 20th century.", TextPt = "Seu domínio durou mais de seis séculos, terminando no início do século XX." },
            ],
        },
    ];
}
