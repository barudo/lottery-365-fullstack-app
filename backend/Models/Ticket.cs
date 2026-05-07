namespace Lottery365.Api.Models;

public sealed class Ticket
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    public int RoundId { get; set; }

    public int Number1 { get; set; }

    public int Number2 { get; set; }

    public int Number3 { get; set; }

    public int Number4 { get; set; }

    public int Number5 { get; set; }

    public int Number6 { get; set; }

    public DrawStatus DrawStatus { get; set; } = DrawStatus.Loading;

    public DateTimeOffset CreatedAt { get; set; }

    public User? User { get; set; }

    public int CountMatches(Round round)
    {
        return GetNumbers().Intersect(round.GetWinningNumbers()).Count();
    }

    public bool WinsAgainst(Round round, int requiredMatches = 6)
    {
        return CountMatches(round) >= requiredMatches;
    }

    public int[] GetNumbers()
    {
        return [Number1, Number2, Number3, Number4, Number5, Number6];
    }
}
