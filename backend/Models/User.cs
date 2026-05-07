namespace Lottery365.Api.Models;

public sealed class User
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public required string FirstName { get; set; }

    public required string LastName { get; set; }

    public required string Email { get; set; }

    public required string NormalizedEmail { get; set; }

    public required string PasswordHash { get; set; }

    public UserRole Role { get; set; } = UserRole.Player;

    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset UpdatedAt { get; set; }

    public ICollection<Ticket> Tickets { get; set; } = [];
}
