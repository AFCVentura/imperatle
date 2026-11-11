using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Imperatle.Api.Migrations
{
    /// <inheritdoc />
    public partial class SupporterPaymentsOnStripe : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "PaddleTransactionId",
                table: "Users",
                newName: "SupporterPaymentId");

            migrationBuilder.RenameIndex(
                name: "IX_Users_PaddleTransactionId",
                table: "Users",
                newName: "IX_Users_SupporterPaymentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "SupporterPaymentId",
                table: "Users",
                newName: "PaddleTransactionId");

            migrationBuilder.RenameIndex(
                name: "IX_Users_SupporterPaymentId",
                table: "Users",
                newName: "IX_Users_PaddleTransactionId");
        }
    }
}
