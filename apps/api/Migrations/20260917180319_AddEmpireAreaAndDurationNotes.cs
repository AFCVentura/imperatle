using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Imperatle.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddEmpireAreaAndDurationNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AreaPrecision",
                table: "Empires",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "DurationNotesEn",
                table: "Empires",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DurationNotesPt",
                table: "Empires",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "PeakAreaKm2",
                table: "Empires",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AreaPrecision",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "DurationNotesEn",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "DurationNotesPt",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "PeakAreaKm2",
                table: "Empires");
        }
    }
}
