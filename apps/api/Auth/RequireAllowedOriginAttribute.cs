using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Imperatle.Api.Auth;

// CSRF guard for the state-changing account endpoints (logout, delete). The
// login cookie is SameSite=Lax, so other sites can't send it on a POST or
// DELETE anyway; this also refuses requests from other subdomains or tools
// that don't come from the web app. Browsers always send Origin on these.
public sealed class RequireAllowedOriginAttribute : Attribute, IActionFilter
{
    public void OnActionExecuting(ActionExecutingContext context)
    {
        var origins = context.HttpContext.RequestServices.GetRequiredService<AllowedOrigins>();
        if (!origins.IsAllowedOrigin(context.HttpContext.Request.Headers.Origin.ToString()))
        {
            context.Result = new StatusCodeResult(StatusCodes.Status403Forbidden);
        }
    }

    public void OnActionExecuted(ActionExecutedContext context)
    {
    }
}
