using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Imperatle.Api.Migrations
{
    // Renames slugs to the names the empires are best known by, keeping the
    // same rows, so past challenges, the schedule and player history still
    // point to them. Runs before the content import, which then finds each
    // empire under its new file name.
    public partial class RenameEmpireSlugs : Migration
    {
        private static readonly (string Old, string New)[] Renames =
        [
            ("eastern-roman-empire", "byzantine-empire"),
            ("xiongnu-empire", "xiongnu"),
            ("carthaginian-empire", "carthage"),
            ("danish-empire", "denmark-norway"),
            ("belgian-empire", "belgian-colonial-empire"),
            ("austro-hungarian-empire", "austria-hungary"),
            ("great-seljuk-empire", "seljuk-empire"),
        ];

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            foreach (var (oldSlug, newSlug) in Renames)
            {
                migrationBuilder.UpdateData(
                    table: "Empires",
                    keyColumn: "Slug",
                    keyValue: oldSlug,
                    column: "Slug",
                    value: newSlug);
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            foreach (var (oldSlug, newSlug) in Renames)
            {
                migrationBuilder.UpdateData(
                    table: "Empires",
                    keyColumn: "Slug",
                    keyValue: newSlug,
                    column: "Slug",
                    value: oldSlug);
            }
        }
    }
}
