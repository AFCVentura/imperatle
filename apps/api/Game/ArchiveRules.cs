using Imperatle.Api.Dtos;
using Imperatle.Api.Models;

namespace Imperatle.Api.Game;

// Past games: every scheduled day strictly before today. Today belongs to
// the daily game (with its stats and streak), and a future date must never
// be reachable, or its empire would leak ahead of time.
public static class ArchiveRules
{
    public static bool IsPlayable(DateOnly date, DateOnly today) => date < today;

    public static ArchiveStatus StatusOf(PlayerChallengeProgress? progress) => progress switch
    {
        null => ArchiveStatus.NotPlayed,
        { Completed: true, Correct: true } => ArchiveStatus.Won,
        { Completed: true } => ArchiveStatus.Lost,
        { AttemptsUsed: > 0 } => ArchiveStatus.InProgress,
        _ => ArchiveStatus.NotPlayed,
    };

    // A player can have more than one row for a date once accounts link
    // browsers together (one per anonymous id); the account's row wins, then
    // the one furthest along.
    public static PlayerChallengeProgress? Preferred(IEnumerable<PlayerChallengeProgress> rows) => rows
        .OrderByDescending(r => r.UserId is not null)
        .ThenByDescending(r => r.Completed)
        .ThenByDescending(r => r.AttemptsUsed)
        .FirstOrDefault();
}
