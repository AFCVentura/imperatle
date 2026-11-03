using Imperatle.Api.Models;
using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Imperatle.Api.Data;

public class ImperatleDbContext(DbContextOptions<ImperatleDbContext> options) : DbContext(options), IDataProtectionKeyContext
{
    public DbSet<Empire> Empires => Set<Empire>();
    public DbSet<EmpireHint> EmpireHints => Set<EmpireHint>();
    public DbSet<DailyChallenge> DailyChallenges => Set<DailyChallenge>();
    public DbSet<PlayerChallengeProgress> PlayerChallengeProgress => Set<PlayerChallengeProgress>();
    public DbSet<Feedback> Feedback => Set<Feedback>();
    public DbSet<User> Users => Set<User>();

    // ASP.NET Core Data Protection keys (they encrypt the login cookie), kept
    // in the database so every replica and every deploy can read the same
    // cookies instead of logging everyone out.
    public DbSet<DataProtectionKey> DataProtectionKeys => Set<DataProtectionKey>();

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

        // At most one row per account per day, wherever it was played.
        modelBuilder.Entity<PlayerChallengeProgress>()
            .HasIndex(p => new { p.UserId, p.Date })
            .IsUnique()
            .HasFilter("\"UserId\" IS NOT NULL");

        // Deleting an account deletes its games (LGPD/GDPR).
        modelBuilder.Entity<PlayerChallengeProgress>()
            .HasOne<User>()
            .WithMany()
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<User>(user =>
        {
            user.HasIndex(u => u.GoogleSubject).IsUnique();
            user.Property(u => u.GoogleSubject).HasMaxLength(255);
            user.Property(u => u.Email).HasMaxLength(254);
            user.Property(u => u.DisplayName).HasMaxLength(200);
            user.Property(u => u.PaddleTransactionId).HasMaxLength(100);
        });

        modelBuilder.Entity<Feedback>(feedback =>
        {
            feedback.Property(f => f.Category).HasConversion<string>().HasMaxLength(20);
            feedback.Property(f => f.Message).HasMaxLength(2000);
            feedback.Property(f => f.Email).HasMaxLength(254);
            feedback.Property(f => f.Locale).HasMaxLength(10);
        });
    }
}
