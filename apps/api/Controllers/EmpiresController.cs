using Imperatle.Api.Data;
using Imperatle.Api.Dtos;
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
            .Select(e => new EmpireSummary(e.Id, e.NameEn, e.NamePt))
            .ToListAsync();

        return Ok(empires);
    }
}
