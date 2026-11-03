using Imperatle.Api.Dtos;
using Imperatle.Api.Game;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using static Imperatle.Api.Tests.PerksTestSupport;

namespace Imperatle.Api.Tests;

// The retry loop around a guess (GuessConcurrency). The real race, against
// Postgres, is in GuessConcurrencyPostgresTests.
public class GuessConcurrencyTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static Func<Task<IActionResult>> FailingTimes(int failures, Func<Exception> error, Action onCall) => () =>
    {
        onCall();
        return failures-- > 0
            ? Task.FromException<IActionResult>(error())
            : Task.FromResult<IActionResult>(new OkResult());
    };

    [Fact]
    public async Task A_stale_save_is_played_again_from_a_fresh_read()
    {
        await using var db = NewDb();
        var calls = 0;

        var result = await GuessConcurrency.RunAsync(db, FailingTimes(2, () => new DbUpdateConcurrencyException("stale"), () => calls++), Ct);

        Assert.IsType<OkResult>(result);
        Assert.Equal(3, calls);
    }

    [Fact]
    public async Task It_gives_up_with_409_instead_of_a_500()
    {
        await using var db = NewDb();
        var calls = 0;

        var result = await GuessConcurrency.RunAsync(db, FailingTimes(100, () => new DbUpdateConcurrencyException("stale"), () => calls++), Ct);

        var conflict = Assert.IsType<ConflictObjectResult>(result);
        Assert.Equal(GuessConcurrency.ConflictCode, Assert.IsType<ErrorResponse>(conflict.Value).Code);
        Assert.Equal(GuessConcurrency.MaxTries, calls);
    }

    [Fact]
    public async Task Other_database_errors_are_not_retried()
    {
        await using var db = NewDb();
        var calls = 0;

        await Assert.ThrowsAsync<DbUpdateException>(() =>
            GuessConcurrency.RunAsync(db, FailingTimes(1, () => new DbUpdateException("other"), () => calls++), Ct));
        Assert.Equal(1, calls);
    }
}
