using Imperatle.Api.Data;
using Imperatle.Api.Dtos;
using Imperatle.Api.Game;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Imperatle.Api.Controllers;

[ApiController]
[Route("empires")]
public class EmpiresController(ImperatleDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var empires = await db.Empires
            .Where(e => e.Active)
            .OrderBy(e => e.NameEn)
            .Select(e => new EmpireSummary(e.Id, e.NameEn, e.NamePt, e.NameEs, e.Aliases, e.Slug))
            .ToListAsync();

        return Ok(empires);
    }

    // One empire's public page: the fact sheet, summary and curiosities, the
    // same as the end of a round. Never the map: with every empire's shape a
    // script could match the day's map against all of them (see
    // ChallengesController.GetGuessMap).
    [HttpGet("{slug}")]
    public async Task<IActionResult> GetBySlug(string slug, CancellationToken ct)
    {
        var empire = await db.Empires
            .AsNoTracking()
            .Include(e => e.Hints)
            .FirstOrDefaultAsync(e => e.Active && e.Slug == slug, ct);
        if (empire is null)
        {
            return NotFound();
        }

        Response.Headers.CacheControl = "public, max-age=3600";
        return Ok(RevealBuilder.BuildAnswer(empire));
    }
}
