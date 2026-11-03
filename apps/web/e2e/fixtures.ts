import { randomUUID } from "node:crypto";
import { test as base, expect, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import { API_URL, SUPPORTER_API_URL } from "./env.mjs";

export { expect };

// Past days seeded by global-setup.ts, with known answers.
export const ARCHIVE_DAYS = [
  { daysAgo: 1, slug: "roman-empire", nameEn: "Roman Empire" },
  { daysAgo: 2, slug: "inca-empire", nameEn: "Inca Empire" },
  { daysAgo: 3, slug: "british-empire", nameEn: "British Empire" },
] as const;

export const TODAY_NAME_EN = "Mongol Empire";

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface EmpireSummary {
  id: number;
  nameEn: string;
  namePt: string;
}

// Every context starts with its own anonymous id, as a new browser would get
// on its first guess. Set up front so the guess rate limit (per anonymous id,
// per IP before it exists) never mixes two tests.
export async function newAnonymousId(context: BrowserContext): Promise<string> {
  const id = randomUUID();
  await context.addCookies([{ name: "imperatle_aid", value: id, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" }]);
  return id;
}

// Sends the browser's API calls to the Dev:IsSupporter copy of the API.
// Cookies on localhost ignore the port, so the player stays the same.
export async function routeToSupporterApi(page: Page | BrowserContext) {
  await page.route(`${API_URL}/**`, (route) => route.continue({ url: route.request().url().replace(API_URL, SUPPORTER_API_URL) }));
}

// Paddle.js never loads in the tests (no real client token).
export async function blockPaddle(page: Page | BrowserContext) {
  await page.route(/paddle\.com/, (route) => route.abort());
}

export interface MeUserMock {
  displayName?: string;
  email?: string;
  isSupporter?: boolean;
}

// GET /me answered by the test: signed in (optionally as a supporter)
// without Google.
export async function mockMe(page: Page | BrowserContext, user: MeUserMock | null) {
  await page.route(`${API_URL}/me`, (route) => {
    if (route.request().method() !== "GET") return route.continue();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "http://localhost:3004", "Access-Control-Allow-Credentials": "true" },
      body: JSON.stringify(
        user
          ? {
              authenticated: true,
              user: {
                id: "00000000-0000-4000-8000-000000000001",
                displayName: user.displayName ?? "Ana Teste",
                email: user.email ?? "ana@example.com",
                isSupporter: user.isSupporter ?? false,
              },
            }
          : { authenticated: false, user: null },
      ),
    });
  });
}

export async function getEmpires(request: APIRequestContext): Promise<EmpireSummary[]> {
  return (await request.get(`${API_URL}/empires`)).json();
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Types a name, picks it from the suggestions and presses Guess. Waits for
// the API's answer, which it returns.
export async function guess(page: Page, nameEn: string, path: RegExp = /\/guess$/) {
  const input = page.getByRole("combobox");
  await input.fill(nameEn);
  await page
    .locator("#empire-suggestions [role=option]")
    .filter({ hasText: new RegExp(`^${escapeRegExp(nameEn)}( \\(|$)`) })
    .first()
    .click();
  const response = page.waitForResponse((r) => path.test(new URL(r.url()).pathname) && r.request().method() === "POST");
  await page.getByRole("button", { name: /^(Guess|Adivinhar)$/ }).click();
  const res = await response;
  expect(res.status()).toBe(200);
  return (await res.json()) as { correct: boolean; gameOver: boolean; reveal: unknown; answer: { slug: string; nameEn: string } | null };
}

// No horizontal page scroll at the current viewport.
export async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth, "page is wider than the viewport").toBeLessThanOrEqual(innerWidth);
}

export const SCREENS_DIR = "../../docs/launch/qa-screens";

export const test = base.extend<{ anonymousId: string }>({
  anonymousId: [
    async ({ context }, provide) => {
      await provide(await newAnonymousId(context));
    },
    { auto: true },
  ],
});
