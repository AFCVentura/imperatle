using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Imperatle.Api.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceMapImageWithShape : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MapAuthor",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "MapFile",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "MapLicense",
                table: "Empires");

            // Dropped and added rather than renamed: an old image URL must
            // never be read as a shape. The importer fills it on startup.
            migrationBuilder.DropColumn(
                name: "MapSourceUrl",
                table: "Empires");

            migrationBuilder.AddColumn<string>(
                name: "MapShape",
                table: "Empires",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MapShape",
                table: "Empires");

            migrationBuilder.AddColumn<string>(
                name: "MapSourceUrl",
                table: "Empires",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MapAuthor",
                table: "Empires",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MapFile",
                table: "Empires",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MapLicense",
                table: "Empires",
                type: "text",
                nullable: true);
        }
    }
}
