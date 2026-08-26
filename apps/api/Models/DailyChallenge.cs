namespace Imperatle.Api.Models;

public class DailyChallenge
{
    public int Id { get; set; }
    public DateOnly Date { get; set; }

    public int EmpireId { get; set; }
    public Empire Empire { get; set; } = null!;
}
