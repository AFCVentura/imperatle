import { API_URL } from "./env.mjs";
import { blockPaddle, expect, mockMe, test } from "./fixtures";

async function openFromMenu(page: import("@playwright/test").Page, item: RegExp) {
  await page.getByRole("button", { name: "Menu" }).click();
  await page.locator("nav").getByRole("button", { name: item }).click();
}

// Google and Paddle can't run here, so /me is answered by the test: signed
// out, signed in, signed in as a supporter.
test.describe("account and support dialogs", () => {
  test.beforeEach(async ({ page }) => {
    await blockPaddle(page);
  });

  test("signed out: sign in dialog and the Google button", async ({ page }) => {
    await page.goto("/en");
    await openFromMenu(page, /^Sign in/);
    const dialog = page.getByRole("dialog", { name: "Sign in" });
    await expect(dialog).toBeVisible();
    const google = dialog.getByRole("link", { name: "Sign in with Google" }).or(dialog.getByRole("button", { name: "Sign in with Google" }));
    await expect(google).toBeVisible();
  });

  test("the login endpoint sends a misconfigured login back with ?login=error, and the dialog says so", async ({ page }) => {
    // No Google client id in the e2e API: the API redirects with login=error.
    await page.goto(`${API_URL}/auth/google/login?returnUrl=${encodeURIComponent("http://localhost:3004/en")}`);
    await expect(page).toHaveURL(/localhost:3004\/en/);
    await expect(page.getByText("Couldn't sign in with Google. Please try again.")).toBeVisible();
  });

  test("the login refuses to send the browser to another site", async ({ request }) => {
    for (const target of ["https://evil.example", "http://localhost:3004@evil.example", "//evil.example", "javascript:alert(1)"]) {
      const res = await request.get(`${API_URL}/auth/google/login?returnUrl=${encodeURIComponent(target)}`, { maxRedirects: 0 });
      expect(res.status(), target).toBe(400);
    }
  });

  test("logout and account deletion refuse requests from other origins", async ({ request }) => {
    for (const origin of [undefined, "https://evil.example"]) {
      const headers = origin ? { Origin: origin } : undefined;
      expect((await request.post(`${API_URL}/auth/logout`, { headers })).status()).toBe(403);
      expect((await request.post(`${API_URL}/auth/logout?all=true`, { headers })).status()).toBe(403);
      expect((await request.delete(`${API_URL}/me`, { headers })).status()).toBe(403);
    }
  });

  test("signed in: the account dialog with name, e-mail, sign out and delete", async ({ page }) => {
    await mockMe(page, { displayName: "Ana Teste", email: "ana@example.com" });
    await page.goto("/en");
    await page.getByRole("button", { name: "Menu" }).click();
    await expect(page.locator("nav").getByText("Ana Teste")).toBeVisible();
    // Signed in but not a supporter: still locked.
    await expect(page.locator("nav").getByRole("link", { name: /Practice/ })).toContainText("Supporters");
    await page.locator("nav").getByRole("button", { name: /My account/ }).click();

    const dialog = page.getByRole("dialog", { name: "Your account" });
    await expect(dialog).toContainText("ana@example.com");
    await expect(dialog.getByRole("button", { name: "Sign out", exact: true })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Sign out of all devices" })).toBeVisible();
    await dialog.getByRole("button", { name: "Delete account" }).click();
    await expect(dialog.getByText("Delete the account?")).toBeVisible();
    await expect(dialog.getByText("You also lose your supporter perks.")).toHaveCount(0);
    await dialog.getByRole("button", { name: "Cancel" }).click();
  });

  test("signed in: support dialog offers the purchase", async ({ page }) => {
    await mockMe(page, { isSupporter: false });
    await page.goto("/en");
    await openFromMenu(page, /^Support the project/);
    const dialog = page.getByRole("dialog", { name: "Support the project" });
    await expect(dialog.getByRole("button", { name: "Become a supporter" })).toBeVisible();
    await expect(dialog.getByText("Payments are processed by Paddle")).toBeVisible();
    // Paddle.js is blocked: the price falls back to the no-price note and the
    // checkout reports that it couldn't load, instead of hanging.
    await expect(dialog.getByText("One-time payment, for life. The price in your currency shows at checkout.")).toBeVisible();
    await dialog.getByRole("button", { name: "Become a supporter" }).click();
    await expect(dialog.getByText(/The checkout couldn't load/)).toBeVisible();
  });

  test("signed out: support dialog asks to sign in first", async ({ page }) => {
    await page.goto("/en");
    await openFromMenu(page, /^Support the project/);
    const dialog = page.getByRole("dialog", { name: "Support the project" });
    await expect(dialog.getByRole("button", { name: "Sign in with Google to continue" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Become a supporter" })).toHaveCount(0);
  });

  test("supporter: no lock badge, no checkout, supporter badge in the account", async ({ page }) => {
    await mockMe(page, { isSupporter: true });
    await page.goto("/en");
    await page.getByRole("button", { name: "Menu" }).click();
    await expect(page.locator("nav").getByText("Supporters")).toHaveCount(0);
    await page.locator("nav").getByRole("button", { name: /^Support the project/ }).click();
    const support = page.getByRole("dialog", { name: "Support the project" });
    await expect(support.getByText("You're a supporter. Thank you!")).toBeVisible();
    await expect(support.getByRole("button", { name: "Become a supporter" })).toHaveCount(0);
    await support.getByRole("button", { name: "Close" }).last().click();

    await openFromMenu(page, /My account/);
    const account = page.getByRole("dialog", { name: "Your account" });
    await expect(account.getByText("Supporter", { exact: true })).toBeVisible();
    await account.getByRole("button", { name: "Delete account" }).click();
    await expect(account.getByText("You also lose your supporter perks.")).toBeVisible();
  });

  test("dialogs in Portuguese", async ({ page }) => {
    await mockMe(page, { isSupporter: false });
    await page.goto("/pt");
    await page.getByRole("button", { name: "Menu" }).click();
    await page.locator("nav").getByRole("button", { name: /^Apoiar o projeto/ }).click();
    await expect(page.getByRole("dialog", { name: "Apoiar o projeto" })).toBeVisible();
  });
});
