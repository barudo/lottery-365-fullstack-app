using System;
using Lottery365.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Lottery365.Api.Migrations;

[DbContext(typeof(Lottery365DbContext))]
[Migration("20260507001000_CreateTicketsAndRounds")]
public partial class CreateTicketsAndRounds : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Rounds",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                RoundNumber = table.Column<int>(type: "int", nullable: false),
                WinningNumber1 = table.Column<int>(type: "int", nullable: false),
                WinningNumber2 = table.Column<int>(type: "int", nullable: false),
                WinningNumber3 = table.Column<int>(type: "int", nullable: false),
                WinningNumber4 = table.Column<int>(type: "int", nullable: false),
                WinningNumber5 = table.Column<int>(type: "int", nullable: false),
                WinningNumber6 = table.Column<int>(type: "int", nullable: false),
                DrawnAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Rounds", x => x.Id);
                table.CheckConstraint(
                    "CK_Rounds_WinningNumbers_AreInRange",
                    "[WinningNumber1] BETWEEN 1 AND 49 AND [WinningNumber2] BETWEEN 1 AND 49 AND [WinningNumber3] BETWEEN 1 AND 49 AND [WinningNumber4] BETWEEN 1 AND 49 AND [WinningNumber5] BETWEEN 1 AND 49 AND [WinningNumber6] BETWEEN 1 AND 49");
                table.CheckConstraint(
                    "CK_Rounds_WinningNumbers_AreUnique",
                    "[WinningNumber1] <> [WinningNumber2] AND [WinningNumber1] <> [WinningNumber3] AND [WinningNumber1] <> [WinningNumber4] AND [WinningNumber1] <> [WinningNumber5] AND [WinningNumber1] <> [WinningNumber6] AND [WinningNumber2] <> [WinningNumber3] AND [WinningNumber2] <> [WinningNumber4] AND [WinningNumber2] <> [WinningNumber5] AND [WinningNumber2] <> [WinningNumber6] AND [WinningNumber3] <> [WinningNumber4] AND [WinningNumber3] <> [WinningNumber5] AND [WinningNumber3] <> [WinningNumber6] AND [WinningNumber4] <> [WinningNumber5] AND [WinningNumber4] <> [WinningNumber6] AND [WinningNumber5] <> [WinningNumber6]");
            });

        migrationBuilder.CreateTable(
            name: "Tickets",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                RoundId = table.Column<int>(type: "int", nullable: false),
                Number1 = table.Column<int>(type: "int", nullable: false),
                Number2 = table.Column<int>(type: "int", nullable: false),
                Number3 = table.Column<int>(type: "int", nullable: false),
                Number4 = table.Column<int>(type: "int", nullable: false),
                Number5 = table.Column<int>(type: "int", nullable: false),
                Number6 = table.Column<int>(type: "int", nullable: false),
                CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Tickets", x => x.Id);
                table.CheckConstraint(
                    "CK_Tickets_Numbers_AreInRange",
                    "[Number1] BETWEEN 1 AND 49 AND [Number2] BETWEEN 1 AND 49 AND [Number3] BETWEEN 1 AND 49 AND [Number4] BETWEEN 1 AND 49 AND [Number5] BETWEEN 1 AND 49 AND [Number6] BETWEEN 1 AND 49");
                table.CheckConstraint(
                    "CK_Tickets_Numbers_AreUnique",
                    "[Number1] <> [Number2] AND [Number1] <> [Number3] AND [Number1] <> [Number4] AND [Number1] <> [Number5] AND [Number1] <> [Number6] AND [Number2] <> [Number3] AND [Number2] <> [Number4] AND [Number2] <> [Number5] AND [Number2] <> [Number6] AND [Number3] <> [Number4] AND [Number3] <> [Number5] AND [Number3] <> [Number6] AND [Number4] <> [Number5] AND [Number4] <> [Number6] AND [Number5] <> [Number6]");
                table.ForeignKey(
                    name: "FK_Tickets_Users_UserId",
                    column: x => x.UserId,
                    principalTable: "Users",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_Rounds_RoundNumber",
            table: "Rounds",
            column: "RoundNumber",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_Tickets_RoundId",
            table: "Tickets",
            column: "RoundId");

        migrationBuilder.CreateIndex(
            name: "IX_Tickets_UserId",
            table: "Tickets",
            column: "UserId");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "Tickets");
        migrationBuilder.DropTable(name: "Rounds");
    }
}
