import { execFileSync } from "node:child_process";
import { API_URL, DB_NAME, PG_CONTAINER, PROTECTED_DATABASES } from "./env.mjs";
import { ARCHIVE_DAYS, addDays } from "./fixtures";

// Past days for the archive: a fresh database only has today's challenge.
// Pinned rows, as an owner would pin an anniversary (the scheduler leaves
// existing dates alone).
export default async function globalSetup() {
  if (PROTECTED_DATABASES.includes(DB_NAME)) throw new Error(`Refusing to touch ${DB_NAME}.`);

  const today: { date: string } = await (await fetch(`${API_URL}/challenges/today`)).json();
  const values = ARCHIVE_DAYS.map(({ daysAgo, slug }) => `('${addDays(today.date, -daysAgo)}', '${slug}')`).join(", ");
  const sql = `
    INSERT INTO "DailyChallenges" ("Date", "EmpireId")
    SELECT v.d::date, e."Id" FROM (VALUES ${values}) AS v(d, slug) JOIN "Empires" e ON e."Slug" = v.slug
    ON CONFLICT ("Date") DO UPDATE SET "EmpireId" = EXCLUDED."EmpireId";`;
  execFileSync("docker", ["exec", PG_CONTAINER, "psql", "-U", "imperatle", "-d", DB_NAME, "-v", "ON_ERROR_STOP=1", "-c", sql]);
}
