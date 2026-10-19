using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Imperatle.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAliasesSummaryAndHintDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<List<string>>(
                name: "Aliases",
                table: "Empires",
                type: "text[]",
                nullable: false,
                // Existing rows start with no aliases (the importer fills them).
                defaultValueSql: "'{}'");

            migrationBuilder.AddColumn<string>(
                name: "SummaryEn",
                table: "Empires",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SummaryPt",
                table: "Empires",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DetailsEn",
                table: "EmpireHints",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DetailsPt",
                table: "EmpireHints",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Aliases",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "SummaryEn",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "SummaryPt",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "DetailsEn",
                table: "EmpireHints");

            migrationBuilder.DropColumn(
                name: "DetailsPt",
                table: "EmpireHints");
        }
    }
}
