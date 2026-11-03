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
    public DbSet<User> Users => Set<User>();
    public DbSet<ProcessedWebhookEvent> ProcessedWebhookEvents => Set<ProcessedWebhookEvent>();

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

        modelBuilder.Entity<User>(user =>
        {
            user.HasIndex(u => u.GoogleSubject).IsUnique();
            user.Property(u => u.GoogleSubject).HasMaxLength(255);
            user.Property(u => u.Email).HasMaxLength(254);
            user.Property(u => u.DisplayName).HasMaxLength(200);
            user.Property(u => u.PaddleTransactionId).HasMaxLength(64);
            // Refund webhooks look the user up by the transaction they paid with.
            user.HasIndex(u => u.PaddleTransactionId);
        });

        modelBuilder.Entity<ProcessedWebhookEvent>(evt =>
        {
            evt.HasKey(e => e.Id);
            evt.Property(e => e.Id).HasMaxLength(64);
            evt.Property(e => e.EventType).HasMaxLength(64);
            evt.Property(e => e.TransactionId).HasMaxLength(64);
            evt.Property(e => e.Outcome).HasMaxLength(32);
            evt.HasIndex(e => e.TransactionId);
        });
    }
}
