using Lottery365.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Lottery365.Api.Migrations;

[DbContext(typeof(Lottery365DbContext))]
[Migration("20260507002000_ChangeTicketRoundIdToRoundNumber")]
public partial class ChangeTicketRoundIdToRoundNumber : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            IF EXISTS (
                SELECT 1
                FROM sys.foreign_keys
                WHERE name = N'FK_Tickets_Rounds_RoundId'
            )
            BEGIN
                ALTER TABLE [Tickets] DROP CONSTRAINT [FK_Tickets_Rounds_RoundId];
            END

            IF EXISTS (
                SELECT 1
                FROM sys.indexes
                WHERE name = N'IX_Tickets_RoundId'
                    AND object_id = OBJECT_ID(N'[Tickets]')
            )
            BEGIN
                DROP INDEX [IX_Tickets_RoundId] ON [Tickets];
            END

            IF EXISTS (
                SELECT 1
                FROM sys.columns
                WHERE object_id = OBJECT_ID(N'[Tickets]')
                    AND name = N'RoundId'
                    AND system_type_id = TYPE_ID(N'uniqueidentifier')
            )
            BEGIN
                ALTER TABLE [Tickets] DROP COLUMN [RoundId];
                ALTER TABLE [Tickets] ADD [RoundId] int NOT NULL CONSTRAINT [DF_Tickets_RoundId] DEFAULT 1;
                ALTER TABLE [Tickets] DROP CONSTRAINT [DF_Tickets_RoundId];
            END

            IF NOT EXISTS (
                SELECT 1
                FROM sys.indexes
                WHERE name = N'IX_Tickets_RoundId'
                    AND object_id = OBJECT_ID(N'[Tickets]')
            )
            BEGIN
                CREATE INDEX [IX_Tickets_RoundId] ON [Tickets] ([RoundId]);
            END
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            IF EXISTS (
                SELECT 1
                FROM sys.indexes
                WHERE name = N'IX_Tickets_RoundId'
                    AND object_id = OBJECT_ID(N'[Tickets]')
            )
            BEGIN
                DROP INDEX [IX_Tickets_RoundId] ON [Tickets];
            END

            IF EXISTS (
                SELECT 1
                FROM sys.columns
                WHERE object_id = OBJECT_ID(N'[Tickets]')
                    AND name = N'RoundId'
                    AND system_type_id = TYPE_ID(N'int')
            )
            BEGIN
                ALTER TABLE [Tickets] DROP COLUMN [RoundId];
                ALTER TABLE [Tickets] ADD [RoundId] uniqueidentifier NULL;
            END

            CREATE INDEX [IX_Tickets_RoundId] ON [Tickets] ([RoundId]);

            ALTER TABLE [Tickets] ADD CONSTRAINT [FK_Tickets_Rounds_RoundId]
                FOREIGN KEY ([RoundId]) REFERENCES [Rounds] ([Id])
                ON DELETE SET NULL;
            """);
    }
}
