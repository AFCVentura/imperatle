using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Imperatle.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddWikipediaLinks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "WikipediaEn",
                table: "Empires",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "WikipediaPt",
                table: "Empires",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WikipediaEn",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "WikipediaPt",
                table: "Empires");
        }
    }
}
