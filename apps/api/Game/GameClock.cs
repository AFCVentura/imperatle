namespace Imperatle.Api.Game;

// The game's day turns at midnight in Brasília, where most players are, not
// at midnight UTC (9 p.m. there). Brazil dropped daylight saving time in 2019,
// so the offset is a fixed UTC-3.
public static class GameClock
{
    private static readonly TimeSpan BrasiliaOffset = TimeSpan.FromHours(-3);

    // The switch from UTC to Brasília happened the night of 10 October 2026:
    // the 11 October empire was already out since 9 p.m. there. Until the next
    // midnight in Brasília the day still follows UTC, so that empire stays up
    // instead of the 10 October one coming back, and then lasts until midnight
    // on Monday 12 October.
    private static readonly DateTime SwitchToBrasiliaUtc = new(2026, 10, 11, 3, 0, 0, DateTimeKind.Utc);

    public static DateOnly Today() => Today(DateTime.UtcNow);

    public static DateOnly Today(DateTime utcNow) =>
        DateOnly.FromDateTime(utcNow < SwitchToBrasiliaUtc ? utcNow : utcNow + BrasiliaOffset);
}
