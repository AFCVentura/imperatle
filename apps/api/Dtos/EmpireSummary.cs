namespace Imperatle.Api.Dtos;

// One entry of the guess list. Aliases are other names the search also
// matches (spellings, other languages, "China" for a Chinese dynasty).
public record EmpireSummary(int Id, string NameEn, string NamePt, List<string> Aliases);
