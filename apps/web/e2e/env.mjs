// Shared by the e2e scripts and the Playwright config. Everything runs on its
// own ports and its own database (never imperatle_dev or imperatle_launch).
export const DB_NAME = process.env.E2E_DB ?? "imperatle_qa";
export const PG_CONTAINER = process.env.E2E_PG_CONTAINER ?? "imperatle-postgres-1";
export const CONNECTION_STRING = `Host=localhost;Port=5432;Database=${DB_NAME};Username=imperatle;Password=imperatle`;

// Two copies of the API on the same database: a regular one, and one with the
// Development-only Dev:IsSupporter override. The supporter tests send the
// browser's API calls to the second one (see fixtures.ts).
export const API_URL = "http://localhost:5104";
export const SUPPORTER_API_URL = "http://localhost:5105";
export const WEB_URL = "http://localhost:3004";

// The empire Development pins as today's challenge.
export const TODAY_SLUG = "mongol-empire";

export const PROTECTED_DATABASES = ["imperatle", "imperatle_dev", "imperatle_launch"];
