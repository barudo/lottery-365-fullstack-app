using System;
using Lottery365.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Lottery365.Api.Migrations;

[DbContext(typeof(Lottery365DbContext))]
[Migration("20260507000000_CreateAdminUser")]
public partial class CreateAdminUser : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Users",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                FirstName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                LastName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                NormalizedEmail = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                PasswordHash = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                Role = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Users", x => x.Id);
            });

        migrationBuilder.CreateIndex(
            name: "IX_Users_NormalizedEmail",
            table: "Users",
            column: "NormalizedEmail",
            unique: true);

        migrationBuilder.Sql("""
            IF NOT EXISTS (
                SELECT 1
                FROM [Users]
                WHERE [NormalizedEmail] = N'admin@lottery365.local'
            )
            BEGIN
                INSERT INTO [Users] (
                    [Id],
                    [FirstName],
                    [LastName],
                    [Email],
                    [NormalizedEmail],
                    [PasswordHash],
                    [Role],
                    [CreatedAt],
                    [UpdatedAt]
                )
                VALUES (
                    '11111111-1111-1111-1111-111111111111',
                    N'Admin',
                    N'User',
                    N'admin@lottery365.local',
                    N'admin@lottery365.local',
                    N'pbkdf2-sha256.100000.TG90dGVyeTM2NUFkbWluMQ==.4mMTyGarreqdaDTEYv/uJzd7u5nrc3xq8vnwFSGmItk=',
                    N'Admin',
                    SYSDATETIMEOFFSET(),
                    SYSDATETIMEOFFSET()
                );
            END
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "Users");
    }
}
