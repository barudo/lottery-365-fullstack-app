namespace Lottery365.Api.Models;

public sealed class Round
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public int RoundNumber { get; set; }

    public int WinningNumber1 { get; set; }

    public int WinningNumber2 { get; set; }

    public int WinningNumber3 { get; set; }

    public int WinningNumber4 { get; set; }

    public int WinningNumber5 { get; set; }

    public int WinningNumber6 { get; set; }

    public DateTimeOffset DrawnAt { get; set; }

    public int[] GetWinningNumbers()
    {
        return [WinningNumber1, WinningNumber2, WinningNumber3, WinningNumber4, WinningNumber5, WinningNumber6];
    }
}
