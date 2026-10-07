using Imperatle.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Imperatle.Api.Data;

public class ImperatleDbContext(DbContextOptions<ImperatleDbContext> options) : DbContext(options)
{
    public DbSet<Empire> Empires => Set<Empire>();
    public DbSet<EmpireHint> EmpireHints => Set<EmpireHint>();
    public DbSet<DailyChallenge> DailyChallenges => Set<DailyChallenge>();
    public DbSet<PlayerChallengeProgress> PlayerChallengeProgress => Set<PlayerChallengeProgress>();
    public DbSet<Feedback> Feedback => Set<Feedback>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Empire>()
            .HasIndex(e => e.Slug)
            .IsUnique();

        modelBuilder.Entity<Empire>()
            .HasMany(e => e.Hints)
            .WithOne(h => h.Empire)
            .HasForeignKey(h => h.EmpireId);

        modelBuilder.Entity<DailyChallenge>()
            .HasIndex(c => c.Date)
            .IsUnique();

        modelBuilder.Entity<PlayerChallengeProgress>()
            .HasIndex(p => new { p.AnonymousId, p.Date })
            .IsUnique();

        // Community stats read every finished game of a given day.
        modelBuilder.Entity<PlayerChallengeProgress>()
            .HasIndex(p => p.Date);

        modelBuilder.Entity<Feedback>(feedback =>
        {
            feedback.Property(f => f.Category).HasConversion<string>().HasMaxLength(20);
            feedback.Property(f => f.Message).HasMaxLength(2000);
            feedback.Property(f => f.Email).HasMaxLength(254);
            feedback.Property(f => f.Locale).HasMaxLength(10);
        });
    }
}
