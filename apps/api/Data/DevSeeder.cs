using Imperatle.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Imperatle.Api.Data;

// Development-only test data -- NOT the real 20-30 curated empires for the
// actual game. Just enough to exercise the full guess/reveal flow end to end.
public static class DevSeeder
{
    // forcedTodaySlug (Dev:ForceTodayEmpireSlug in appsettings.Development.json)
    // pins today's challenge to one empire, e.g. the one that has a mock map.
    public static async Task SeedAsync(ImperatleDbContext db, string? forcedTodaySlug = null)
    {
        if (!await db.Empires.AnyAsync())
        {
            db.Empires.AddRange(BuildTestEmpires());
            await db.SaveChangesAsync();
        }

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var todayChallenge = await db.DailyChallenges.FirstOrDefaultAsync(c => c.Date == today);
        if (todayChallenge is null)
        {
            var empires = await db.Empires.OrderBy(e => e.Id).ToListAsync();
            var pick = empires[today.DayNumber % empires.Count];
            todayChallenge = new DailyChallenge { Date = today, EmpireId = pick.Id };
            db.DailyChallenges.Add(todayChallenge);
            await db.SaveChangesAsync();
        }

        if (!string.IsNullOrWhiteSpace(forcedTodaySlug))
        {
            var forced = await db.Empires.FirstOrDefaultAsync(e => e.Slug == forcedTodaySlug);
            if (forced is not null && todayChallenge.EmpireId != forced.Id)
            {
                todayChallenge.EmpireId = forced.Id;

                // Progress recorded against the previous empire no longer matches today's answer.
                var staleProgress = await db.PlayerChallengeProgress.Where(p => p.Date == today).ToListAsync();
                db.PlayerChallengeProgress.RemoveRange(staleProgress);

                await db.SaveChangesAsync();
            }
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
            DurationNotesEn = "Covers the Roman Empire proper only -- it excludes the earlier Roman Kingdom and Roman Republic, and the Eastern Roman (Byzantine) Empire, which continued for another millennium and is tracked separately.",
            DurationNotesPt = "Cobre só o Império Romano propriamente dito -- exclui o Reino Romano e a República Romana, que vieram antes, e o Império Romano do Oriente (Bizantino), que continuou por mais um milênio e é tratado separadamente.",
            PeakAreaKm2 = 5000000,
            AreaPrecision = AreaPrecision.Approximate,
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
            PeakAreaKm2 = 24000000,
            AreaPrecision = AreaPrecision.Approximate,
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
            PeakAreaKm2 = 5200000,
            AreaPrecision = AreaPrecision.Approximate,
            Hints =
            [
                new EmpireHint { Order = 0, TextEn = "It bridged two continents at its capital, which straddles a strait.", TextPt = "Fazia a ponte entre dois continentes em sua capital, situada num estreito." },
                new EmpireHint { Order = 1, TextEn = "It ended the millennium-long history of an earlier empire when it took that empire's capital.", TextPt = "Encerrou a história milenar de um império anterior ao tomar sua capital." },
                new EmpireHint { Order = 2, TextEn = "Its rule lasted over six centuries, ending in the early 20th century.", TextPt = "Seu domínio durou mais de seis séculos, terminando no início do século XX." },
            ],
        },
        new Empire
        {
            Slug = "achaemenid-empire",
            NameEn = "Achaemenid (Persian) Empire",
            NamePt = "Império Aquemênida (Persa)",
            ReferenceYear = -500,
            ReferenceYearPrecision = YearPrecision.Approximate,
            MapBorderConfidence = BorderConfidence.Approximate,
            Continents = [Continent.Asia, Continent.Africa, Continent.Europe],
            PrimaryContinent = Continent.Asia,
            SubEraEn = "Reign of Darius the Great",
            SubEraPt = "Reinado de Dario, o Grande",
            CapitalEn = "Persepolis",
            CapitalPt = "Persépolis",
            LanguageEn = "Old Persian",
            LanguagePt = "Persa Antigo",
            ReligionEn = "Zoroastrianism",
            ReligionPt = "Zoroastrismo",
            StartYear = -550,
            StartYearPrecision = YearPrecision.Approximate,
            EndYear = -330,
            EndYearPrecision = YearPrecision.Exact,
            PeakAreaKm2 = 5500000,
            AreaPrecision = AreaPrecision.Approximate,
            Hints =
            [
                new EmpireHint { Order = 0, TextEn = "It pioneered a long royal road system to speed up messages across its vast territory.", TextPt = "Foi pioneiro num sistema de estradas reais pra acelerar mensagens por seu vasto território." },
                new EmpireHint { Order = 1, TextEn = "It was the largest empire the world had seen up to its time.", TextPt = "Foi o maior império que o mundo tinha visto até então." },
                new EmpireHint { Order = 2, TextEn = "It fell to a young Macedonian conqueror in his campaign eastward.", TextPt = "Caiu diante de um jovem conquistador macedônio em sua campanha rumo ao leste." },
            ],
        },
        new Empire
        {
            Slug = "umayyad-caliphate",
            NameEn = "Umayyad Caliphate",
            NamePt = "Califado Omíada",
            ReferenceYear = 740,
            ReferenceYearPrecision = YearPrecision.Approximate,
            MapBorderConfidence = BorderConfidence.Approximate,
            Continents = [Continent.Africa, Continent.Asia, Continent.Europe],
            PrimaryContinent = Continent.Asia,
            SubEraEn = "Peak territorial expansion",
            SubEraPt = "Auge da expansão territorial",
            CapitalEn = "Damascus",
            CapitalPt = "Damasco",
            LanguageEn = "Arabic",
            LanguagePt = "Árabe",
            ReligionEn = "Sunni Islam",
            ReligionPt = "Islamismo sunita",
            StartYear = 661,
            StartYearPrecision = YearPrecision.Exact,
            EndYear = 750,
            EndYearPrecision = YearPrecision.Exact,
            PeakAreaKm2 = 11100000,
            AreaPrecision = AreaPrecision.Approximate,
            Hints =
            [
                new EmpireHint { Order = 0, TextEn = "At its height it stretched from the Iberian Peninsula to the edge of India.", TextPt = "Em seu auge, ia da Península Ibérica até as bordas da Índia." },
                new EmpireHint { Order = 1, TextEn = "It was one of the largest contiguous land empires ever to exist.", TextPt = "Foi um dos maiores impérios contíguos que já existiram." },
                new EmpireHint { Order = 2, TextEn = "A surviving branch of its dynasty went on to rule for centuries from Córdoba.", TextPt = "Um ramo sobrevivente de sua dinastia governou por séculos a partir de Córdoba." },
            ],
        },
        new Empire
        {
            Slug = "inca-empire",
            NameEn = "Inca Empire",
            NamePt = "Império Inca",
            ReferenceYear = 1527,
            ReferenceYearPrecision = YearPrecision.Approximate,
            MapBorderConfidence = BorderConfidence.Approximate,
            Continents = [Continent.SouthAmerica],
            PrimaryContinent = Continent.SouthAmerica,
            SubEraEn = "Reign of Huayna Capac",
            SubEraPt = "Reinado de Huayna Capac",
            CapitalEn = "Cusco",
            CapitalPt = "Cusco",
            LanguageEn = "Quechua",
            LanguagePt = "Quéchua",
            ReligionEn = "Inca religion (worship of Inti, the sun god)",
            ReligionPt = "Religião inca (culto a Inti, o deus-sol)",
            StartYear = 1438,
            StartYearPrecision = YearPrecision.Approximate,
            EndYear = 1572,
            EndYearPrecision = YearPrecision.Exact,
            PeakAreaKm2 = 2000000,
            AreaPrecision = AreaPrecision.Approximate,
            Hints =
            [
                new EmpireHint { Order = 0, TextEn = "It ran an extensive road network through some of the world's most rugged mountain terrain.", TextPt = "Mantinha uma extensa rede de estradas por um dos terrenos montanhosos mais acidentados do mundo." },
                new EmpireHint { Order = 1, TextEn = "It had no written script of the kind used elsewhere, relying instead on knotted-cord records.", TextPt = "Não tinha um sistema de escrita nos moldes usuais, usando em vez disso registros de cordas com nós." },
                new EmpireHint { Order = 2, TextEn = "A small band of Spanish conquistadors led by Francisco Pizarro brought it down.", TextPt = "Um pequeno grupo de conquistadores espanhóis liderado por Francisco Pizarro o derrubou." },
            ],
        },
        new Empire
        {
            Slug = "aztec-empire",
            NameEn = "Aztec Empire",
            NamePt = "Império Asteca",
            ReferenceYear = 1519,
            ReferenceYearPrecision = YearPrecision.Approximate,
            MapBorderConfidence = BorderConfidence.Approximate,
            Continents = [Continent.NorthAmerica],
            PrimaryContinent = Continent.NorthAmerica,
            SubEraEn = "Reign of Moctezuma II",
            SubEraPt = "Reinado de Moctezuma II",
            CapitalEn = "Tenochtitlan",
            CapitalPt = "Tenochtitlan",
            LanguageEn = "Nahuatl",
            LanguagePt = "Náuatle",
            ReligionEn = "Aztec religion (worship of Huitzilopochtli and others)",
            ReligionPt = "Religião asteca (culto a Huitzilopochtli e outros)",
            StartYear = 1428,
            StartYearPrecision = YearPrecision.Exact,
            EndYear = 1521,
            EndYearPrecision = YearPrecision.Exact,
            PeakAreaKm2 = 220000,
            AreaPrecision = AreaPrecision.Approximate,
            Hints =
            [
                new EmpireHint { Order = 0, TextEn = "It was formed as a Triple Alliance between three city-states.", TextPt = "Foi formado como uma Tríplice Aliança entre três cidades-estado." },
                new EmpireHint { Order = 1, TextEn = "Its capital was built on an island in a lake, connected to shore by causeways.", TextPt = "Sua capital foi construída numa ilha em um lago, ligada à terra firme por calçadas." },
                new EmpireHint { Order = 2, TextEn = "Hernán Cortés led the campaign that brought about its fall.", TextPt = "Hernán Cortés liderou a campanha que causou sua queda." },
            ],
        },
        new Empire
        {
            Slug = "british-empire",
            NameEn = "British Empire",
            NamePt = "Império Britânico",
            ReferenceYear = 1920,
            ReferenceYearPrecision = YearPrecision.Exact,
            MapBorderConfidence = BorderConfidence.Approximate,
            Continents = [Continent.Europe, Continent.Africa, Continent.Asia, Continent.NorthAmerica, Continent.SouthAmerica, Continent.Oceania],
            PrimaryContinent = Continent.Europe,
            SubEraEn = "Interwar peak",
            SubEraPt = "Auge do entreguerras",
            CapitalEn = "London",
            CapitalPt = "Londres",
            LanguageEn = "English",
            LanguagePt = "Inglês",
            ReligionEn = "Christianity (Anglican, plus many others across its territories)",
            ReligionPt = "Cristianismo (anglicano, além de muitas outras religiões em seus territórios)",
            StartYear = 1497,
            StartYearPrecision = YearPrecision.Approximate,
            EndYear = 1997,
            EndYearPrecision = YearPrecision.Approximate,
            DurationNotesEn = "There is no single agreed start/end date for the British Empire -- this range runs from early transatlantic exploration to the handover of Hong Kong, its last major colonial territory. Formal decolonization was a decades-long, gradual process rather than a single event.",
            DurationNotesPt = "Não existe uma data única consensual de início/fim do Império Britânico -- essa faixa vai das primeiras explorações transatlânticas até a devolução de Hong Kong, seu último grande território colonial. A descolonização formal foi um processo gradual de décadas, não um evento único.",
            PeakAreaKm2 = 35500000,
            AreaPrecision = AreaPrecision.Approximate,
            Hints =
            [
                new EmpireHint { Order = 0, TextEn = "It was often said that the sun never set on it, since it always had territory in daylight.", TextPt = "Dizia-se que o sol nunca se punha sobre ele, já que sempre tinha território em plena luz do dia." },
                new EmpireHint { Order = 1, TextEn = "It was the largest empire in recorded history by territorial extent.", TextPt = "Foi o maior império da história registrada em extensão territorial." },
                new EmpireHint { Order = 2, TextEn = "Many of its former territories today form a voluntary association of independent states.", TextPt = "Muitos de seus antigos territórios hoje formam uma associação voluntária de estados independentes." },
            ],
        },
    ];
}
