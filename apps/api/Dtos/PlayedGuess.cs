namespace Imperatle.Api.Dtos;

// One guess already made in a round, rebuilt on the server from the stored
// slugs, so a second device (or a cleared browser) shows the real board.
// Comparison is null for the correct guess.
public record PlayedGuess(int EmpireId, string NameEn, string NamePt, string NameEs, bool Correct, GuessComparison? Comparison);

// The player's own progress on a day's challenge. Reveal is the clues
// unlocked so far mid-round; Answer only once the round is over.
public record ChallengeProgressResponse(
    DateOnly Date,
    int AttemptsUsed,
    bool Completed,
    bool Correct,
    List<PlayedGuess> Guesses,
    ChallengeReveal? Reveal,
    EmpireAnswer? Answer);
