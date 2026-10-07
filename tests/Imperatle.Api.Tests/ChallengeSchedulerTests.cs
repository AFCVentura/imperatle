using Imperatle.Api.Game;

namespace Imperatle.Api.Tests;

public class ChallengeSchedulerTests
{
    // Runs the scheduler for `days` days and returns the picks in order.
    private static List<int> Simulate(IReadOnlyCollection<int> active, int days, int seed = 42)
    {
        var random = new Random(seed);
        var picks = new List<int>();
        for (var day = 0; day < days; day++)
        {
            picks.Add(ChallengeScheduler.PickNext(active, picks, random));
        }
        return picks;
    }

    [Fact]
    public void Every_empire_appears_once_per_cycle()
    {
        int[] active = [1, 2, 3, 4, 5, 6, 7, 8];
        var picks = Simulate(active, active.Length * 5);

        foreach (var cycle in picks.Chunk(active.Length))
        {
            Assert.Equal(active.Order(), cycle.Order());
        }
    }

    [Fact]
    public void A_new_cycle_does_not_start_with_the_last_empires_of_the_previous_one()
    {
        int[] active = [1, 2, 3, 4, 5, 6, 7, 8];

        for (var seed = 0; seed < 50; seed++)
        {
            var picks = Simulate(active, active.Length * 3, seed);
            for (var start = active.Length; start < picks.Count; start += active.Length)
            {
                var endOfPrevious = picks.Skip(start - ChallengeScheduler.CycleBoundaryGap).Take(ChallengeScheduler.CycleBoundaryGap);
                Assert.DoesNotContain(picks[start], endOfPrevious);
            }
        }
    }

    [Fact]
    public void Order_changes_between_cycles()
    {
        int[] active = [1, 2, 3, 4, 5, 6, 7, 8];
        var picks = Simulate(active, active.Length * 4);
        var cycles = picks.Chunk(active.Length).Select(c => string.Join(",", c)).ToList();

        Assert.True(cycles.Distinct().Count() > 1);
    }

    [Fact]
    public void An_empire_added_mid_cycle_joins_the_current_cycle()
    {
        // 1, 2 and 3 were already used; 4 is new.
        var pick = ChallengeScheduler.PickNext([1, 2, 3, 4], [1, 2, 3], new Random(1));
        Assert.Equal(4, pick);
    }

    [Fact]
    public void A_single_empire_repeats_every_day()
    {
        Assert.Equal([7, 7, 7], Simulate([7], 3));
    }

    [Fact]
    public void No_active_empires_is_an_error()
    {
        Assert.Throws<InvalidOperationException>(() => ChallengeScheduler.PickNext([], [], new Random(1)));
    }
}
