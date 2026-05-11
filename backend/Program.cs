using System.ComponentModel.DataAnnotations;
using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Lottery365.Api.Data;
using Lottery365.Api.Models;
using Lottery365.Api.Security;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
var drawSockets = new ConcurrentDictionary<Guid, WebSocket>();

builder.Services.AddOpenApi();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:5173",
                "http://127.0.0.1:5173",
                "http://localhost:5174",
                "http://127.0.0.1:5174")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddDbContext<Lottery365DbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseRouting();
app.UseWebSockets();
app.UseCors("Frontend");

app.Map("/ws", async context =>
{
    if (!context.WebSockets.IsWebSocketRequest)
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        return;
    }

    var socketId = Guid.NewGuid();
    using var socket = await context.WebSockets.AcceptWebSocketAsync();
    drawSockets.TryAdd(socketId, socket);

    try
    {
        await ReceiveUntilClosedAsync(socket, context.RequestAborted);
    }
    finally
    {
        drawSockets.TryRemove(socketId, out _);
    }
});

app.MapPost("/users", async (
    CreateUserRequest request,
    Lottery365DbContext dbContext,
    CancellationToken cancellationToken) =>
{
    var validationErrors = ValidateCreateUserRequest(request);

    if (validationErrors.Count > 0)
    {
        return Results.ValidationProblem(validationErrors);
    }

    var normalizedEmail = request.Email.Trim().ToLowerInvariant();

    try
    {
        await dbContext.Database.MigrateAsync(cancellationToken);

        var emailExists = await dbContext.Users
            .AnyAsync(user => user.NormalizedEmail == normalizedEmail, cancellationToken);

        if (emailExists)
        {
            return Results.Conflict(new { message = "A user with this email already exists." });
        }

        var user = new User
        {
            FirstName = request.Name.Trim(),
            LastName = request.Lastname.Trim(),
            Email = request.Email.Trim(),
            NormalizedEmail = normalizedEmail,
            PasswordHash = PasswordHasher.Hash(request.Password),
            Role = UserRole.Player,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync(cancellationToken);

        var response = new UserResponse(
            user.Id,
            user.FirstName,
            user.LastName,
            user.Email,
            user.Role.ToString(),
            user.CreatedAt);

        return Results.Created($"/users/{user.Id}", response);
    }
    catch (Exception exception) when (exception is SqlException || exception.InnerException is SqlException)
    {
        return Results.Problem(
            detail: "SQL Server is unavailable. Check the DefaultConnection value and make sure the database server is running.",
            statusCode: StatusCodes.Status503ServiceUnavailable,
            title: "Database unavailable");
    }
})
.WithName("CreateUser")
.WithSummary("Registers a new player account.");

app.MapPost("/api/auth/login", async (
    LoginRequest request,
    Lottery365DbContext dbContext,
    IConfiguration configuration,
    CancellationToken cancellationToken) =>
{
    var validationErrors = ValidateLoginRequest(request);

    if (validationErrors.Count > 0)
    {
        return Results.ValidationProblem(validationErrors);
    }

    var normalizedEmail = request.Email.Trim().ToLowerInvariant();

    try
    {
        await dbContext.Database.MigrateAsync(cancellationToken);

        var user = await dbContext.Users
            .AsNoTracking()
            .SingleOrDefaultAsync(currentUser => currentUser.NormalizedEmail == normalizedEmail, cancellationToken);

        if (user is null || !PasswordHasher.Verify(request.Password, user.PasswordHash))
        {
            return Results.Unauthorized();
        }

        var expiresAt = DateTimeOffset.UtcNow.AddHours(2);
        var token = CreateJwt(user, configuration, expiresAt);
        var response = new LoginResponse(
            token,
            "Bearer",
            expiresAt,
            new UserResponse(
                user.Id,
                user.FirstName,
                user.LastName,
                user.Email,
                user.Role.ToString(),
                user.CreatedAt));

        return Results.Ok(response);
    }
    catch (Exception exception) when (exception is SqlException || exception.InnerException is SqlException)
    {
        return Results.Problem(
            detail: "SQL Server is unavailable. Check the DefaultConnection value and make sure the database server is running.",
            statusCode: StatusCodes.Status503ServiceUnavailable,
            title: "Database unavailable");
    }
})
.WithName("Login")
.WithSummary("Authenticates a user and returns a JWT bearer token.");

app.MapPost("/api/draws", async (
    DrawRequest request,
    Lottery365DbContext dbContext,
    IConfiguration configuration,
    HttpContext httpContext,
    CancellationToken cancellationToken) =>
{
    if (!IsAdminRequest(httpContext, configuration))
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    var validationErrors = ValidateDrawRequest(request);

    if (validationErrors.Count > 0)
    {
        return Results.ValidationProblem(validationErrors);
    }

    try
    {
        await dbContext.Database.MigrateAsync(cancellationToken);

        var nextRoundNumber = await dbContext.Rounds
            .Select(round => (int?)round.RoundNumber)
            .MaxAsync(cancellationToken) ?? 0;

        var round = new Round
        {
            RoundNumber = nextRoundNumber + 1,
            WinningNumber1 = request.Numbers[0],
            WinningNumber2 = request.Numbers[1],
            WinningNumber3 = request.Numbers[2],
            WinningNumber4 = request.Numbers[3],
            WinningNumber5 = request.Numbers[4],
            WinningNumber6 = request.Numbers[5],
            DrawnAt = DateTimeOffset.UtcNow,
        };

        dbContext.Rounds.Add(round);
        await dbContext.SaveChangesAsync(cancellationToken);

        var winningNumbers = round.GetWinningNumbers();
        var tickets = await dbContext.Tickets
            .Where(ticket => ticket.RoundId == round.RoundNumber)
            .ToListAsync(cancellationToken);

        foreach (var ticket in tickets)
        {
            ticket.DrawStatus = HasSameNumbers(ticket.GetNumbers(), winningNumbers)
                ? DrawStatus.Winner
                : DrawStatus.Lose;
        }

        if (tickets.Count > 0)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        var response = new DrawResponse(
            round.Id,
            round.RoundNumber,
            winningNumbers,
            round.DrawnAt);
        var previousDraws = await dbContext.Rounds
            .AsNoTracking()
            .Where(previousRound => previousRound.Id != round.Id)
            .OrderByDescending(previousRound => previousRound.RoundNumber)
            .Select(previousRound => new DrawResponse(
                previousRound.Id,
                previousRound.RoundNumber,
                new[]
                {
                    previousRound.WinningNumber1,
                    previousRound.WinningNumber2,
                    previousRound.WinningNumber3,
                    previousRound.WinningNumber4,
                    previousRound.WinningNumber5,
                    previousRound.WinningNumber6,
                },
                previousRound.DrawnAt))
            .ToListAsync(cancellationToken);
        var broadcast = new DrawBroadcast(response, previousDraws);

        await BroadcastDrawAsync(drawSockets, broadcast, cancellationToken);

        return Results.Created($"/api/draws/{round.Id}", response);
    }
    catch (Exception exception) when (exception is SqlException || exception.InnerException is SqlException)
    {
        return Results.Problem(
            detail: "SQL Server is unavailable. Check the DefaultConnection value and make sure the database server is running.",
            statusCode: StatusCodes.Status503ServiceUnavailable,
            title: "Database unavailable");
    }
})
.WithName("CreateDraw")
.WithSummary("Creates a lottery draw and publishes it to WebSocket listeners.");

app.MapPost("/tickets", async (
    TicketRequest request,
    Lottery365DbContext dbContext,
    IConfiguration configuration,
    HttpContext httpContext,
    CancellationToken cancellationToken) =>
{
    if (!TryGetAuthenticatedUserId(httpContext, configuration, out var userId))
    {
        return Results.Unauthorized();
    }

    var validationErrors = ValidateDrawRequest(new DrawRequest(request.Numbers));

    if (validationErrors.Count > 0)
    {
        return Results.ValidationProblem(validationErrors);
    }

    try
    {
        await dbContext.Database.MigrateAsync(cancellationToken);

        var nextRoundId = (await dbContext.Rounds
            .Select(round => (int?)round.RoundNumber)
            .MaxAsync(cancellationToken) ?? 0) + 1;

        var ticket = new Ticket
        {
            UserId = userId,
            RoundId = nextRoundId,
            Number1 = request.Numbers[0],
            Number2 = request.Numbers[1],
            Number3 = request.Numbers[2],
            Number4 = request.Numbers[3],
            Number5 = request.Numbers[4],
            Number6 = request.Numbers[5],
            DrawStatus = DrawStatus.Loading,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        dbContext.Tickets.Add(ticket);
        await dbContext.SaveChangesAsync(cancellationToken);

        var response = new TicketResponse(
            ticket.Id,
            ticket.UserId,
            ticket.RoundId,
            ticket.GetNumbers(),
            ticket.DrawStatus.ToString(),
            ticket.CreatedAt);

        return Results.Created($"/tickets/{ticket.Id}", response);
    }
    catch (Exception exception) when (exception is SqlException || exception.InnerException is SqlException)
    {
        return Results.Problem(
            detail: "SQL Server is unavailable. Check the DefaultConnection value and make sure the database server is running.",
            statusCode: StatusCodes.Status503ServiceUnavailable,
            title: "Database unavailable");
    }
})
.WithName("CreateTicket")
.WithSummary("Creates a ticket for the next lottery round.");

app.MapGet("/api/me", async (
    Lottery365DbContext dbContext,
    IConfiguration configuration,
    HttpContext httpContext,
    CancellationToken cancellationToken) =>
{
    if (!TryGetAuthenticatedUserId(httpContext, configuration, out var userId))
    {
        return Results.Unauthorized();
    }

    try
    {
        await dbContext.Database.MigrateAsync(cancellationToken);

        var user = await dbContext.Users
            .AsNoTracking()
            .SingleOrDefaultAsync(currentUser => currentUser.Id == userId, cancellationToken);

        if (user is null)
        {
            return Results.NotFound();
        }

        return Results.Ok(new MeResponse(
            user.Id,
            user.FirstName,
            user.LastName,
            user.Email,
            user.Role.ToString(),
            user.CreatedAt));
    }
    catch (Exception exception) when (exception is SqlException || exception.InnerException is SqlException)
    {
        return Results.Problem(
            detail: "SQL Server is unavailable. Check the DefaultConnection value and make sure the database server is running.",
            statusCode: StatusCodes.Status503ServiceUnavailable,
            title: "Database unavailable");
    }
})
.WithName("GetMe")
.WithSummary("Gets the current logged-in user's profile.");

app.MapPut("/api/me", async (
    UpdateProfileRequest request,
    Lottery365DbContext dbContext,
    IConfiguration configuration,
    HttpContext httpContext,
    CancellationToken cancellationToken) =>
{
    if (!TryGetAuthenticatedUserId(httpContext, configuration, out var userId))
    {
        return Results.Unauthorized();
    }

    var validationErrors = ValidateUpdateProfileRequest(request);

    if (validationErrors.Count > 0)
    {
        return Results.ValidationProblem(validationErrors);
    }

    try
    {
        await dbContext.Database.MigrateAsync(cancellationToken);

        var user = await dbContext.Users
            .SingleOrDefaultAsync(currentUser => currentUser.Id == userId, cancellationToken);

        if (user is null)
        {
            return Results.NotFound();
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var emailExists = await dbContext.Users
            .AnyAsync(currentUser => currentUser.Id != userId && currentUser.NormalizedEmail == normalizedEmail, cancellationToken);

        if (emailExists)
        {
            return Results.Conflict(new { message = "A user with this email already exists." });
        }

        user.FirstName = request.Name.Trim();
        user.LastName = request.Lastname.Trim();
        user.Email = request.Email.Trim();
        user.NormalizedEmail = normalizedEmail;
        user.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Results.Ok(new MeResponse(
            user.Id,
            user.FirstName,
            user.LastName,
            user.Email,
            user.Role.ToString(),
            user.CreatedAt));
    }
    catch (Exception exception) when (exception is SqlException || exception.InnerException is SqlException)
    {
        return Results.Problem(
            detail: "SQL Server is unavailable. Check the DefaultConnection value and make sure the database server is running.",
            statusCode: StatusCodes.Status503ServiceUnavailable,
            title: "Database unavailable");
    }
})
.WithName("UpdateMe")
.WithSummary("Updates the current logged-in user's profile.");

app.MapGet("/api/users", async (
    Lottery365DbContext dbContext,
    IConfiguration configuration,
    HttpContext httpContext,
    CancellationToken cancellationToken) =>
{
    if (!IsAdminRequest(httpContext, configuration))
    {
        return Results.StatusCode(StatusCodes.Status403Forbidden);
    }

    try
    {
        await dbContext.Database.MigrateAsync(cancellationToken);

        var players = await dbContext.Users
            .AsNoTracking()
            .Where(user => user.Role == UserRole.Player)
            .OrderBy(user => user.FirstName)
            .ThenBy(user => user.LastName)
            .Select(user => new PlayerUserResponse(
                user.FirstName,
                user.LastName,
                user.Email,
                user.CreatedAt))
            .ToListAsync(cancellationToken);

        return Results.Ok(players);
    }
    catch (Exception exception) when (exception is SqlException || exception.InnerException is SqlException)
    {
        return Results.Problem(
            detail: "SQL Server is unavailable. Check the DefaultConnection value and make sure the database server is running.",
            statusCode: StatusCodes.Status503ServiceUnavailable,
            title: "Database unavailable");
    }
})
.WithName("GetUsers")
.WithSummary("Gets all player users.");

app.MapGet("/api/tickets", async (
    Lottery365DbContext dbContext,
    IConfiguration configuration,
    HttpContext httpContext,
    CancellationToken cancellationToken) =>
{
    if (!TryGetAuthenticatedUserId(httpContext, configuration, out var userId))
    {
        return Results.Unauthorized();
    }

    try
    {
        await dbContext.Database.MigrateAsync(cancellationToken);

        var tickets = await (
            from ticket in dbContext.Tickets.AsNoTracking()
            join round in dbContext.Rounds.AsNoTracking()
                on ticket.RoundId equals round.RoundNumber into ticketRound
            from round in ticketRound.DefaultIfEmpty()
            where ticket.UserId == userId
            orderby ticket.CreatedAt descending
            select new
            {
                ticket.Id,
                ticket.RoundId,
                ticket.Number1,
                ticket.Number2,
                ticket.Number3,
                ticket.Number4,
                ticket.Number5,
                ticket.Number6,
                ticket.DrawStatus,
                ticket.CreatedAt,
                DrawNumber1 = round == null ? (int?)null : round.WinningNumber1,
                DrawNumber2 = round == null ? (int?)null : round.WinningNumber2,
                DrawNumber3 = round == null ? (int?)null : round.WinningNumber3,
                DrawNumber4 = round == null ? (int?)null : round.WinningNumber4,
                DrawNumber5 = round == null ? (int?)null : round.WinningNumber5,
                DrawNumber6 = round == null ? (int?)null : round.WinningNumber6,
            })
            .ToListAsync(cancellationToken);
        var response = tickets.Select(ticket =>
        {
            var ticketNumbers = new[]
            {
                ticket.Number1,
                ticket.Number2,
                ticket.Number3,
                ticket.Number4,
                ticket.Number5,
                ticket.Number6,
            };
            var drawNumbers = ticket.DrawNumber1.HasValue
                ? new[]
                {
                    ticket.DrawNumber1.Value,
                    ticket.DrawNumber2!.Value,
                    ticket.DrawNumber3!.Value,
                    ticket.DrawNumber4!.Value,
                    ticket.DrawNumber5!.Value,
                    ticket.DrawNumber6!.Value,
                }
                : null;
            var drawStatus = drawNumbers is null
                ? ticket.DrawStatus
                : HasSameNumbers(ticketNumbers, drawNumbers)
                    ? DrawStatus.Winner
                    : DrawStatus.Lose;

            return new TicketHistoryResponse(
                ticket.Id,
                ticket.RoundId,
                ticketNumbers,
                drawNumbers,
                drawStatus.ToString(),
                ticket.CreatedAt);
        });

        return Results.Ok(response);
    }
    catch (Exception exception) when (exception is SqlException || exception.InnerException is SqlException)
    {
        return Results.Problem(
            detail: "SQL Server is unavailable. Check the DefaultConnection value and make sure the database server is running.",
            statusCode: StatusCodes.Status503ServiceUnavailable,
            title: "Database unavailable");
    }
})
.WithName("GetTickets")
.WithSummary("Gets current user's ticket history with draw numbers when available.");

app.MapGet("/api/tickets/drawn", async (
    Lottery365DbContext dbContext,
    IConfiguration configuration,
    HttpContext httpContext,
    CancellationToken cancellationToken) =>
{
    if (!TryGetAuthenticatedUserId(httpContext, configuration, out _))
    {
        return Results.Unauthorized();
    }

    try
    {
        await dbContext.Database.MigrateAsync(cancellationToken);

        var rounds = await dbContext.Rounds
            .AsNoTracking()
            .OrderByDescending(round => round.RoundNumber)
            .Select(round => new
            {
                round.Id,
                round.RoundNumber,
                round.WinningNumber1,
                round.WinningNumber2,
                round.WinningNumber3,
                round.WinningNumber4,
                round.WinningNumber5,
                round.WinningNumber6,
                round.DrawnAt,
            })
            .ToListAsync(cancellationToken);

        var winners = await (
            from ticket in dbContext.Tickets.AsNoTracking()
            join user in dbContext.Users.AsNoTracking()
                on ticket.UserId equals user.Id
            where ticket.DrawStatus == DrawStatus.Winner
            orderby user.FirstName, user.LastName
            select new
            {
                ticket.RoundId,
                TicketId = ticket.Id,
                UserId = user.Id,
                user.FirstName,
                user.LastName,
                user.Email,
            })
            .ToListAsync(cancellationToken);

        var winnersByRound = winners
            .GroupBy(winner => winner.RoundId)
            .ToDictionary(
                group => group.Key,
                group => group
                    .Select(winner => new DrawWinnerResponse(
                        winner.TicketId,
                        winner.UserId,
                        winner.FirstName,
                        winner.LastName,
                        winner.Email))
                    .ToArray());

        var response = rounds.Select(round => new DrawnTicketResponse(
            round.Id,
            round.RoundNumber,
            [
                round.WinningNumber1,
                round.WinningNumber2,
                round.WinningNumber3,
                round.WinningNumber4,
                round.WinningNumber5,
                round.WinningNumber6,
            ],
            winnersByRound.GetValueOrDefault(round.RoundNumber, []),
            round.DrawnAt));

        return Results.Ok(response);
    }
    catch (Exception exception) when (exception is SqlException || exception.InnerException is SqlException)
    {
        return Results.Problem(
            detail: "SQL Server is unavailable. Check the DefaultConnection value and make sure the database server is running.",
            statusCode: StatusCodes.Status503ServiceUnavailable,
            title: "Database unavailable");
    }
})
.WithName("GetDrawnTickets")
.WithSummary("Gets tickets from completed draws with player details and winner status.");

app.Run();

static Dictionary<string, string[]> ValidateCreateUserRequest(CreateUserRequest request)
{
    var errors = new Dictionary<string, string[]>();

    AddRequiredError(errors, nameof(request.Name), request.Name);
    AddRequiredError(errors, nameof(request.Lastname), request.Lastname);
    AddRequiredError(errors, nameof(request.Email), request.Email);
    AddRequiredError(errors, nameof(request.Password), request.Password);
    AddRequiredError(errors, nameof(request.ConfirmPassword), request.ConfirmPassword);

    if (!string.IsNullOrWhiteSpace(request.Email) && !new EmailAddressAttribute().IsValid(request.Email))
    {
        errors[nameof(request.Email)] = ["Email must be a valid email address."];
    }

    if (!string.IsNullOrWhiteSpace(request.Password) && request.Password.Length < 8)
    {
        errors[nameof(request.Password)] = ["Password must contain at least 8 characters."];
    }

    if (request.Password != request.ConfirmPassword)
    {
        errors[nameof(request.ConfirmPassword)] = ["Password confirmation must match password."];
    }

    return errors;
}

static void AddRequiredError(Dictionary<string, string[]> errors, string fieldName, string? value)
{
    if (string.IsNullOrWhiteSpace(value))
    {
        errors[fieldName] = [$"{fieldName} is required."];
    }
}

static Dictionary<string, string[]> ValidateLoginRequest(LoginRequest request)
{
    var errors = new Dictionary<string, string[]>();

    AddRequiredError(errors, nameof(request.Email), request.Email);
    AddRequiredError(errors, nameof(request.Password), request.Password);

    if (!string.IsNullOrWhiteSpace(request.Email) && !new EmailAddressAttribute().IsValid(request.Email))
    {
        errors[nameof(request.Email)] = ["Email must be a valid email address."];
    }

    return errors;
}

static Dictionary<string, string[]> ValidateDrawRequest(DrawRequest request)
{
    var errors = new Dictionary<string, string[]>();

    if (request.Numbers.Length != 6)
    {
        errors[nameof(request.Numbers)] = ["Exactly 6 draw numbers are required."];
        return errors;
    }

    if (request.Numbers.Any(number => number is < 1 or > 49))
    {
        errors[nameof(request.Numbers)] = ["Draw numbers must be between 1 and 49."];
    }

    if (request.Numbers.Distinct().Count() != 6)
    {
        errors[nameof(request.Numbers)] = ["Draw numbers must be unique."];
    }

    return errors;
}

static Dictionary<string, string[]> ValidateUpdateProfileRequest(UpdateProfileRequest request)
{
    var errors = new Dictionary<string, string[]>();

    AddRequiredError(errors, nameof(request.Name), request.Name);
    AddRequiredError(errors, nameof(request.Lastname), request.Lastname);
    AddRequiredError(errors, nameof(request.Email), request.Email);

    if (!string.IsNullOrWhiteSpace(request.Email) && !new EmailAddressAttribute().IsValid(request.Email))
    {
        errors[nameof(request.Email)] = ["Email must be a valid email address."];
    }

    return errors;
}

static bool HasSameNumbers(int[] ticketNumbers, int[] winningNumbers)
{
    return ticketNumbers.Order().SequenceEqual(winningNumbers.Order());
}

static string CreateJwt(User user, IConfiguration configuration, DateTimeOffset expiresAt)
{
    var secret = configuration["Jwt:Secret"];

    if (string.IsNullOrWhiteSpace(secret) || Encoding.UTF8.GetByteCount(secret) < 32)
    {
        throw new InvalidOperationException("Jwt:Secret must be configured and contain at least 32 bytes.");
    }

    var issuer = configuration["Jwt:Issuer"] ?? "Lottery365.Api";
    var audience = configuration["Jwt:Audience"] ?? "Lottery365.Frontend";
    var now = DateTimeOffset.UtcNow;
    var header = new Dictionary<string, object>
    {
        ["alg"] = "HS256",
        ["typ"] = "JWT",
    };
    var payload = new Dictionary<string, object>
    {
        ["sub"] = user.Id.ToString(),
        ["email"] = user.Email,
        ["name"] = $"{user.FirstName} {user.LastName}",
        ["role"] = user.Role.ToString(),
        ["iss"] = issuer,
        ["aud"] = audience,
        ["iat"] = now.ToUnixTimeSeconds(),
        ["nbf"] = now.ToUnixTimeSeconds(),
        ["exp"] = expiresAt.ToUnixTimeSeconds(),
    };

    var encodedHeader = Base64UrlEncode(JsonSerializer.SerializeToUtf8Bytes(header));
    var encodedPayload = Base64UrlEncode(JsonSerializer.SerializeToUtf8Bytes(payload));
    var unsignedToken = $"{encodedHeader}.{encodedPayload}";
    var signature = HMACSHA256.HashData(
        Encoding.UTF8.GetBytes(secret),
        Encoding.UTF8.GetBytes(unsignedToken));

    return $"{unsignedToken}.{Base64UrlEncode(signature)}";
}

static string Base64UrlEncode(byte[] bytes)
{
    return Convert.ToBase64String(bytes)
        .TrimEnd('=')
        .Replace('+', '-')
        .Replace('/', '_');
}

static byte[] Base64UrlDecode(string value)
{
    var paddedValue = value.Replace('-', '+').Replace('_', '/');
    paddedValue = paddedValue.PadRight(paddedValue.Length + (4 - paddedValue.Length % 4) % 4, '=');

    return Convert.FromBase64String(paddedValue);
}

static bool IsAdminRequest(HttpContext httpContext, IConfiguration configuration)
{
    if (!TryGetJwtPayload(httpContext, configuration, out var root))
    {
        return false;
    }

    using (root)
    {
        var payload = root.RootElement;

        if (!payload.TryGetProperty("role", out var role) || role.GetString() != UserRole.Admin.ToString())
        {
            return false;
        }

        return payload.TryGetProperty("exp", out var expiresAt)
            && expiresAt.GetInt64() > DateTimeOffset.UtcNow.ToUnixTimeSeconds();
    }
}

static bool TryGetAuthenticatedUserId(
    HttpContext httpContext,
    IConfiguration configuration,
    out Guid userId)
{
    userId = Guid.Empty;

    if (!TryGetJwtPayload(httpContext, configuration, out var root))
    {
        return false;
    }

    using (root)
    {
        var payload = root.RootElement;

        if (!payload.TryGetProperty("exp", out var expiresAt)
            || expiresAt.GetInt64() <= DateTimeOffset.UtcNow.ToUnixTimeSeconds())
        {
            return false;
        }

        return payload.TryGetProperty("sub", out var subject)
            && Guid.TryParse(subject.GetString(), out userId);
    }
}

static bool TryGetJwtPayload(
    HttpContext httpContext,
    IConfiguration configuration,
    out JsonDocument payload)
{
    payload = JsonDocument.Parse("{}");

    try
    {
        var authorizationHeader = httpContext.Request.Headers.Authorization.ToString();

        if (!authorizationHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var token = authorizationHeader["Bearer ".Length..].Trim();
        var parts = token.Split('.');

        if (parts.Length != 3)
        {
            return false;
        }

        var secret = configuration["Jwt:Secret"];

        if (string.IsNullOrWhiteSpace(secret))
        {
            return false;
        }

        var unsignedToken = $"{parts[0]}.{parts[1]}";
        var expectedSignature = HMACSHA256.HashData(
            Encoding.UTF8.GetBytes(secret),
            Encoding.UTF8.GetBytes(unsignedToken));
        var actualSignature = Base64UrlDecode(parts[2]);

        if (!CryptographicOperations.FixedTimeEquals(expectedSignature, actualSignature))
        {
            return false;
        }

        payload.Dispose();
        payload = JsonDocument.Parse(Base64UrlDecode(parts[1]));

        return true;
    }
    catch (Exception exception) when (
        exception is FormatException ||
        exception is JsonException ||
        exception is ArgumentException)
    {
        payload.Dispose();
        payload = JsonDocument.Parse("{}");

        return false;
    }
}

static async Task ReceiveUntilClosedAsync(WebSocket socket, CancellationToken cancellationToken)
{
    var buffer = new byte[1024 * 4];

    while (socket.State == WebSocketState.Open && !cancellationToken.IsCancellationRequested)
    {
        var result = await socket.ReceiveAsync(buffer, cancellationToken);

        if (result.MessageType == WebSocketMessageType.Close)
        {
            await socket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Closed by client", cancellationToken);
        }
    }
}

static async Task BroadcastDrawAsync(
    ConcurrentDictionary<Guid, WebSocket> sockets,
    DrawBroadcast draw,
    CancellationToken cancellationToken)
{
    var payload = JsonSerializer.SerializeToUtf8Bytes(new
    {
        @event = "admin-draw",
        data = draw,
    });

    foreach (var (socketId, socket) in sockets)
    {
        if (socket.State != WebSocketState.Open)
        {
            sockets.TryRemove(socketId, out _);
            continue;
        }

        await socket.SendAsync(payload, WebSocketMessageType.Text, true, cancellationToken);
    }
}

public sealed record CreateUserRequest(
    string Name,
    string Lastname,
    string Email,
    string Password,
    string ConfirmPassword);

public sealed record UpdateProfileRequest(string Name, string Lastname, string Email);

public sealed record LoginRequest(string Email, string Password);

public sealed record DrawRequest(int[] Numbers);

public sealed record TicketRequest(int[] Numbers);

public sealed record DrawResponse(
    Guid Id,
    int RoundNumber,
    int[] Numbers,
    DateTimeOffset DrawnAt);

public sealed record TicketResponse(
    Guid Id,
    Guid UserId,
    int RoundId,
    int[] Numbers,
    string DrawStatus,
    DateTimeOffset CreatedAt);

public sealed record MeResponse(
    Guid Id,
    string Name,
    string Lastname,
    string Email,
    string Role,
    DateTimeOffset CreatedAt);

public sealed record TicketHistoryResponse(
    Guid Id,
    int RoundId,
    int[] Numbers,
    int[]? DrawNumbers,
    string DrawStatus,
    DateTimeOffset CreatedAt);

public sealed record DrawnTicketResponse(
    Guid WheelId,
    int WheelNumber,
    int[] DrawNumbers,
    IReadOnlyCollection<DrawWinnerResponse> Winners,
    DateTimeOffset DrawnAt);

public sealed record DrawWinnerResponse(
    Guid TicketId,
    Guid UserId,
    string Name,
    string Lastname,
    string Email);

public sealed record PlayerUserResponse(
    string Name,
    string Lastname,
    string Email,
    DateTimeOffset CreatedAt);

public sealed record DrawBroadcast(
    DrawResponse CurrentDraw,
    IReadOnlyCollection<DrawResponse> PreviousDraws);

public sealed record LoginResponse(
    string AccessToken,
    string TokenType,
    DateTimeOffset ExpiresAt,
    UserResponse User);

public sealed record UserResponse(
    Guid Id,
    string Name,
    string Lastname,
    string Email,
    string Role,
    DateTimeOffset CreatedAt);
