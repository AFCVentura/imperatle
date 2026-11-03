import { describe, expect, it } from "vitest";
import { checkoutTransactionId } from "./checkoutLink";

describe("checkoutTransactionId", () => {
  it("reads the transaction id from a Paddle payment link", () => {
    expect(checkoutTransactionId("?_ptxn=txn_01h8bz6dcbwr2rz5t8g6hq7ksp")).toBe("txn_01h8bz6dcbwr2rz5t8g6hq7ksp");
  });

  it("keeps working with other query parameters around it", () => {
    expect(checkoutTransactionId("?utm_source=email&_ptxn=txn_abc123&x=1")).toBe("txn_abc123");
  });

  it("returns null without a transaction", () => {
    expect(checkoutTransactionId("")).toBeNull();
    expect(checkoutTransactionId("?support=1")).toBeNull();
  });

  it("ignores values that are not Paddle transaction ids", () => {
    expect(checkoutTransactionId("?_ptxn=<script>")).toBeNull();
    expect(checkoutTransactionId("?_ptxn=ctm_123")).toBeNull();
  });
});
