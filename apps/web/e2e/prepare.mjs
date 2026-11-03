// Before `playwright test`: makes sure the e2e database exists and publishes
// the API to e2e/.api, so the two API copies run from their own folder (a
// `dotnet run` in apps/api would lock its bin folder for other builds).
import { execFileSync } from "node:child_process";
import { DB_NAME, PG_CONTAINER, PROTECTED_DATABASES } from "./env.mjs";

if (PROTECTED_DATABASES.includes(DB_NAME)) {
  throw new Error(`Refusing to run the e2e suite against ${DB_NAME}.`);
}

const psql = (sql) =>
  execFileSync("docker", ["exec", PG_CONTAINER, "psql", "-U", "imperatle", "-d", "postgres", "-tAc", sql], { encoding: "utf8" }).trim();

if (psql(`SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}'`) !== "1") {
  psql(`CREATE DATABASE ${DB_NAME}`);
  console.log(`Created database ${DB_NAME}`);
}

execFileSync("dotnet", ["publish", "../api/Imperatle.Api.csproj", "-c", "Release", "-o", "e2e/.api", "--nologo", "-v", "q"], {
  stdio: "inherit",
});
