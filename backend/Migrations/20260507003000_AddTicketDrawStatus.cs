using Lottery365.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Lottery365.Api.Migrations;

[DbContext(typeof(Lottery365DbContext))]
[Migration("20260507003000_AddTicketDrawStatus")]
public partial class AddTicketDrawStatus : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "DrawStatus",
            table: "Tickets",
            type: "nvarchar(20)",
            maxLength: 20,
            nullable: false,
            defaultValue: "Loading");

        migrationBuilder.AddCheckConstraint(
            name: "CK_Tickets_DrawStatus",
            table: "Tickets",
            sql: "[DrawStatus] IN (N'Loading', N'Lose', N'Winner')");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropCheckConstraint(
            name: "CK_Tickets_DrawStatus",
            table: "Tickets");

        migrationBuilder.DropColumn(
            name: "DrawStatus",
            table: "Tickets");
    }
}
