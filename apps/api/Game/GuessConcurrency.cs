using Imperatle.Api.Dtos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Imperatle.Api.Game;

// Guesses sent at the same time for the same game. Each guess reads the
// attempt counter, adds one and saves; without a guard the saves overwrite
// each other and more guesses get an answer than the attempt limit allows.
// The rows carry Postgres' xmin as a concurrency token, so a save based on a
// stale read is refused; the first guess of a game can also race another
// one inserting the same row (unique index per player and day). Either way
// the guess is played again from a fresh read, which re-checks the limit and
// sees a finished game as finished. After a few tries it gives up with 409
// "guess_conflict" (the client can send it again) rather than a 500.
public static class GuessConcurrency
{
    public const int MaxTries = 6;
    public const string ConflictCode = "guess_conflict";

    public static async Task<IActionResult> RunAsync(DbContext db, Func<Task<IActionResult>> play, CancellationToken ct = default)
    {
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                return await play();
            }
            catch (DbUpdateException e) when (IsRace(e))
            {
                // Forget the stale rows so the next try reads them again.
                db.ChangeTracker.Clear();
                if (attempt >= MaxTries)
                {
                    return new ConflictObjectResult(new ErrorResponse(ConflictCode));
                }

                // A little jitter so the losers don't collide again in lockstep.
                await Task.Delay(Random.Shared.Next(5, 20) * attempt, ct);
            }
        }
    }

    private static bool IsRace(DbUpdateException e) =>
        e is DbUpdateConcurrencyException
        || e.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };
}
