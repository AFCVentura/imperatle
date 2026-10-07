using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Imperatle.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPlayerProgressDateIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_PlayerChallengeProgress_Date",
                table: "PlayerChallengeProgress",
                column: "Date");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_PlayerChallengeProgress_Date",
                table: "PlayerChallengeProgress");
        }
    }
}
