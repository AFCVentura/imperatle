using Imperatle.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Imperatle.Api.Data;

public class ImperatleDbContext(DbContextOptions<ImperatleDbContext> options) : DbContext(options)
{
    public DbSet<Empire> Empires => Set<Empire>();
}
