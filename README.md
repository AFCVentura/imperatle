# Imperatle

[![CI/CD](https://github.com/AFCVentura/imperatle/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/AFCVentura/imperatle/actions/workflows/ci-cd.yml)
[![CodeQL](https://github.com/AFCVentura/imperatle/actions/workflows/codeql.yml/badge.svg)](https://github.com/AFCVentura/imperatle/actions/workflows/codeql.yml)
![.NET 10](https://img.shields.io/badge/.NET-10-512BD4?logo=dotnet&logoColor=white)
![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)
![Azure Container Apps](https://img.shields.io/badge/Azure-Container_Apps-0078D4?logo=microsoftazure&logoColor=white)

A daily guessing game about historical empires. Every day the map shows one empire at its greatest extent, and players have 7 attempts to name it. Each wrong guess says whether the answer was larger or smaller and lasted longer or shorter, and unlocks new clues: era, continents, capital, language, peak year and more.

Available in English and Portuguese.

## Stack

| Part | Tech |
|---|---|
| Web (`apps/web`) | Next.js 16 (App Router), React 19, Tailwind CSS 4, next-intl |
| API (`apps/api`) | ASP.NET Core 10, EF Core 10, PostgreSQL |
| Hosting | Vercel (web), Azure Container Apps (API), Neon (database) |

How it works:

- **The server is the referee.** Attempts are counted in the database per anonymous player (an http-only cookie), so replaying requests can't buy extra tries. The browser only keeps a copy for display.
- **Content as data.** Each empire is a JSON file in [`apps/api/Content/empires`](apps/api/Content), validated on startup and in CI (all errors reported at once) and synced to the database by slug.
- **Daily schedule.** Every active empire appears once per cycle, in random order, with no repeats across a cycle boundary.
- **Statistics.** Win rate, streaks and attempt distribution per player, plus how everyone did on today's challenge.
- **Feedback.** A form with a honeypot and a per-IP rate limit, stored in the database and forwarded by e-mail (Resend).

## Running locally

Requirements: .NET 10 SDK, Node.js 24, Docker.

```bash
docker compose up -d                 # PostgreSQL on localhost:5432

cd apps/api
dotnet run                           # http://localhost:5055, applies migrations and imports the content

cd apps/web
npm install
npm run dev                          # http://localhost:3000
```

The web app reads the API address from `NEXT_PUBLIC_API_URL` (`apps/web/.env.local`, e.g. `http://localhost:5055`).

## Tests

- **API** (`tests/Imperatle.Api.Tests`, xUnit v3): scheduler rotation, content validation (including every shipped empire file and map), clue unlocking, size and duration comparisons, statistics, and the content import. Run with `dotnet test --solution apps/api/Imperatle.Api.sln`.
- **Web** (`apps/web`, Vitest): share text, number and year formatting, empire name search. Run with `npm test`.

CI runs both, plus lint, type checking and a production build, on every push and pull request. CodeQL scans C#, TypeScript and the workflows, and Dependabot keeps dependencies current.

## Deployment

On `main`, after the checks pass, the API image is pushed to GitHub Container Registry and deployed to Azure Container Apps (OIDC login, no stored passwords), then the workflow waits for the new revision to be healthy and smoke-tests the domain. Database migrations and the content import run when the API starts. The web app deploys through Vercel's Git integration.
