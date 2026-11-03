// The transaction id Paddle puts on its payment links (?_ptxn=txn_...).
// Anything that doesn't look like a Paddle transaction id is ignored.
export function checkoutTransactionId(search: string): string | null {
  const value = new URLSearchParams(search).get("_ptxn")?.trim();
  return value && /^txn_[a-z0-9]+$/i.test(value) ? value : null;
}
