using Imperatle.Api.Game;

namespace Imperatle.Api.Tests;

public class GameClockTests
{
    private static DateOnly TodayAt(string utc) => GameClock.Today(DateTime.Parse(utc, null, System.Globalization.DateTimeStyles.AdjustToUniversal | System.Globalization.DateTimeStyles.AssumeUniversal));

    [Theory]
    // Before the switch the day followed UTC (9 p.m. in Brasília).
    [InlineData("2026-10-10T23:59:00Z", "2026-10-10")]
    // The 11 October empire, out since 9 p.m. in Brasília, stays up that evening...
    [InlineData("2026-10-11T00:30:00Z", "2026-10-11")]
    [InlineData("2026-10-11T02:59:00Z", "2026-10-11")]
    // ...and all of Sunday in Brasília...
    [InlineData("2026-10-11T03:00:00Z", "2026-10-11")]
    [InlineData("2026-10-12T02:59:00Z", "2026-10-11")]
    // ...until midnight on Monday there.
    [InlineData("2026-10-12T03:00:00Z", "2026-10-12")]
    // From then on, midnight in Brasília: 9 p.m. there is still the same day.
    [InlineData("2026-11-05T00:30:00Z", "2026-11-04")]
    [InlineData("2026-11-05T03:00:00Z", "2026-11-05")]
    public void The_day_turns_at_midnight_in_Brasilia(string utc, string expected)
    {
        Assert.Equal(DateOnly.Parse(expected), TodayAt(utc));
    }
}
