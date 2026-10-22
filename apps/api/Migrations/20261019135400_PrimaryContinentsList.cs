using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Imperatle.Api.Migrations
{
    /// <inheritdoc />
    public partial class PrimaryContinentsList : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int[]>(
                name: "PrimaryContinents",
                table: "Empires",
                type: "integer[]",
                nullable: false,
                defaultValue: new int[0]);

            // Keeps the current value for inactive empires too, which the
            // content import on startup no longer touches.
            migrationBuilder.Sql("""UPDATE "Empires" SET "PrimaryContinents" = ARRAY["PrimaryContinent"];""");

            migrationBuilder.DropColumn(
                name: "PrimaryContinent",
                table: "Empires");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "PrimaryContinent",
                table: "Empires",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.Sql("""UPDATE "Empires" SET "PrimaryContinent" = COALESCE("PrimaryContinents"[1], 0);""");

            migrationBuilder.DropColumn(
                name: "PrimaryContinents",
                table: "Empires");
        }
    }
}
