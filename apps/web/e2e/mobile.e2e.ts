import type { Page } from "@playwright/test";
import { SCREENS_DIR, blockPaddle, expect, expectNoHorizontalScroll, mockMe, routeToSupporterApi, test } from "./fixtures";

// iPhone-sized viewport (390 px): no horizontal scroll anywhere new, and a
// screenshot of each screen for the owner (docs/launch/qa-screens).
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

async function shot(page: Page, name: string) {
  await expectNoHorizontalScroll(page);
  // Maps load after the page; wait for them so the picture shows the screen.
  await expect(page.getByText(/^(Loading map|Carregando mapa)/)).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `${SCREENS_DIR}/${name}.png`, fullPage: false });
}

async function openFromMenu(page: Page, item: RegExp) {
  await page.getByRole("button", { name: "Menu" }).click();
  await page.locator("nav").getByRole("button", { name: item }).click();
}

test.describe("phone, 390px", () => {
  test.beforeEach(async ({ page }) => {
    await blockPaddle(page);
  });

  for (const locale of ["en", "pt"] as const) {
    test(`home and menu (${locale})`, async ({ page }) => {
      await page.goto(`/${locale}`);
      await expect(page.getByRole("combobox")).toBeVisible();
      await shot(page, `${locale}-home`);
      await page.getByRole("button", { name: "Menu" }).click();
      await expect(page.locator("div.fixed nav")).toBeVisible();
      await shot(page, `${locale}-menu-locked`);
    });

    test(`locked perks (${locale})`, async ({ page }) => {
      await page.goto(`/${locale}/archive`);
      await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
      await shot(page, `${locale}-archive-locked`);
      await page.goto(`/${locale}/practice`);
      await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
      await shot(page, `${locale}-practice-locked`);
    });

    test(`supporter pages (${locale})`, async ({ page }) => {
      await routeToSupporterApi(page);
      await mockMe(page, { isSupporter: true, displayName: "Ana Teste" });
      await page.goto(`/${locale}/archive`);
      await expect(page.locator('a[href*="/archive/20"]').first()).toBeVisible();
      await shot(page, `${locale}-archive-list`);

      await page.locator('a[href*="/archive/20"]').first().click();
      await expect(page.getByRole("combobox")).toBeVisible();
      await shot(page, `${locale}-archive-day`);

      await page.goto(`/${locale}/practice`);
      await expect(page.locator('[role=group]').first()).toBeVisible();
      await shot(page, `${locale}-practice-setup`);
      await page.getByRole("button", { name: locale === "en" ? "Start" : "Começar", exact: true }).click();
      await expect(page.getByRole("combobox")).toBeVisible();
      await shot(page, `${locale}-practice-round`);
    });

    test(`account and support dialogs (${locale})`, async ({ page }) => {
      const t =
        locale === "en"
          ? { signIn: /^Sign in/, account: /My account/, support: /^Support the project/ }
          : { signIn: /^Entrar/, account: /Minha conta/, support: /^Apoiar o projeto/ };

      await page.goto(`/${locale}`);
      await openFromMenu(page, t.signIn);
      await expect(page.getByRole("dialog")).toBeVisible();
      await shot(page, `${locale}-account-signed-out`);
      await page.keyboard.press("Escape");

      await openFromMenu(page, t.support);
      await expect(page.getByRole("dialog")).toBeVisible();
      await shot(page, `${locale}-support-signed-out`);
      await page.keyboard.press("Escape");

      await mockMe(page, { displayName: "Ana Teste", email: "ana@example.com" });
      await page.reload();
      await openFromMenu(page, t.account);
      await expect(page.getByRole("dialog")).toContainText("ana@example.com");
      await shot(page, `${locale}-account-signed-in`);
      await page.keyboard.press("Escape");

      await openFromMenu(page, t.support);
      await expect(page.getByRole("dialog")).toBeVisible();
      await shot(page, `${locale}-support-buy`);
      await page.keyboard.press("Escape");

      await page.unroute("http://localhost:5104/me");
      await mockMe(page, { displayName: "Ana Teste", email: "ana@example.com", isSupporter: true });
      await page.reload();
      await openFromMenu(page, t.support);
      await expect(page.getByRole("dialog")).toBeVisible();
      await shot(page, `${locale}-support-supporter`);
    });
  }
});
