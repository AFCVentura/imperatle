using Imperatle.Api.Auth;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

namespace Imperatle.Api.Tests;

// Behind the Azure Container Apps ingress every request arrives from the
// ingress itself; without X-Forwarded-For the per-IP rate limits would be
// shared by every visitor.
public class ProxyHeadersTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private static async Task<string> EchoAsync(params (string Name, string Value)[] headers)
    {
        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseTestServer();
        builder.Services.Configure<ForwardedHeadersOptions>(ProxyHeaders.Configure);
        await using var app = builder.Build();
        app.UseForwardedHeaders();
        app.MapGet("/echo", (HttpContext c) => $"{c.Request.Scheme} {c.Connection.RemoteIpAddress}");
        await app.StartAsync(Ct);

        var request = new HttpRequestMessage(HttpMethod.Get, "/echo");
        foreach (var (name, value) in headers)
        {
            request.Headers.TryAddWithoutValidation(name, value);
        }
        var response = await app.GetTestClient().SendAsync(request, Ct);
        return await response.Content.ReadAsStringAsync(Ct);
    }

    [Fact]
    public async Task The_scheme_and_the_client_ip_come_from_the_ingress()
    {
        var echo = await EchoAsync(("X-Forwarded-Proto", "https"), ("X-Forwarded-For", "203.0.113.7"));

        Assert.Equal("https 203.0.113.7", echo);
    }

    [Fact]
    public async Task A_client_cannot_choose_its_ip_by_sending_the_header_itself()
    {
        // The client sent "198.51.100.1"; the ingress appended the real address.
        var echo = await EchoAsync(("X-Forwarded-Proto", "https"), ("X-Forwarded-For", "198.51.100.1, 203.0.113.7"));

        Assert.Equal("https 203.0.113.7", echo);
    }
}
