using Imperatle.Api.Game;
using Imperatle.Api.Models;

namespace Imperatle.Api.Dtos;

// What the supporter picks before a practice round. Era and Continent are
// optional filters (null = any) and arrive as numbers, like the other game
// enums; Difficulty and Map as names.
public record PracticeOptions(
    PracticeDifficulty Difficulty = PracticeDifficulty.Any,
    int Attempts = GameRules.AttemptsAllowed,
    bool Hints = true,
    PracticeMapMode Map = PracticeMapMode.Progressive,
    BroadEra? Era = null,
    Continent? Continent = null);

// A round's state, without the empire until it's over. Returned when the
// round starts and when the page reloads mid-round.
public record PracticeSessionResponse(
    Guid Id,
    PracticeOptions Options,
    bool HasMap,
    int AttemptsUsed,
    bool Completed,
    bool Correct,
    ChallengeReveal? Reveal,
    EmpireAnswer? Answer);

// How many empires the options leave, so the setup screen can say so before
// starting (and refuse an empty combination).
public record PracticePoolResponse(int Count);
