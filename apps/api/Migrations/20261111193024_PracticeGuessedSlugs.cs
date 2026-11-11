using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Imperatle.Api.Migrations
{
    // Practice rounds remember the empires guessed (like the daily game's
    // progress), so only those shapes can be outlined over the round's map.
    // Rounds already in the table start with none.
    /// <inheritdoc />
    public partial class PracticeGuessedSlugs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<List<string>>(
                name: "GuessedSlugs",
                table: "PracticeSessions",
                type: "text[]",
                nullable: false,
                defaultValueSql: "'{}'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GuessedSlugs",
                table: "PracticeSessions");
        }
    }
}
