import { defineConfig, devices } from "@playwright/test";
import { API_URL, CONNECTION_STRING, SUPPORTER_API_URL, WEB_URL } from "./e2e/env.mjs";

// End-to-end suite (`npm run e2e`, not part of `npm test`). Needs Docker with
// the imperatle-postgres-1 container up and ports 5104, 5105 and 3004 free;
// it uses its own database (imperatle_qa). See docs/launch/QA-REPORT.md.
const apiEnv = (port: number, supporter: boolean) => ({
  ASPNETCORE_ENVIRONMENT: "Development",
  ASPNETCORE_URLS: `http://localhost:${port}`,
  ConnectionStrings__DefaultConnection: CONNECTION_STRING,
  Cors__AllowedOrigins: WEB_URL,
  Dev__IsSupporter: supporter ? "true" : "false",
  Dev__ForceTodayEmpireSlug: "mongol-empire",
  // No Google or Stripe: login answers ?login=error, the webhook refuses
  // everything, and the purchase is mocked by the tests (fixtures.mockSupport).
  Auth__Google__ClientId: "",
  Auth__Google__ClientSecret: "",
  Stripe__SecretKey: "",
  Stripe__WebhookSecret: "",
  Stripe__SupporterPriceId: "",
});

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  outputDir: "./test-results",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: WEB_URL,
    ...devices["Desktop Chrome"],
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "dotnet Imperatle.Api.dll",
      cwd: "./e2e/.api",
      url: `${API_URL}/challenges/today`,
      env: apiEnv(5104, false),
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `node ../wait-for.mjs ${API_URL}/challenges/today -- dotnet Imperatle.Api.dll`,
      cwd: "./e2e/.api",
      url: `${SUPPORTER_API_URL}/challenges/today`,
      env: apiEnv(5105, true),
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      // A production build: no DEV buttons, real caching.
      command: "npx next build && npx next start -p 3004",
      url: WEB_URL,
      env: {
        NEXT_PUBLIC_API_URL: API_URL,
      },
      reuseExistingServer: false,
      timeout: 600_000,
    },
  ],
});
