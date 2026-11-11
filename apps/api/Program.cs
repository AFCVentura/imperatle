using System.Threading.RateLimiting;
using Imperatle.Api.Auth;
using Imperatle.Api.Data;
using Imperatle.Api.Game;
using Imperatle.Api.Payments;
using Imperatle.Api.Services;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

const string FrontendCorsPolicy = "FrontendCorsPolicy";
const string AnonymousCookieName = AnonymousIdentity.CookieName;

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddDbContext<ImperatleDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Practice mode's difficulty tiers (Content/practice-difficulty.json).
builder.Services.AddSingleton(PracticeDifficultyTiers.LoadFromFile(PracticeDifficultyTiers.DefaultPath));

builder.Services.AddHttpClient<FeedbackEmailService>(client =>
{
    client.BaseAddress = new Uri("https://api.resend.com/");
    client.Timeout = TimeSpan.FromSeconds(10);
});

// Stripe (Supporter purchase): secret key, webhook secret and price id, see README "Configuration".
builder.Services.Configure<StripeOptions>(builder.Configuration.GetSection(StripeOptions.SectionName));
builder.Services.AddScoped<StripeWebhookProcessor>();
builder.Services.AddMemoryCache();
builder.Services.AddScoped<ISupporterCheckout, StripeSupporterCheckout>();
builder.Services.AddSingleton(TimeProvider.System);

// Daily deletion of old practice rounds and dead login sessions (DataCleanup).
builder.Services.Configure<CleanupOptions>(builder.Configuration.GetSection(CleanupOptions.SectionName));
builder.Services.AddHostedService<DataCleanupService>();

// Comma-separated so an environment can replace the whole list with one
// setting (Cors__AllowedOrigins); JSON arrays merge by index across files.
var allowedOrigins = (builder.Configuration["Cors:AllowedOrigins"] ?? "")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
if (allowedOrigins.Length == 0)
{
    throw new InvalidOperationException("Cors:AllowedOrigins is not configured.");
}

builder.Services.AddSingleton(new AllowedOrigins(allowedOrigins));

// Accounts (optional, Google only). The login cookie is HttpOnly, Secure and
// SameSite=Lax; with Auth:CookieDomain set (e.g. "imperatle.com") the web app
// and the API share it, otherwise it stays on the API host.
var cookieDomain = builder.Configuration["Auth:CookieDomain"];
var cookieSecurePolicy = builder.Environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;

builder.Services.AddDataProtection()
    .SetApplicationName("Imperatle")
    .PersistKeysToDbContext<ImperatleDbContext>();

var authentication = builder.Services.AddAuthentication(AuthConstants.SessionScheme)
    .AddCookie(AuthConstants.SessionScheme, options =>
    {
        options.Cookie.Name = AuthConstants.SessionCookieName;
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = cookieSecurePolicy;
        options.Cookie.Domain = string.IsNullOrWhiteSpace(cookieDomain) ? null : cookieDomain;
        options.ExpireTimeSpan = UserSessions.CookieLifetime;
        options.SlidingExpiration = true;
        options.Events.OnValidatePrincipal = AuthEvents.ValidatePrincipalAsync;
        options.Events.OnRedirectToLogin = context => AuthEvents.StatusInsteadOfRedirect(context, StatusCodes.Status401Unauthorized);
        options.Events.OnRedirectToAccessDenied = context => AuthEvents.StatusInsteadOfRedirect(context, StatusCodes.Status403Forbidden);
    })
    .AddCookie(AuthConstants.ExternalScheme, options =>
    {
        options.Cookie.Name = AuthConstants.ExternalCookieName;
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Lax;
        options.Cookie.SecurePolicy = cookieSecurePolicy;
        options.ExpireTimeSpan = TimeSpan.FromMinutes(10);
    });

// Without a client id/secret (CI, a fresh clone) the API runs without the
// Google scheme and the login endpoint answers with ?login=error.
var googleClientId = builder.Configuration["Auth:Google:ClientId"];
var googleClientSecret = builder.Configuration["Auth:Google:ClientSecret"];
if (!string.IsNullOrWhiteSpace(googleClientId) && !string.IsNullOrWhiteSpace(googleClientSecret))
{
    authentication.AddGoogle(AuthConstants.GoogleScheme, options =>
    {
        options.ClientId = googleClientId;
        options.ClientSecret = googleClientSecret;
        options.SignInScheme = AuthConstants.ExternalScheme;
        options.CallbackPath = "/signin-google";
        // Google returns with a top-level GET, which Lax cookies survive.
        options.CorrelationCookie.SameSite = SameSiteMode.Lax;
        options.CorrelationCookie.SecurePolicy = cookieSecurePolicy;
        options.Events.OnRemoteFailure = AuthEvents.GoogleRemoteFailureAsync;
        options.Events.OnAccessDenied = AuthEvents.GoogleAccessDeniedAsync;
    });
}

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<HttpCurrentPlayer>();
// Dev:IsSupporter=true (Development only) turns every player into a supporter
// to try the perks locally; anywhere else the flag is ignored.
if (builder.Environment.IsDevelopment() && builder.Configuration.GetValue("Dev:IsSupporter", false))
{
    builder.Services.AddScoped<ICurrentPlayer, DevSupporterCurrentPlayer>();
}
else
{
    builder.Services.AddScoped<ICurrentPlayer>(sp => sp.GetRequiredService<HttpCurrentPlayer>());
}

builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Partitioned by the anonymous cookie when present (falls back to IP for
    // requests without one yet) so one abusive client can't exhaust another's quota.
    options.AddPolicy("guess", httpContext =>
    {
        var key = httpContext.Request.Cookies[AnonymousCookieName]
            ?? httpContext.Connection.RemoteIpAddress?.ToString()
            ?? "unknown";

        return RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
        {
            Window = TimeSpan.FromMinutes(1),
            PermitLimit = 20,
            QueueLimit = 0,
        });
    });

    // Feedback: a few messages per IP every 10 minutes is plenty for a person.
    options.AddPolicy("feedback", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                Window = TimeSpan.FromMinutes(10),
                PermitLimit = 5,
                QueueLimit = 0,
            }));

    // Opening the Stripe checkout: a person clicks "buy" a handful of times at most.
    options.AddPolicy("checkout", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                Window = TimeSpan.FromMinutes(10),
                PermitLimit = 10,
                QueueLimit = 0,
            }));
});

// Scheme and client IP from the Azure Container Apps ingress, see ProxyHeaders.
builder.Services.Configure<ForwardedHeadersOptions>(ProxyHeaders.Configure);

var app = builder.Build();

app.UseForwardedHeaders();

// Brings the schema up to date before serving anything. EF Core locks the
// database while migrating, so replicas starting together don't race.
// Can be turned off (Database__MigrateOnStartup=false) to migrate by hand.
using (var startupScope = app.Services.CreateScope())
{
    var db = startupScope.ServiceProvider.GetRequiredService<ImperatleDbContext>();

    if (app.Configuration.GetValue("Database:MigrateOnStartup", true))
    {
        await db.Database.MigrateAsync();
    }

    // Content/empires/*.json is the source of truth for the empires; invalid
    // content stops the startup with every problem listed.
    var content = EmpireContentLoader.LoadFromDirectory(EmpireContentLoader.DefaultDirectory);
    var (added, updated, deactivated) = await EmpireContentImporter.SyncAsync(db, content);
    app.Logger.LogInformation("Empire content: {Added} added, {Updated} updated, {Deactivated} deactivated",
        added, updated, deactivated);

    await ChallengeScheduler.EnsureForDateAsync(db, GameClock.Today());

    if (app.Environment.IsDevelopment())
    {
        await DevSeeder.ForceTodayAsync(db, app.Configuration["Dev:ForceTodayEmpireSlug"]);
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// In Development the web app calls the plain-HTTP port (5055), which both the
// "http" and "https" launch profiles expose. Redirecting it to HTTPS would break
// CORS (the redirect response has no CORS headers) and Node's server-side fetch
// (it doesn't trust the dev certificate).
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors(FrontendCorsPolicy);

app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
