using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Imperatle.Api.Migrations
{
    // Practice filters become multi-select: Era/Continent (one enum name or
    // null) turn into Eras/Continents (enum numbers, empty = any). The old
    // single choice is copied over before the old columns go, so no round
    // loses its options.
    /// <inheritdoc />
    public partial class PracticeMultipleErasAndContinents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int[]>(
                name: "Continents",
                table: "PracticeSessions",
                type: "integer[]",
                nullable: false,
                defaultValue: new int[0]);

            migrationBuilder.AddColumn<int[]>(
                name: "Eras",
                table: "PracticeSessions",
                type: "integer[]",
                nullable: false,
                defaultValue: new int[0]);

            // Numbers follow the C# enums (BroadEra, Continent).
            migrationBuilder.Sql("""
                UPDATE "PracticeSessions" SET "Eras" = ARRAY[CASE "Era"
                    WHEN 'Antiquity' THEN 0 WHEN 'MiddleAges' THEN 1
                    WHEN 'Modern' THEN 2 WHEN 'Contemporary' THEN 3 END]
                WHERE "Era" IS NOT NULL;
                UPDATE "PracticeSessions" SET "Continents" = ARRAY[CASE "Continent"
                    WHEN 'Africa' THEN 0 WHEN 'Asia' THEN 1 WHEN 'Europe' THEN 2
                    WHEN 'NorthAmerica' THEN 3 WHEN 'SouthAmerica' THEN 4 WHEN 'Oceania' THEN 5 END]
                WHERE "Continent" IS NOT NULL;
                """);

            migrationBuilder.DropColumn(
                name: "Continent",
                table: "PracticeSessions");

            migrationBuilder.DropColumn(
                name: "Era",
                table: "PracticeSessions");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Continent",
                table: "PracticeSessions",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Era",
                table: "PracticeSessions",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            // Only a single choice fits back: the first one is kept.
            migrationBuilder.Sql("""
                UPDATE "PracticeSessions" SET "Era" = (ARRAY['Antiquity','MiddleAges','Modern','Contemporary'])["Eras"[1] + 1]
                WHERE cardinality("Eras") > 0;
                UPDATE "PracticeSessions" SET "Continent" = (ARRAY['Africa','Asia','Europe','NorthAmerica','SouthAmerica','Oceania'])["Continents"[1] + 1]
                WHERE cardinality("Continents") > 0;
                """);

            migrationBuilder.DropColumn(
                name: "Continents",
                table: "PracticeSessions");

            migrationBuilder.DropColumn(
                name: "Eras",
                table: "PracticeSessions");
        }
    }
}
