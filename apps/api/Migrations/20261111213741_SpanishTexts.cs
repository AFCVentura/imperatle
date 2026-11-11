using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Imperatle.Api.Migrations
{
    /// <inheritdoc />
    public partial class SpanishTexts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CapitalEs",
                table: "Empires",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DurationNotesEs",
                table: "Empires",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "LanguageEs",
                table: "Empires",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "NameEs",
                table: "Empires",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ReligionEs",
                table: "Empires",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ReligionNotesEs",
                table: "Empires",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SummaryEs",
                table: "Empires",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "WikipediaEs",
                table: "Empires",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DetailsEs",
                table: "EmpireHints",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "TextEs",
                table: "EmpireHints",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CapitalEs",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "DurationNotesEs",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "LanguageEs",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "NameEs",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "ReligionEs",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "ReligionNotesEs",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "SummaryEs",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "WikipediaEs",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "DetailsEs",
                table: "EmpireHints");

            migrationBuilder.DropColumn(
                name: "TextEs",
                table: "EmpireHints");
        }
    }
}
