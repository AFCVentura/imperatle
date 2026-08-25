using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Imperatle.Api.Migrations
{
    /// <inheritdoc />
    public partial class ExpandEmpireDomain : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Name",
                table: "Empires",
                newName: "Slug");

            migrationBuilder.AddColumn<string>(
                name: "NameEn",
                table: "Empires",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "NamePt",
                table: "Empires",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "ReferenceYear",
                table: "Empires",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "YearPrecision",
                table: "Empires",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "EmpireHints",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    EmpireId = table.Column<int>(type: "integer", nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    TextEn = table.Column<string>(type: "text", nullable: false),
                    TextPt = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EmpireHints", x => x.Id);
                    table.ForeignKey(
                        name: "FK_EmpireHints_Empires_EmpireId",
                        column: x => x.EmpireId,
                        principalTable: "Empires",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Empires_Slug",
                table: "Empires",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_EmpireHints_EmpireId",
                table: "EmpireHints",
                column: "EmpireId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EmpireHints");

            migrationBuilder.DropIndex(
                name: "IX_Empires_Slug",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "NameEn",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "NamePt",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "ReferenceYear",
                table: "Empires");

            migrationBuilder.DropColumn(
                name: "YearPrecision",
                table: "Empires");

            migrationBuilder.RenameColumn(
                name: "Slug",
                table: "Empires",
                newName: "Name");
        }
    }
}
