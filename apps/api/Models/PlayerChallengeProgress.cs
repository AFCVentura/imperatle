namespace Imperatle.Api.Models;

// One row per anonymous player per day -- the server-authoritative record of
// how many attempts that browser has actually spent on today's challenge.
// UserId is set when the player is signed in; logging in re-tags this
// browser's earlier rows from AnonymousId to UserId (see
// AccountService.ClaimAnonymousProgressAsync) instead of copying data between
// two separate systems.
public class PlayerChallengeProgress
{
    public int Id { get; set; }

    public Guid AnonymousId { get; set; }
    public Guid? UserId { get; set; }

    public DateOnly Date { get; set; }

    public int EmpireId { get; set; }
    public Empire Empire { get; set; } = null!;

    public int AttemptsUsed { get; set; }
    public bool Completed { get; set; }
    public bool Correct { get; set; }
    public DateTime? CompletedAtUtc { get; set; }

    // True once a guess for this date came from the archive (a supporter
    // playing a past day). Such games keep their result for the archive but
    // stay out of the daily statistics and streaks, which only count games
    // played on their own day.
    public bool FromArchive { get; set; }
}
