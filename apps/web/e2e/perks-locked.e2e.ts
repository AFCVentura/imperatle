import { API_URL } from "./env.mjs";
import { ARCHIVE_DAYS, addDays, expect, test } from "./fixtures";

// A player who isn't a supporter: the pages explain the perk, the API refuses.
test.describe("perks, not a supporter", () => {
  test("menu shows the lock badge on both perks", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("button", { name: "Menu" }).click();
    const nav = page.locator("nav");
    await expect(nav.getByRole("link", { name: /Past games/ })).toContainText("Supporters");
    await expect(nav.getByRole("link", { name: /Practice/ })).toContainText("Supporters");
  });

  for (const [path, perk] of [
    ["/en/archive", "Past games are a supporter perk"],
    ["/en/practice", "Practice mode is a supporter perk"],
  ] as const) {
    test(`${path} shows the locked panel`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: "For supporters" })).toBeVisible();
      await expect(page.getByText(perk)).toBeVisible();
      await page.getByRole("button", { name: "Become a supporter" }).click();
      await expect(page.getByRole("dialog", { name: "Support the project" })).toBeVisible();
    });
  }

  test("every archive and practice endpoint answers 403", async ({ request }) => {
    const today = (await (await request.get(`${API_URL}/challenges/today`)).json()).date as string;
    const past = addDays(today, -ARCHIVE_DAYS[0].daysAgo);
    const someId = "11111111-1111-4111-8111-111111111111";
    const calls = [
      request.get(`${API_URL}/archive`),
      request.get(`${API_URL}/archive/${past}`),
      request.post(`${API_URL}/archive/${past}/guess`, { data: { empireId: 1 } }),
      request.get(`${API_URL}/practice/pool`),
      request.post(`${API_URL}/practice`, { data: { difficulty: "Any", attempts: 7, hints: true, map: "Progressive" } }),
      request.get(`${API_URL}/practice/${someId}`),
      request.get(`${API_URL}/practice/${someId}/map`),
      request.post(`${API_URL}/practice/${someId}/guess`, { data: { empireId: 1 } }),
    ];
    for (const res of await Promise.all(calls)) {
      expect(res.status(), res.url()).toBe(403);
    }
  });

  test("/me is signed out without a login", async ({ request }) => {
    const res = await request.get(`${API_URL}/me`);
    expect(await res.json()).toEqual({ authenticated: false, user: null });
  });
});
