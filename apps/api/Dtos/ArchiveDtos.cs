using System.Text.Json.Serialization;

namespace Imperatle.Api.Dtos;

[JsonConverter(typeof(JsonStringEnumConverter<ArchiveStatus>))]
public enum ArchiveStatus
{
    NotPlayed,
    InProgress,
    Won,
    Lost,
}

// Newest first. No empire names: an unplayed day must stay a surprise.
public record ArchiveListResponse(DateOnly Today, int AttemptsAllowed, List<ArchiveDay> Days);

public record ArchiveDay(DateOnly Date, int ChallengeNumber, ArchiveStatus Status, int AttemptsUsed);

// One past day, with the player's server-side progress on it: the clues
// unlocked so far mid-round, the full answer only once it's over, and the
// guesses made so far (to rebuild the board on another device).
public record ArchiveChallengeResponse(
    DateOnly Date,
    int ChallengeNumber,
    int AttemptsAllowed,
    bool HasMap,
    int AttemptsUsed,
    bool Completed,
    bool Correct,
    ChallengeReveal? Reveal,
    EmpireAnswer? Answer,
    List<PlayedGuess> Guesses);
