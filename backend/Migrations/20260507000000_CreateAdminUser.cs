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
        migrationBuilder.Sql("""
            DELETE FROM [Users]
            WHERE [Id] = '11111111-1111-1111-1111-111111111111'
                AND [NormalizedEmail] = N'admin@lottery365.local';
            """);
    }
}
