import { API_URL } from "./env.mjs";
import { TODAY_NAME_EN, expect, getEmpires, guess, test } from "./fixtures";

// The daily game without an account: the launch must not add any friction.
test.describe("daily game, signed out", () => {
  test("a win, start to finish", async ({ page, anonymousId }) => {
    expect(anonymousId).toBeTruthy();
    await page.goto("/en");
    const result = await guess(page, TODAY_NAME_EN);
    expect(result.correct).toBe(true);
    await expect(page.getByRole("heading", { name: "Correct!" })).toBeVisible();
    await expect(page.getByText("The answer was").first()).toBeVisible();
  });

  test("a loss after every attempt shows the answer only at the end", async ({ page, request, anonymousId }) => {
    expect(anonymousId).toBeTruthy();
    const wrong = (await getEmpires(request)).filter((e) => e.nameEn !== TODAY_NAME_EN).slice(0, 7);
    await page.goto("/en");

    for (const [i, empire] of wrong.entries()) {
      const result = await guess(page, empire.nameEn);
      expect(result.correct).toBe(false);
      if (i < 6) {
        // Mid-round: clues, never the answer.
        expect(result.gameOver).toBe(false);
        expect(result.answer).toBeNull();
      } else {
        expect(result.gameOver).toBe(true);
        expect(result.answer?.nameEn).toBe(TODAY_NAME_EN);
      }
    }
    await expect(page.getByRole("heading", { name: "Out of attempts" })).toBeVisible();
    await expect(page.getByText(TODAY_NAME_EN).first()).toBeVisible();
  });

  test("a reload keeps the board", async ({ page, request, anonymousId }) => {
    expect(anonymousId).toBeTruthy();
    const [a, b] = (await getEmpires(request)).filter((e) => e.nameEn !== TODAY_NAME_EN);
    await page.goto("/en");
    await guess(page, a.nameEn);
    await guess(page, b.nameEn);
    await expect(page.getByText("Attempts: 2/7")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Attempts: 2/7")).toBeVisible();
    await expect(page.getByText(a.nameEn).first()).toBeVisible();
    await expect(page.getByText(b.nameEn).first()).toBeVisible();
  });

  test("a second device with the same cookie rebuilds the board from the server", async ({ page, browser, request, anonymousId }) => {
    const [a, b] = (await getEmpires(request)).filter((e) => e.nameEn !== TODAY_NAME_EN).slice(2);
    await page.goto("/en");
    await guess(page, a.nameEn);
    await guess(page, b.nameEn);

    // Same player (the cookie copied), nothing in this browser's storage.
    const other = await browser.newContext();
    await other.addCookies([{ name: "imperatle_aid", value: anonymousId, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
    const phone = await other.newPage();
    await phone.goto("/en");
    await expect(phone.getByText("Attempts: 2/7")).toBeVisible();
    await expect(phone.getByText(a.nameEn).first()).toBeVisible();
    await expect(phone.getByText(b.nameEn).first()).toBeVisible();
    await expect(phone.getByText("Guess made on another device")).toHaveCount(0);

    // The round goes on from the phone and the laptop sees the end.
    await guess(phone, TODAY_NAME_EN);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Correct!" })).toBeVisible();
    await other.close();
  });

  test("today's progress never carries the answer mid-round", async ({ request }) => {
    const [a] = (await getEmpires(request)).filter((e) => e.nameEn !== TODAY_NAME_EN);
    const res = await request.post(`${API_URL}/challenges/today/guess`, { data: { empireId: a.id } });
    expect(res.ok()).toBe(true);
    const progress = await (await request.get(`${API_URL}/challenges/today/progress`)).json();
    expect(progress.attemptsUsed).toBe(1);
    expect(progress.answer).toBeNull();
    expect(JSON.stringify(progress)).not.toContain("mongol");
    const today = await (await request.get(`${API_URL}/challenges/today`)).json();
    expect(JSON.stringify(today)).not.toMatch(/mongol|empireId/i);
  });
});
