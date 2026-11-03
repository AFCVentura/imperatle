using System.Security.Claims;
using Imperatle.Api.Auth;
using Imperatle.Api.Controllers;
using Imperatle.Api.Data;
using Imperatle.Api.Dtos;
using Imperatle.Api.Game;
using Imperatle.Api.Models;
using Imperatle.Api.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;

namespace Imperatle.Api.Tests;

// Accounts against the in-memory database: moving a browser's games into the
// account on login, /me, account deletion and the login's redirect checks.
public class AccountTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static ImperatleDbContext NewDb() => new(new DbContextOptionsBuilder<ImperatleDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString())
        .Options);

    private static readonly DateOnly Day1 = new(2026, 11, 1);
    private static readonly DateOnly Day2 = new(2026, 11, 2);
    private static readonly DateOnly Day3 = new(2026, 11, 3);

    private static PlayerChallengeProgress Row(Guid anonymousId, DateOnly date, Guid? userId = null, int attempts = 1) => new()
    {
        AnonymousId = anonymousId,
        UserId = userId,
        Date = date,
        EmpireId = 1,
        AttemptsUsed = attempts,
    };

    private static async Task<User> AddUserAsync(ImperatleDbContext db, string subject = "google-1", DateTime? supporterSince = null)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            GoogleSubject = subject,
            Email = $"{subject}@example.com",
            DisplayName = subject,
            CreatedAtUtc = DateTime.UtcNow,
            SupporterSinceUtc = supporterSince,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync(Ct);
        return user;
    }

    [Fact]
    public async Task Login_moves_the_browser_games_into_the_account_and_the_account_wins_a_shared_day()
    {
        await using var db = NewDb();
        var user = await AddUserAsync(db);
        var other = await AddUserAsync(db, "google-2");
        var browser = Guid.NewGuid();
        var otherBrowser = Guid.NewGuid();

        db.PlayerChallengeProgress.AddRange(
            Row(browser, Day1, attempts: 3),                // only on this browser: moves
            Row(browser, Day2, attempts: 5),                // the account also has Day2: dropped
            Row(otherBrowser, Day2, user.Id, attempts: 2),  // the account's Day2, from another browser
            Row(browser, Day3, other.Id),                   // someone else's account: untouched
            Row(Guid.NewGuid(), Day1));                     // another anonymous browser: untouched
        await db.SaveChangesAsync(Ct);

        Assert.Equal(2, await AccountService.ClaimAnonymousProgressAsync(db, browser, user.Id, Ct));

        var mine = await db.PlayerChallengeProgress.Where(p => p.UserId == user.Id).OrderBy(p => p.Date).ToListAsync(Ct);
        Assert.Equal([Day1, Day2], mine.Select(p => p.Date));
        Assert.Equal(3, mine[0].AttemptsUsed);
        Assert.Equal(2, mine[1].AttemptsUsed);
        Assert.Equal(otherBrowser, mine[1].AnonymousId);

        Assert.Equal(other.Id, (await db.PlayerChallengeProgress.SingleAsync(p => p.Date == Day3, Ct)).UserId);
        Assert.Equal(1, await db.PlayerChallengeProgress.CountAsync(p => p.UserId == null, Ct));
        Assert.Equal(4, await db.PlayerChallengeProgress.CountAsync(Ct));
    }

    [Fact]
    public async Task Claiming_again_changes_nothing()
    {
        await using var db = NewDb();
        var user = await AddUserAsync(db);
        var browser = Guid.NewGuid();
        db.PlayerChallengeProgress.AddRange(Row(browser, Day1), Row(browser, Day2));
        await db.SaveChangesAsync(Ct);

        Assert.Equal(2, await AccountService.ClaimAnonymousProgressAsync(db, browser, user.Id, Ct));
        var before = await db.PlayerChallengeProgress.AsNoTracking().OrderBy(p => p.Id).Select(p => new { p.Id, p.UserId }).ToListAsync(Ct);

        Assert.Equal(0, await AccountService.ClaimAnonymousProgressAsync(db, browser, user.Id, Ct));
        var after = await db.PlayerChallengeProgress.AsNoTracking().OrderBy(p => p.Id).Select(p => new { p.Id, p.UserId }).ToListAsync(Ct);

        Assert.Equal(before, after);
    }

    [Fact]
    public async Task A_second_browser_joins_the_same_account()
    {
        await using var db = NewDb();
        var first = await AccountService.UpsertGoogleUserAsync(db, "sub-1", "a@example.com", "Ana", Ct);
        var laptop = Guid.NewGuid();
        var phone = Guid.NewGuid();
        db.PlayerChallengeProgress.AddRange(Row(laptop, Day1), Row(phone, Day2));
        await db.SaveChangesAsync(Ct);
        await AccountService.ClaimAnonymousProgressAsync(db, laptop, first.Id, Ct);

        // Same Google account from the phone, with a new name on Google's side.
        var second = await AccountService.UpsertGoogleUserAsync(db, "sub-1", "a@example.com", "Ana Maria", Ct);
        await AccountService.ClaimAnonymousProgressAsync(db, phone, second.Id, Ct);

        Assert.Equal(first.Id, second.Id);
        Assert.Equal(1, await db.Users.CountAsync(Ct));
        Assert.Equal("Ana Maria", (await db.Users.SingleAsync(Ct)).DisplayName);
        Assert.Equal(2, await db.PlayerChallengeProgress.CountAsync(p => p.UserId == first.Id, Ct));
    }

    // The login cookie of account A expired on a shared browser (no logout,
    // so the anonymous id stayed) and B signs in there. A's rows keep that
    // anonymous id; B playing the same day would need a second row for it,
    // which the unique (AnonymousId, Date) index refuses with a 500.
    [Fact]
    public async Task A_browser_holding_another_account_games_is_flagged_for_a_fresh_id()
    {
        await using var db = NewDb();
        var a = await AddUserAsync(db, "google-a");
        var b = await AddUserAsync(db, "google-b");
        var browser = Guid.NewGuid();
        db.PlayerChallengeProgress.Add(Row(browser, Day3, a.Id));
        db.PlayerChallengeProgress.Add(Row(browser, Day2));
        await db.SaveChangesAsync(Ct);

        await AccountService.ClaimAnonymousProgressAsync(db, browser, b.Id, Ct);

        Assert.True(await AccountService.BrowserHasOtherAccountAsync(db, browser, b.Id, Ct));
        // B's game for Day3 isn't found on this browser, so a guess would add
        // a second (browser, Day3) row: exactly what the fresh id avoids.
        var asB = new FakePlayer(browser, b.Id);
        Assert.Null(await AccountService.FindProgressAsync(db, asB, Day3, Ct));
    }

    [Fact]
    public async Task A_browser_with_only_its_own_account_games_keeps_its_id()
    {
        await using var db = NewDb();
        var a = await AddUserAsync(db, "google-a");
        var browser = Guid.NewGuid();
        db.PlayerChallengeProgress.Add(Row(browser, Day3, a.Id));
        db.PlayerChallengeProgress.Add(Row(browser, Day2));
        await db.SaveChangesAsync(Ct);

        await AccountService.ClaimAnonymousProgressAsync(db, browser, a.Id, Ct);

        Assert.False(await AccountService.BrowserHasOtherAccountAsync(db, browser, a.Id, Ct));
        Assert.False(await AccountService.BrowserHasOtherAccountAsync(db, Guid.NewGuid(), a.Id, Ct));
    }

    [Fact]
    public async Task A_missing_google_name_falls_back_to_the_email()
    {
        await using var db = NewDb();

        var user = await AccountService.UpsertGoogleUserAsync(db, "sub-1", "a@example.com", "  ", Ct);

        Assert.Equal("a@example.com", user.DisplayName);
    }

    [Fact]
    public async Task Signed_in_the_day_game_is_the_account_one_on_every_browser()
    {
        await using var db = NewDb();
        var user = await AddUserAsync(db);
        var laptop = Guid.NewGuid();
        var phone = Guid.NewGuid();
        db.PlayerChallengeProgress.AddRange(Row(laptop, Day1, user.Id, attempts: 4), Row(phone, Day2));
        await db.SaveChangesAsync(Ct);

        var onPhone = new FakePlayer(phone, user.Id);
        Assert.Equal(4, (await AccountService.FindProgressAsync(db, onPhone, Day1, Ct))!.AttemptsUsed);

        // The phone's own untagged game of Day2 is taken over by the account.
        var taken = await AccountService.FindProgressAsync(db, onPhone, Day2, Ct);
        Assert.Equal(user.Id, taken!.UserId);

        // Signed out, the phone only sees its own browser games.
        Assert.Null(await AccountService.FindProgressAsync(db, new FakePlayer(phone, null), Day1, Ct));
    }

    [Fact]
    public async Task Guesses_signed_in_are_counted_on_the_account_across_browsers()
    {
        await using var db = NewDb();
        await EmpireContentImporter.SyncAsync(db, [Empire("a"), Empire("b")]);
        var today = await ChallengeScheduler.EnsureForDateAsync(db, GameClock.Today());
        var wrongId = await db.Empires.Where(e => e.Id != today.EmpireId).Select(e => e.Id).FirstAsync(Ct);
        var user = await AddUserAsync(db);
        var controller = new ChallengesController(db, new FakeEnvironment())
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() },
        };

        await controller.Guess(new GuessRequest(wrongId), new FakePlayer(Guid.NewGuid(), user.Id));
        await controller.Guess(new GuessRequest(wrongId), new FakePlayer(Guid.NewGuid(), user.Id));

        var row = await db.PlayerChallengeProgress.SingleAsync(Ct);
        Assert.Equal(user.Id, row.UserId);
        Assert.Equal(2, row.AttemptsUsed);
    }

    [Fact]
    public async Task Me_is_anonymous_without_a_login()
    {
        await using var db = NewDb();
        var controller = Me(db, new FakePlayer(Guid.NewGuid(), null));

        Assert.Equal(new MeResponse(false, null), await controller.Get(Ct));
        Assert.Equal("no-store", controller.Response.Headers.CacheControl.ToString());
    }

    [Fact]
    public async Task Me_returns_the_user_and_the_supporter_flag()
    {
        await using var db = NewDb();
        var user = await AddUserAsync(db, supporterSince: DateTime.UtcNow);

        var me = await Me(db, new FakePlayer(Guid.NewGuid(), user.Id)).Get(Ct);

        Assert.True(me.Authenticated);
        Assert.Equal(new MeUser(user.Id, user.DisplayName, user.Email, true), me.User);
    }

    [Fact]
    public async Task Me_is_anonymous_when_the_account_no_longer_exists()
    {
        await using var db = NewDb();

        var me = await Me(db, new FakePlayer(Guid.NewGuid(), Guid.NewGuid())).Get(Ct);

        Assert.False(me.Authenticated);
        Assert.Null(me.User);
    }

    [Fact]
    public async Task Deleting_the_account_removes_it_and_its_games_and_signs_out()
    {
        await using var db = NewDb();
        var user = await AddUserAsync(db);
        var other = await AddUserAsync(db, "google-2");
        var browser = Guid.NewGuid();
        db.PlayerChallengeProgress.AddRange(
            Row(browser, Day1, user.Id),
            Row(Guid.NewGuid(), Day2, user.Id),
            Row(Guid.NewGuid(), Day1, other.Id),
            Row(Guid.NewGuid(), Day1));
        await db.SaveChangesAsync(Ct);

        var controller = Me(db, new FakePlayer(browser, user.Id));
        Assert.IsType<NoContentResult>(await controller.Delete(Ct));

        Assert.False(await db.Users.AnyAsync(u => u.Id == user.Id, Ct));
        Assert.False(await db.PlayerChallengeProgress.AnyAsync(p => p.UserId == user.Id, Ct));
        Assert.Equal(2, await db.PlayerChallengeProgress.CountAsync(Ct));

        // The login cookie is cleared and the browser gets a fresh anonymous id.
        var cookies = controller.Response.Headers.SetCookie.ToString();
        Assert.Contains($"{AuthConstants.SessionCookieName}=;", cookies);
        Assert.Contains($"{AnonymousIdentity.CookieName}=", cookies);
        Assert.DoesNotContain(browser.ToString(), cookies);
    }

    [Fact]
    public async Task Deleting_without_a_login_is_refused()
    {
        await using var db = NewDb();
        await AddUserAsync(db);

        Assert.IsType<UnauthorizedResult>(await Me(db, new FakePlayer(Guid.NewGuid(), null)).Delete(Ct));
        Assert.Equal(1, await db.Users.CountAsync(Ct));
    }

    [Theory]
    [InlineData("https://imperatle.com/pt", true)]
    [InlineData("https://imperatle.com", true)]
    [InlineData("http://localhost:3000/en?x=1", true)]
    [InlineData("https://IMPERATLE.com/en", true)]
    [InlineData("https://evil.com/?https://imperatle.com", false)]
    [InlineData("https://imperatle.com.evil.com/", false)]
    [InlineData("https://imperatle.com@evil.com/", false)]
    [InlineData("https://user@imperatle.com/", false)]
    [InlineData("http://imperatle.com/", false)]
    [InlineData("http://localhost:3001/", false)]
    [InlineData("//evil.com", false)]
    [InlineData("/pt", false)]
    [InlineData("javascript:alert(1)", false)]
    [InlineData("", false)]
    public void Login_only_returns_to_the_web_app(string returnUrl, bool allowed)
    {
        var origins = new AllowedOrigins(["https://imperatle.com", "http://localhost:3000"]);

        Assert.Equal(allowed, origins.IsAllowedReturnUrl(returnUrl));
    }

    [Fact]
    public void Login_errors_are_flagged_in_the_query()
    {
        Assert.Equal("https://imperatle.com/pt?login=error", AuthController.WithLoginError("https://imperatle.com/pt"));
        Assert.Equal("https://imperatle.com/pt?a=1&login=error#x", AuthController.WithLoginError("https://imperatle.com/pt?a=1#x"));
    }

    [Theory]
    [InlineData("https://imperatle.com", true)]
    [InlineData("https://evil.com", false)]
    [InlineData(null, false)]
    public void Logout_and_delete_only_accept_the_web_app_origin(string? origin, bool allowed)
    {
        var httpContext = new DefaultHttpContext
        {
            RequestServices = new ServiceCollection()
                .AddSingleton(new AllowedOrigins(["https://imperatle.com"]))
                .BuildServiceProvider(),
        };
        if (origin is not null)
        {
            httpContext.Request.Headers.Origin = origin;
        }

        var context = new ActionExecutingContext(
            new ActionContext(httpContext, new RouteData(), new ActionDescriptor()),
            [],
            new Dictionary<string, object?>(),
            controller: new object());
        new RequireAllowedOriginAttribute().OnActionExecuting(context);

        if (allowed)
        {
            Assert.Null(context.Result);
        }
        else
        {
            Assert.Equal(StatusCodes.Status403Forbidden, Assert.IsType<StatusCodeResult>(context.Result).StatusCode);
        }
    }

    [Fact]
    public void The_user_id_comes_only_from_an_authenticated_login_cookie()
    {
        var id = Guid.NewGuid();
        var claim = new Claim(AuthConstants.UserIdClaim, id.ToString());

        Assert.Equal(id, HttpCurrentPlayer.GetUserId(new ClaimsPrincipal(new ClaimsIdentity([claim], AuthConstants.SessionScheme))));
        Assert.Null(HttpCurrentPlayer.GetUserId(new ClaimsPrincipal(new ClaimsIdentity([claim]))));
        Assert.Null(HttpCurrentPlayer.GetUserId(new ClaimsPrincipal(new ClaimsIdentity(AuthConstants.SessionScheme))));
    }

    private static MeController Me(ImperatleDbContext db, ICurrentPlayer player)
    {
        var services = new ServiceCollection().AddLogging();
        services.AddAuthentication(AuthConstants.SessionScheme)
            .AddCookie(AuthConstants.SessionScheme, o => o.Cookie.Name = AuthConstants.SessionCookieName);

        return new MeController(db, player)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { RequestServices = services.BuildServiceProvider() },
            },
        };
    }

    private static EmpireContent Empire(string slug) => new(
        Slug: slug,
        Name: new(slug, slug + " pt"),
        Peak: new(100, YearPrecision.Exact),
        Start: new(50, YearPrecision.Exact),
        End: new(150, YearPrecision.Exact),
        Area: new(1000, AreaPrecision.Exact),
        MapAccuracy: BorderConfidence.Precise,
        Continents: [Continent.Europe],
        PrimaryContinents: [Continent.Europe],
        Capital: new("Capital", "Capital"),
        Language: new("L", "L"),
        Religion: new("R", "R"),
        Curiosities: [new("1", "1"), new("2", "2"), new("3", "3")],
        Map: new([new("Polity", 100)]),
        Wikipedia: new($"https://en.wikipedia.org/wiki/{slug}", $"https://pt.wikipedia.org/wiki/{slug}"));

    private sealed class FakePlayer(Guid anonymousId, Guid? userId) : ICurrentPlayer
    {
        public Guid AnonymousId { get; } = anonymousId;
        public Guid? UserId { get; } = userId;
        public Task<bool> IsSupporterAsync(CancellationToken ct = default) => Task.FromResult(false);
    }

    private sealed class FakeEnvironment : IWebHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Production";
        public string ApplicationName { get; set; } = "Imperatle.Api";
        public string WebRootPath { get; set; } = "";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string ContentRootPath { get; set; } = "";
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
