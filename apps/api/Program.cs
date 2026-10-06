using System.Threading.RateLimiting;
using Imperatle.Api.Data;
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

builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
    {
        policy.WithOrigins("http://localhost:3000")
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
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();

    using var seedScope = app.Services.CreateScope();
    var db = seedScope.ServiceProvider.GetRequiredService<ImperatleDbContext>();
    await DevSeeder.SeedAsync(db, app.Configuration["Dev:ForceTodayEmpireSlug"]);
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
