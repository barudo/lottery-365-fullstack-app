using Lottery365.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Lottery365.Api.Data;

public sealed class Lottery365DbContext(DbContextOptions<Lottery365DbContext> options) : DbContext(options)
{
    private const string TicketNumbersAreUniqueCheck = """
        [Number1] <> [Number2] AND [Number1] <> [Number3] AND [Number1] <> [Number4] AND [Number1] <> [Number5] AND [Number1] <> [Number6] AND
        [Number2] <> [Number3] AND [Number2] <> [Number4] AND [Number2] <> [Number5] AND [Number2] <> [Number6] AND
        [Number3] <> [Number4] AND [Number3] <> [Number5] AND [Number3] <> [Number6] AND
        [Number4] <> [Number5] AND [Number4] <> [Number6] AND
        [Number5] <> [Number6]
        """;

    private const string WinningNumbersAreUniqueCheck = """
        [WinningNumber1] <> [WinningNumber2] AND [WinningNumber1] <> [WinningNumber3] AND [WinningNumber1] <> [WinningNumber4] AND [WinningNumber1] <> [WinningNumber5] AND [WinningNumber1] <> [WinningNumber6] AND
        [WinningNumber2] <> [WinningNumber3] AND [WinningNumber2] <> [WinningNumber4] AND [WinningNumber2] <> [WinningNumber5] AND [WinningNumber2] <> [WinningNumber6] AND
        [WinningNumber3] <> [WinningNumber4] AND [WinningNumber3] <> [WinningNumber5] AND [WinningNumber3] <> [WinningNumber6] AND
        [WinningNumber4] <> [WinningNumber5] AND [WinningNumber4] <> [WinningNumber6] AND
        [WinningNumber5] <> [WinningNumber6]
        """;

    public DbSet<User> Users => Set<User>();

    public DbSet<Ticket> Tickets => Set<Ticket>();

    public DbSet<Round> Rounds => Set<Round>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(user => user.Id);

            entity.Property(user => user.FirstName)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(user => user.LastName)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(user => user.Email)
                .HasMaxLength(256)
                .IsRequired();

            entity.Property(user => user.NormalizedEmail)
                .HasMaxLength(256)
                .IsRequired();

            entity.HasIndex(user => user.NormalizedEmail)
                .IsUnique();

            entity.Property(user => user.PasswordHash)
                .HasMaxLength(512)
                .IsRequired();

            entity.Property(user => user.Role)
                .HasConversion<string>()
                .HasMaxLength(50)
                .IsRequired();
        });

        modelBuilder.Entity<Ticket>(entity =>
        {
            entity.HasKey(ticket => ticket.Id);

            entity.HasIndex(ticket => ticket.UserId);
            entity.HasIndex(ticket => ticket.RoundId);

            entity.Property(ticket => ticket.CreatedAt)
                .IsRequired();

            entity.Property(ticket => ticket.DrawStatus)
                .HasConversion<string>()
                .HasMaxLength(20)
                .IsRequired();

            entity.HasOne(ticket => ticket.User)
                .WithMany(user => user.Tickets)
                .HasForeignKey(ticket => ticket.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            AddNumberConstraints<Ticket>(
                entity,
                "CK_Tickets_Numbers_AreInRange",
                "CK_Tickets_Numbers_AreUnique",
                TicketNumbersAreUniqueCheck,
                "Number1",
                "Number2",
                "Number3",
                "Number4",
                "Number5",
                "Number6");
        });

        modelBuilder.Entity<Round>(entity =>
        {
            entity.HasKey(round => round.Id);

            entity.HasIndex(round => round.RoundNumber)
                .IsUnique();

            entity.Property(round => round.DrawnAt)
                .IsRequired();

            AddNumberConstraints<Round>(
                entity,
                "CK_Rounds_WinningNumbers_AreInRange",
                "CK_Rounds_WinningNumbers_AreUnique",
                WinningNumbersAreUniqueCheck,
                "WinningNumber1",
                "WinningNumber2",
                "WinningNumber3",
                "WinningNumber4",
                "WinningNumber5",
                "WinningNumber6");
        });
    }

    private static void AddNumberConstraints<TEntity>(
        Microsoft.EntityFrameworkCore.Metadata.Builders.EntityTypeBuilder<TEntity> entity,
        string rangeConstraintName,
        string uniqueConstraintName,
        string uniqueConstraint,
        params string[] columnNames)
        where TEntity : class
    {
        entity.ToTable(builder =>
        {
            builder.HasCheckConstraint(
                rangeConstraintName,
                string.Join(" AND ", columnNames.Select(columnName => $"[{columnName}] BETWEEN 1 AND 49")));

            builder.HasCheckConstraint(uniqueConstraintName, uniqueConstraint);
        });
    }
}
