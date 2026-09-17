namespace Imperatle.Api.Game;

public static class GameRules
{
    public const int AttemptsAllowed = 7;

    // Anchors the "Imperatle #N" numbering shown in the UI. Day 1 is today --
    // trivial to move earlier once a real launch date is picked.
    public static readonly DateOnly LaunchDate = new(2026, 9, 16);
}
