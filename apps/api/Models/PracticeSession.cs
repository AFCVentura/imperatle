namespace Imperatle.Api.Models;

// One practice round: the empire to guess and the options the supporter
// picked. The empire id never leaves the server until the round ends; the
// client only holds the session id, and attempts are counted here, the same
// way PlayerChallengeProgress does for the daily game.
public class PracticeSession
{
    public Guid Id { get; set; }

    public Guid AnonymousId { get; set; }
    public Guid? UserId { get; set; }

    public int EmpireId { get; set; }
    public Empire Empire { get; set; } = null!;

    public PracticeDifficulty Difficulty { get; set; }
    public BroadEra? Era { get; set; }
    public Continent? Continent { get; set; }
    public int AttemptsAllowed { get; set; }
    public bool HintsEnabled { get; set; }
    public PracticeMapMode MapMode { get; set; }

    public int AttemptsUsed { get; set; }
    public bool Completed { get; set; }
    public bool Correct { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? CompletedAtUtc { get; set; }

    // Postgres' xmin, as the concurrency token (see PlayerChallengeProgress).
    public uint Version { get; set; }
}
