using System.Threading.RateLimiting;
using Imperatle.Api.Data;
using Imperatle.Api.Game;
using Imperatle.Api.Services;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

const string FrontendCorsPolicy = "FrontendCorsPolicy";
const string AnonymousCookieName = "imperatle_aid";

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddDbContext<ImperatleDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddHttpClient<FeedbackEmailService>(client =>
{
    client.BaseAddress = new Uri("https://api.resend.com/");
    client.Timeout = TimeSpan.FromSeconds(10);
});

// Comma-separated so an environment can replace the whole list with one
// setting (Cors__AllowedOrigins); JSON arrays merge by index across files.
var allowedOrigins = (builder.Configuration["Cors:AllowedOrigins"] ?? "")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
if (allowedOrigins.Length == 0)
{
    throw new InvalidOperationException("Cors:AllowedOrigins is not configured.");
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
});

var app = builder.Build();

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

    await ChallengeScheduler.EnsureForDateAsync(db, DateOnly.FromDateTime(DateTime.UtcNow));

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

app.UseAuthorization();

app.MapControllers();

app.Run();
