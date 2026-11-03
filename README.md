# Imperatle

[![CI/CD](https://github.com/AFCVentura/imperatle/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/AFCVentura/imperatle/actions/workflows/ci-cd.yml)
[![CodeQL](https://github.com/AFCVentura/imperatle/actions/workflows/codeql.yml/badge.svg)](https://github.com/AFCVentura/imperatle/actions/workflows/codeql.yml)
![.NET 10](https://img.shields.io/badge/.NET-10-512BD4?logo=dotnet&logoColor=white)
![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)
![Azure Container Apps](https://img.shields.io/badge/Azure-Container_Apps-0078D4?logo=microsoftazure&logoColor=white)

A daily guessing game about historical empires and other great powers. Every day the map shows one of them at its greatest extent, and players have 7 attempts to name it. Each wrong guess says whether the answer was larger or smaller and lasted longer or shorter, and unlocks new clues: era, continents, capital, language, peak year and more.

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
- **Optional accounts.** Sign in with Google, handled by the API (external login plus an HttpOnly, SameSite=Lax cookie). On every login the browser's anonymous games move to the account; if both have the same day, the account's game wins. Signed in, attempts and statistics follow the account on every device, and the account can be deleted with all its games from the menu.

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

## Configuration

The API reads its settings from `appsettings*.json` and environment variables (`Section__Key`, e.g. `Auth__Google__ClientId`); the web app reads `NEXT_PUBLIC_*` variables at build time (`apps/web/.env.local` locally, the Vercel project settings in production). Secrets go in environment variables, never in the repository.

| Setting (environment variable) | What it is |
|---|---|
| `ConnectionStrings__DefaultConnection` | PostgreSQL connection string. |
| `Cors__AllowedOrigins` | Comma-separated web app origins (e.g. `https://imperatle.com,https://www.imperatle.com`). Also the only places the login may return to, and the only origins allowed to call logout and account deletion. |
| `Auth__Google__ClientId` | Google OAuth client id. Without it (and the secret) the API runs without login, and the sign-in button returns with an error message. |
| `Auth__Google__ClientSecret` | Google OAuth client secret. |
| `Auth__CookieDomain` | Domain of the login cookie. `imperatle.com` in production, so `imperatle.com` and `api.imperatle.com` share it; empty locally (the cookie stays on the API host, which is enough on `localhost`). |
| `Resend__ApiKey`, `Resend__From`, `Feedback__NotifyEmail` | E-mail forwarding of feedback messages (optional). |
| `Database__MigrateOnStartup` | `false` to apply migrations by hand instead of on startup. |

The web app reads `NEXT_PUBLIC_API_URL`.

**Google sign-in.** Create an OAuth client of type "Web application" in Google Cloud and register these authorized redirect URIs (the path is fixed, `/signin-google`):

- local: `http://localhost:5055/signin-google` (and the port of any other API you run, e.g. `http://localhost:5101/signin-google`)
- production: `https://api.imperatle.com/signin-google`

Step by step, in Portuguese: [docs/launch/google-oauth-setup.md](docs/launch/google-oauth-setup.md). The login cookie is encrypted with ASP.NET Core Data Protection keys stored in the database (`DataProtectionKeys` table), so logins survive deploys and work across replicas.

### Paddle (Supporter purchase)

The one-time "Supporter (lifetime)" purchase uses [Paddle Billing](https://developer.paddle.com) as merchant of record. Step-by-step account setup, in Portuguese: [docs/launch/paddle-setup.md](docs/launch/paddle-setup.md).

| Variable | Where | What |
|---|---|---|
| `Paddle__WebhookSecret` | API (secret) | Secret key of the notification destination (Paddle > Developer tools > Notifications). Empty = every webhook is rejected. |
| `Paddle__SupporterPriceId` | API | The Supporter price id (`pri_...`). Only a completed transaction containing this price grants Supporter. |
| `Paddle__Environment` | API | `sandbox` (default) or `production`. Informative; the secret already belongs to one environment. |
| `Paddle__WebhookToleranceSeconds` | API | How old a signed webhook may be before it's refused as stale. Default `300`. |
| `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` | Web | Client-side token (`test_...` in sandbox, `live_...` in production), Paddle > Developer tools > Authentication. Public by design. |
| `NEXT_PUBLIC_PADDLE_SUPPORTER_PRICE_ID` | Web | The same `pri_...` as `Paddle__SupporterPriceId`. |
| `NEXT_PUBLIC_PADDLE_ENVIRONMENT` | Web | `sandbox` (default) or `production`. Must match the token. |

Without the two web variables the Supporter dialog shows "not available yet" instead of the button.

How it fits together: the browser opens Paddle's overlay checkout with `customData.userId` (buying requires being signed in); Paddle then calls `POST /webhooks/paddle`, which checks the `Paddle-Signature` HMAC over the raw body, refuses stale timestamps, records each event id so retries are applied once, sets `SupporterSinceUtc` on `transaction.completed` and clears it on an approved full refund or chargeback (`adjustment.created` / `adjustment.updated`).

## Tests

- **API** (`tests/Imperatle.Api.Tests`, xUnit v3): scheduler rotation, content validation (including every shipped empire file and map), clue unlocking, size and duration comparisons, statistics, the content import, accounts (moving anonymous games into an account, `/me`, account deletion, login redirect and origin checks), and the Paddle webhook (signature, stale and replayed events, grant and refund). Run with `dotnet test --solution apps/api/Imperatle.Api.sln`.
- **Web** (`apps/web`, Vitest): share text, number and year formatting, empire name search, the `/me` client, the Supporter purchase flow. Run with `npm test`.

CI runs both, plus lint, type checking and a production build, on every push and pull request. CodeQL scans C#, TypeScript and the workflows, and Dependabot keeps dependencies current.

## Deployment

On `main`, after the checks pass, the API image is pushed to GitHub Container Registry and deployed to Azure Container Apps (OIDC login, no stored passwords), then the workflow waits for the new revision to be healthy and smoke-tests the domain. Database migrations and the content import run when the API starts. The web app deploys through Vercel's Git integration.
