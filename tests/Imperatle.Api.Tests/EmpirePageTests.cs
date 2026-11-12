using Imperatle.Api.Controllers;
using Imperatle.Api.Dtos;
using Microsoft.AspNetCore.Mvc;
using static Imperatle.Api.Tests.PerksTestSupport;

namespace Imperatle.Api.Tests;

// The public empire pages: the fact sheet by slug, never the map.
public class EmpirePageTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    [Fact]
    public async Task An_empire_page_has_the_fact_sheet_and_the_list_has_slugs()
    {
        await using var db = NewDb();
        await SeedAsync(db, Empire("roman-empire"), Empire("mongol-empire"));
        var controller = new EmpiresController(db).WithHttpContext();

        var page = Assert.IsType<EmpireAnswer>(Assert.IsType<OkObjectResult>(await controller.GetBySlug("roman-empire", Ct)).Value);
        Assert.Equal("roman-empire", page.Slug);
        Assert.Contains("public", controller.Response.Headers.CacheControl.ToString());

        var list = Assert.IsType<List<EmpireSummary>>(Assert.IsType<OkObjectResult>(await controller.GetAll()).Value);
        Assert.Equal(["mongol-empire", "roman-empire"], list.Select(e => e.Slug).Order());
    }

    [Fact]
    public async Task Unknown_slugs_are_not_found()
    {
        await using var db = NewDb();
        await SeedAsync(db, Empire("roman-empire"));
        var controller = new EmpiresController(db).WithHttpContext();

        Assert.IsType<NotFoundResult>(await controller.GetBySlug("atlantis", Ct));
    }

    // The page DTO has no shape: every empire's map in public would let a
    // script find the day's answer.
    [Fact]
    public void The_page_never_carries_the_map()
    {
        Assert.DoesNotContain(typeof(EmpireAnswer).GetProperties(), p => p.Name.Contains("Shape") || p.Name.Contains("Map") && p.Name != "MapBorderConfidence");
    }
}
