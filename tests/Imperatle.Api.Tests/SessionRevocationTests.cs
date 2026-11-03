using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using Imperatle.Api.Auth;
using Imperatle.Api.Controllers;
using Imperatle.Api.Data;
using Imperatle.Api.Dtos;
using Imperatle.Api.Models;
using Imperatle.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.DependencyInjection;

namespace Imperatle.Api.Tests;

// Logout ends the session on the server: the login cookie, replayed as it
// was before the logout (a copy, say), is refused. Runs the real cookie
// handler, AuthEvents and the auth/me controllers on a TestServer; only the
// Google round trip is replaced by a test endpoint that signs in the same
// way GoogleComplete does (UserSessions.SignInAsync).
public sealed class SessionRevocationTests : IAsyncDisposable
{
    private const string WebOrigin = "http://web.test";

    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private readonly string _databaseName = Guid.NewGuid().ToString();
    private readonly InMemoryDatabaseRoot _root = new();
    private WebApplication? _app;

    private ImperatleDbContext OpenDb() =>
        new(new DbContextOptionsBuilder<ImperatleDbContext>().UseInMemoryDatabase(_databaseName, _root).Options);

    private async Task<HttpClient> StartAsync()
    {
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseTestServer();
        builder.Services.AddControllers().AddApplicationPart(typeof(AuthController).Assembly);
        builder.Services.AddDbContext<ImperatleDbContext>(o => o.UseInMemoryDatabase(_databaseName, _root));
        builder.Services.AddSingleton(new AllowedOrigins([WebOrigin]));
        builder.Services.AddHttpContextAccessor();
        builder.Services.AddScoped<HttpCurrentPlayer>();
        builder.Services.AddScoped<ICurrentPlayer>(sp => sp.GetRequiredService<HttpCurrentPlayer>());
        builder.Services.AddAuthentication(AuthConstants.SessionScheme)
            .AddCookie(AuthConstants.SessionScheme, options =>
            {
                options.Cookie.Name = AuthConstants.SessionCookieName;
                options.Events.OnValidatePrincipal = AuthEvents.ValidatePrincipalAsync;
                options.Events.OnRedirectToLogin = context => AuthEvents.StatusInsteadOfRedirect(context, StatusCodes.Status401Unauthorized);
            });

        _app = builder.Build();
        _app.UseAuthentication();
        _app.MapControllers();
        _app.MapPost("/test/login/{userId:guid}", async (Guid userId, HttpContext http, ImperatleDbContext db) =>
        {
            await UserSessions.SignInAsync(http, db, userId);
            return Results.NoContent();
        });
        // A login cookie from before sessions existed: the user id only.
        _app.MapPost("/test/login-without-session/{userId:guid}", async (Guid userId, HttpContext http) =>
        {
            var identity = new ClaimsIdentity([new Claim(AuthConstants.UserIdClaim, userId.ToString())], AuthConstants.SessionScheme);
            await http.SignInAsync(AuthConstants.SessionScheme, new ClaimsPrincipal(identity));
            return Results.NoContent();
        });
        await _app.StartAsync(Ct);
        return _app.GetTestClient();
    }

    public async ValueTask DisposeAsync()
    {
        if (_app is not null)
        {
            await _app.DisposeAsync();
        }
    }

    private async Task<Guid> NewUserAsync()
    {
        await using var db = OpenDb();
        var user = new User { Id = Guid.NewGuid(), GoogleSubject = Guid.NewGuid().ToString(), CreatedAtUtc = DateTime.UtcNow };
        db.Users.Add(user);
        await db.SaveChangesAsync(Ct);
        return user.Id;
    }

    // Signs in as a new browser would and returns its login cookie.
    private static async Task<string> LoginAsync(HttpClient client, Guid userId, string path = "/test/login")
    {
        var response = await client.PostAsync($"{path}/{userId}", null, Ct);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var setCookie = response.Headers.GetValues("Set-Cookie").Single(c => c.StartsWith(AuthConstants.SessionCookieName + "="));
        return setCookie.Split(';')[0];
    }

    private static async Task<bool> SignedInAsync(HttpClient client, string cookie)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, "/me");
        request.Headers.Add("Cookie", cookie);
        var response = await client.SendAsync(request, Ct);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<MeResponse>(Ct))!.Authenticated;
    }

    private static async Task<HttpStatusCode> SendAsync(HttpClient client, HttpMethod method, string path, string cookie, string? origin = WebOrigin)
    {
        using var request = new HttpRequestMessage(method, path);
        request.Headers.Add("Cookie", cookie);
        if (origin is not null)
        {
            request.Headers.Add("Origin", origin);
        }

        return (await client.SendAsync(request, Ct)).StatusCode;
    }

    [Fact]
    public async Task A_copied_cookie_stops_working_after_logout()
    {
        var client = await StartAsync();
        var userId = await NewUserAsync();
        var cookie = await LoginAsync(client, userId);
        Assert.True(await SignedInAsync(client, cookie));

        Assert.Equal(HttpStatusCode.NoContent, await SendAsync(client, HttpMethod.Post, "/auth/logout", cookie));

        // The same cookie, replayed as if it had been copied before the logout.
        Assert.False(await SignedInAsync(client, cookie));
        await using var db = OpenDb();
        Assert.NotNull((await db.UserSessions.SingleAsync(Ct)).RevokedAtUtc);
    }

    [Fact]
    public async Task A_normal_logout_ends_only_this_browsers_session()
    {
        var client = await StartAsync();
        var userId = await NewUserAsync();
        var laptop = await LoginAsync(client, userId);
        var phone = await LoginAsync(client, userId);

        await SendAsync(client, HttpMethod.Post, "/auth/logout", laptop);

        Assert.False(await SignedInAsync(client, laptop));
        Assert.True(await SignedInAsync(client, phone));
    }

    [Fact]
    public async Task Signing_out_of_all_devices_ends_every_session_of_the_account()
    {
        var client = await StartAsync();
        var userId = await NewUserAsync();
        var otherUser = await NewUserAsync();
        var laptop = await LoginAsync(client, userId);
        var phone = await LoginAsync(client, userId);
        var someoneElse = await LoginAsync(client, otherUser);

        Assert.Equal(HttpStatusCode.NoContent, await SendAsync(client, HttpMethod.Post, "/auth/logout?all=true", phone));

        Assert.False(await SignedInAsync(client, laptop));
        Assert.False(await SignedInAsync(client, phone));
        Assert.True(await SignedInAsync(client, someoneElse));

        // Signing in again afterwards works as usual.
        Assert.True(await SignedInAsync(client, await LoginAsync(client, userId)));
    }

    [Fact]
    public async Task Logout_from_another_origin_is_refused_and_ends_nothing()
    {
        var client = await StartAsync();
        var cookie = await LoginAsync(client, await NewUserAsync());

        Assert.Equal(HttpStatusCode.Forbidden, await SendAsync(client, HttpMethod.Post, "/auth/logout?all=true", cookie, "https://evil.example"));
        Assert.Equal(HttpStatusCode.Forbidden, await SendAsync(client, HttpMethod.Post, "/auth/logout", cookie, origin: null));

        Assert.True(await SignedInAsync(client, cookie));
    }

    [Fact]
    public async Task A_deleted_account_is_refused_on_every_device()
    {
        var client = await StartAsync();
        var userId = await NewUserAsync();
        var laptop = await LoginAsync(client, userId);
        var phone = await LoginAsync(client, userId);

        Assert.Equal(HttpStatusCode.NoContent, await SendAsync(client, HttpMethod.Delete, "/me", laptop));

        Assert.False(await SignedInAsync(client, laptop));
        Assert.False(await SignedInAsync(client, phone));
        await using var db = OpenDb();
        Assert.Empty(db.UserSessions);
        Assert.Empty(db.Users);
    }

    [Fact]
    public async Task A_cookie_without_a_session_is_refused()
    {
        var client = await StartAsync();
        var cookie = await LoginAsync(client, await NewUserAsync(), "/test/login-without-session");

        Assert.False(await SignedInAsync(client, cookie));
    }

    // Everyday requests keep working, and last-seen is written at most once
    // a day rather than on every request.
    [Fact]
    public async Task Normal_requests_are_unaffected_and_touch_last_seen_once_a_day()
    {
        var client = await StartAsync();
        var cookie = await LoginAsync(client, await NewUserAsync());
        for (var i = 0; i < 5; i++)
        {
            Assert.True(await SignedInAsync(client, cookie));
        }

        var stale = DateTime.UtcNow.AddDays(-3);
        await using (var db = OpenDb())
        {
            var session = await db.UserSessions.SingleAsync(Ct);
            session.LastSeenUtc = stale;
            await db.SaveChangesAsync(Ct);
        }

        Assert.True(await SignedInAsync(client, cookie));
        await using (var db = OpenDb())
        {
            Assert.True((await db.UserSessions.SingleAsync(Ct)).LastSeenUtc > stale.AddDays(2));
        }
    }
}
