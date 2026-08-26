using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Imperatle.Api.Migrations
{
    /// <inheritdoc />
    public partial class ExpandEmpireHintFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "YearPrecision",
                table: "Empires",
                newName: "ReferenceYearPrecision");

            migrationBuilder.AddColumn<int>(
                name: "StartYearPrecision",
                table: "Empires",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "CapitalEn",
                table: "Empires",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "CapitalPt",
                table: "Empires",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int[]>(
                name: "Continents",
                table: "Empires",
                type: "integer[]",
                nullable: false,
                defaultValue: new int[0]);

            migrationBuilder.AddColumn<int>(
                name: "EndYear",
                table: "Empires",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "EndYearPrecision",
                table: "Empires",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "LanguageEn",
                table: "Empires",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "LanguagePt",
                table: "Empires",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "MapBorderConfidence",
                table: "Empires",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "PrimaryContinent",
                table: "Empires",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "ReligionEn",
                table: "Empires",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ReligionPt",
                table: "Empires",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "StartYear",
                table: "Empires",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "SubEraEn",
                table: "Empires",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SubEraPt",
                table: "Empires",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CapitalEn",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "CapitalPt",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "Continents",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "EndYear",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "EndYearPrecision",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "LanguageEn",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "LanguagePt",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "MapBorderConfidence",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "PrimaryContinent",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "ReligionEn",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "ReligionPt",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "StartYear",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "StartYearPrecision",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "SubEraEn",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "SubEraPt",
                table: "Empires");

            migrationBuilder.RenameColumn(
                name: "ReferenceYearPrecision",
                table: "Empires",
                newName: "YearPrecision");
        }
    }
}
