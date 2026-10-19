namespace Imperatle.Api.Models;

public class EmpireHint
{
    public int Id { get; set; }
    public int EmpireId { get; set; }
    public Empire Empire { get; set; } = null!;

    // Reveal order within the empire's hint sequence (0-based).
    public int Order { get; set; }

    public string TextEn { get; set; } = string.Empty;
    public string TextPt { get; set; } = string.Empty;

    // Longer explanation of the clue, shown only once the round is over (it
    // may name what the clue hides). Empty string = none.
    public string DetailsEn { get; set; } = string.Empty;
    public string DetailsPt { get; set; } = string.Empty;
}
