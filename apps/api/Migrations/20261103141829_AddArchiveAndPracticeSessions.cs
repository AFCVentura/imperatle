using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Imperatle.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddArchiveAndPracticeSessions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "FromArchive",
                table: "PlayerChallengeProgress",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "PracticeSessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    AnonymousId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    EmpireId = table.Column<int>(type: "integer", nullable: false),
                    Difficulty = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Era = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    Continent = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    AttemptsAllowed = table.Column<int>(type: "integer", nullable: false),
                    HintsEnabled = table.Column<bool>(type: "boolean", nullable: false),
                    MapMode = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    AttemptsUsed = table.Column<int>(type: "integer", nullable: false),
                    Completed = table.Column<bool>(type: "boolean", nullable: false),
                    Correct = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CompletedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PracticeSessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PracticeSessions_Empires_EmpireId",
                        column: x => x.EmpireId,
                        principalTable: "Empires",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PracticeSessions_AnonymousId_CreatedAtUtc",
                table: "PracticeSessions",
                columns: new[] { "AnonymousId", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_PracticeSessions_EmpireId",
                table: "PracticeSessions",
                column: "EmpireId");

            migrationBuilder.CreateIndex(
                name: "IX_PracticeSessions_UserId_CreatedAtUtc",
                table: "PracticeSessions",
                columns: new[] { "UserId", "CreatedAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PracticeSessions");

            migrationBuilder.DropColumn(
                name: "FromArchive",
                table: "PlayerChallengeProgress");
        }
    }
}
