import { randomUUID } from "node:crypto";
import type { APIRequestContext } from "@playwright/test";
import { SUPPORTER_API_URL } from "./env.mjs";
import { ARCHIVE_DAYS, TODAY_NAME_EN, addDays, expect, getEmpires, guess, routeToSupporterApi, test } from "./fixtures";

const ARCHIVE_GUESS = /\/archive\/[\d-]+\/guess$/;
const PRACTICE_GUESS = /\/practice\/[0-9a-f-]+\/guess$/;

// Supporter perks, through the Dev:IsSupporter copy of the API (the real
// supporter check, Paddle, can't run here).
test.describe("perks, supporter", () => {
  test.beforeEach(async ({ page }) => {
    await routeToSupporterApi(page);
  });

  test("archive: a past day is playable and stays out of the daily game", async ({ page, request }) => {
    const today = (await (await request.get(`${SUPPORTER_API_URL}/challenges/today`)).json()).date as string;
    const day = ARCHIVE_DAYS[0];
    const date = addDays(today, -day.daysAgo);

    await page.goto("/en/archive");
    await expect(page.getByRole("heading", { name: "Past games" })).toBeVisible();
    await expect(page.getByText("For supporters")).toHaveCount(0);
    await expect(page.locator('a[href*="/archive/20"]')).toHaveCount(ARCHIVE_DAYS.length);

    await page.locator(`a[href$="/archive/${date}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/en/archive/${date}$`));

    const wrong = await guess(page, TODAY_NAME_EN, ARCHIVE_GUESS);
    expect(wrong.correct).toBe(false);
    expect(wrong.answer).toBeNull();
    const right = await guess(page, day.nameEn, ARCHIVE_GUESS);
    expect(right.correct).toBe(true);
    await expect(page.getByRole("heading", { name: "Correct!" })).toBeVisible();
    await expect(page.getByText("Past game: your daily stats and streak are unchanged.")).toBeVisible();

    // Back on the list the day shows as won; today's game is untouched.
    await page.goto("/en/archive");
    await expect(page.locator(`a[href$="/archive/${date}"]`)).toContainText("Won, 2/7");
    await page.goto("/en");
    await expect(page.getByRole("combobox")).toBeVisible();
  });

  test("archive refuses today and future days", async ({ request }) => {
    const today = (await (await request.get(`${SUPPORTER_API_URL}/challenges/today`)).json()).date as string;
    expect((await request.get(`${SUPPORTER_API_URL}/archive/${today}`)).status()).toBe(404);
    expect((await request.get(`${SUPPORTER_API_URL}/archive/${addDays(today, 1)}`)).status()).toBe(404);
    expect((await request.post(`${SUPPORTER_API_URL}/archive/${today}/guess`, { data: { empireId: 1 } })).status()).toBe(404);
    expect((await request.get(`${SUPPORTER_API_URL}/challenges/${addDays(today, 1)}/map`)).status()).toBe(404);
  });

  test("practice: 3 attempts, no clues, outline map, then play again", async ({ page, request }) => {
    const empires = await getEmpires(request);
    await page.goto("/en/practice");
    await expect(page.getByRole("button", { name: "Start", exact: true })).toBeEnabled();

    await page.getByRole("group", { name: "Attempts" }).getByRole("button", { name: "3", exact: true }).click();
    await page.getByRole("group", { name: "Clues" }).getByRole("button", { name: "Off" }).click();
    await page.getByRole("group", { name: "Map" }).getByRole("button", { name: "Outline only" }).click();
    await expect(page.getByText(/empires match/)).toBeVisible();

    const started = page.waitForResponse((r) => new URL(r.url()).pathname === "/practice" && r.request().method() === "POST");
    await page.getByRole("button", { name: "Start", exact: true }).click();
    const first = await (await started).json();
    expect(first.options).toMatchObject({ attempts: 3, hints: false, map: "Outline" });
    expect(first.answer).toBeNull();
    await expect(page.getByText("3 attempts")).toBeVisible();

    // Guess until the round ends: at most 3 attempts, no clues on the way.
    let last: Awaited<ReturnType<typeof guess>> | null = null;
    let used = 0;
    for (const empire of empires) {
      last = await guess(page, empire.nameEn, PRACTICE_GUESS);
      used++;
      if (last.gameOver) break;
      expect(last.reveal).toBeNull();
      expect(last.answer).toBeNull();
    }
    expect(used).toBeLessThanOrEqual(3);
    expect(last?.gameOver).toBe(true);
    expect(last?.answer).not.toBeNull();
    await expect(page.getByText("Practice round: your stats and streak are unchanged.")).toBeVisible();

    const again = page.waitForResponse((r) => new URL(r.url()).pathname === "/practice" && r.request().method() === "POST");
    await page.getByRole("button", { name: "Play again" }).click();
    const second = await (await again).json();
    expect(second.id).not.toBe(first.id);
    expect(second.options).toMatchObject({ attempts: 3, hints: false, map: "Outline" });
    await expect(page.getByRole("combobox")).toBeVisible();
  });

  test("practice with clues on and the full map, resumed after a reload", async ({ page, request }) => {
    const empires = await getEmpires(request);
    await page.goto("/en/practice");
    await page.getByRole("group", { name: "Attempts" }).getByRole("button", { name: "7", exact: true }).click();
    await page.getByRole("group", { name: "Clues" }).getByRole("button", { name: "On" }).click();
    await page.getByRole("group", { name: "Map" }).getByRole("button", { name: "Full from the start" }).click();
    const started = page.waitForResponse((r) => new URL(r.url()).pathname === "/practice" && r.request().method() === "POST");
    await page.getByRole("button", { name: "Start", exact: true }).click();
    const round = await (await started).json();
    expect(round.options).toMatchObject({ hints: true, map: "Full", attempts: 7 });

    const res = await guess(page, empires[0].nameEn, PRACTICE_GUESS);
    if (!res.gameOver) {
      expect(res.reveal).not.toBeNull();
      expect(res.answer).toBeNull();
    }

    await page.reload();
    await expect(page.getByText(empires[0].nameEn).first()).toBeVisible();
  });

  test("practice never draws today's empire", async ({ playwright }) => {
    const todayMap = async (api: APIRequestContext) => {
      const today = (await (await api.get(`${SUPPORTER_API_URL}/challenges/today`)).json()).date as string;
      return (await api.get(`${SUPPORTER_API_URL}/challenges/${today}/map`)).text();
    };

    // Easy + Asia holds today's empire (Mongol) among a few others: if it
    // could be drawn, some of these rounds would show its map.
    const options = { difficulty: "Easy", attempts: 3, hints: true, map: "Progressive", era: null, continent: 1 };
    let rounds = 0;
    for (let player = 0; player < 3; player++) {
      // A new player every 15 rounds keeps under the start rate limit.
      const api = await playwright.request.newContext({ extraHTTPHeaders: { Cookie: `imperatle_aid=${randomUUID()}` } });
      const target = await todayMap(api);
      for (let i = 0; i < 15; i++) {
        const res = await api.post(`${SUPPORTER_API_URL}/practice`, { data: options });
        expect(res.status()).toBe(200);
        const { id } = await res.json();
        const map = await (await api.get(`${SUPPORTER_API_URL}/practice/${id}/map`)).text();
        expect(map).not.toBe(target);
        rounds++;
      }
      await api.dispose();
    }
    expect(rounds).toBe(45);
  });

  test("another player's practice round is a 404", async ({ playwright }) => {
    const owner = await playwright.request.newContext({ extraHTTPHeaders: { Cookie: `imperatle_aid=${randomUUID()}` } });
    const intruder = await playwright.request.newContext({ extraHTTPHeaders: { Cookie: `imperatle_aid=${randomUUID()}` } });
    const { id } = await (await owner.post(`${SUPPORTER_API_URL}/practice`, { data: {} })).json();
    expect((await intruder.get(`${SUPPORTER_API_URL}/practice/${id}`)).status()).toBe(404);
    expect((await intruder.get(`${SUPPORTER_API_URL}/practice/${id}/map`)).status()).toBe(404);
    expect((await intruder.post(`${SUPPORTER_API_URL}/practice/${id}/guess`, { data: { empireId: 1 } })).status()).toBe(404);
    expect((await owner.get(`${SUPPORTER_API_URL}/practice/${id}`)).status()).toBe(200);
    await owner.dispose();
    await intruder.dispose();
  });

  test("language switch on the perk pages", async ({ page }) => {
    for (const [path, ptTitle] of [
      ["archive", "Jogos anteriores"],
      ["practice", "Treino"],
    ] as const) {
      await page.goto(`/en/${path}`);
      await page.getByRole("button", { name: "Menu" }).click();
      await page.getByRole("button", { name: "Português" }).click();
      await expect(page).toHaveURL(new RegExp(`/pt/${path}$`));
      await expect(page.getByRole("heading", { level: 1, name: ptTitle })).toBeVisible();
      await page.getByRole("button", { name: "Menu" }).click();
      await page.getByRole("button", { name: "English" }).click();
      await expect(page).toHaveURL(new RegExp(`/en/${path}$`));
    }
  });
});
