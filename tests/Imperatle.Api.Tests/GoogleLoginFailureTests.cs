using Imperatle.Api.Auth;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

namespace Imperatle.Api.Tests;

// The way back from Google must never end on a bare 500: a failure returns the
// player to the page they came from with ?login=error, a cancel without it.
public class GoogleLoginFailureTests
{
    private static readonly AuthenticationScheme GoogleScheme =
        new(AuthConstants.GoogleScheme, null, typeof(GoogleHandler));

    private static DefaultHttpContext NewHttpContext()
    {
        var services = new ServiceCollection()
            .AddLogging()
            .AddSingleton(new AllowedOrigins(["https://imperatle.com", "https://www.imperatle.com"]))
            .BuildServiceProvider();
        return new DefaultHttpContext { RequestServices = services };
    }

    private static AuthenticationProperties WithReturnUrl(string returnUrl) =>
        new() { Items = { [AuthConstants.ReturnUrlItem] = returnUrl } };

    [Fact]
    public async Task Failure_redirects_back_with_the_login_error_flag()
    {
        var http = NewHttpContext();
        var context = new RemoteFailureContext(http, GoogleScheme, new GoogleOptions(),
            new AuthenticationFailureException("OAuth token endpoint failure: invalid_client"))
        {
            Properties = WithReturnUrl("https://imperatle.com/pt/archive"),
        };

        await AuthEvents.GoogleRemoteFailureAsync(context);

        Assert.True(context.Result?.Handled);
        Assert.Equal(StatusCodes.Status302Found, http.Response.StatusCode);
        Assert.Equal("https://imperatle.com/pt/archive?login=error", http.Response.Headers.Location.ToString());
    }

    [Fact]
    public async Task Failure_without_a_known_return_url_goes_to_the_default_origin()
    {
        var http = NewHttpContext();
        var context = new RemoteFailureContext(http, GoogleScheme, new GoogleOptions(),
            new AuthenticationFailureException("Correlation failed."))
        {
            Properties = null,
        };

        await AuthEvents.GoogleRemoteFailureAsync(context);

        Assert.Equal("https://imperatle.com/?login=error", http.Response.Headers.Location.ToString());
    }

    [Fact]
    public async Task Failure_never_redirects_to_a_foreign_host()
    {
        var http = NewHttpContext();
        var context = new RemoteFailureContext(http, GoogleScheme, new GoogleOptions(),
            new AuthenticationFailureException("boom"))
        {
            Properties = WithReturnUrl("https://evil.example/steal"),
        };

        await AuthEvents.GoogleRemoteFailureAsync(context);

        Assert.StartsWith("https://imperatle.com/", http.Response.Headers.Location.ToString());
    }

    [Fact]
    public async Task Cancel_on_google_returns_to_the_page_without_an_error()
    {
        var http = NewHttpContext();
        var context = new AccessDeniedContext(http, GoogleScheme, new GoogleOptions())
        {
            Properties = WithReturnUrl("https://imperatle.com/en"),
        };

        await AuthEvents.GoogleAccessDeniedAsync(context);

        Assert.True(context.Result?.Handled);
        Assert.Equal("https://imperatle.com/en", http.Response.Headers.Location.ToString());
    }
}
