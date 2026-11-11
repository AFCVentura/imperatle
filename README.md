# Imperatle

[![CI/CD](https://github.com/AFCVentura/imperatle/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/AFCVentura/imperatle/actions/workflows/ci-cd.yml)
[![CodeQL](https://github.com/AFCVentura/imperatle/actions/workflows/codeql.yml/badge.svg)](https://github.com/AFCVentura/imperatle/actions/workflows/codeql.yml)
![.NET 10](https://img.shields.io/badge/.NET-10-512BD4?logo=dotnet&logoColor=white)
![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql&logoColor=white)
![Azure Container Apps](https://img.shields.io/badge/Azure-Container_Apps-0078D4?logo=microsoftazure&logoColor=white)

A daily guessing game about historical empires and other great powers. Every day the map shows one of them at its greatest extent, and players have 7 attempts to name it. Each wrong guess says whether the answer was larger or smaller, older or more recent, and where it lies from the guess (direction and distance, or how much the two territories share), can be outlined over the map, and unlocks one clue: the era, the map with the continents, three curiosities, then the map with the countries. The end of the round shows the answer's fact sheet (capital, language, religion, dates, area) and the curiosities explained.

Available in English and Portuguese.

## Stack

| Part | Tech |
|---|---|
| Web (`apps/web`) | Next.js 16 (App Router), React 19, Tailwind CSS 4, next-intl |
| API (`apps/api`) | ASP.NET Core 10, EF Core 10, PostgreSQL |
| Hosting | Azure Container Apps (web and API), Neon (database), Cloudflare (DNS, email routing, analytics) |

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

The API reads its settings from `appsettings*.json` and environment variables (`Section__Key`, e.g. `Auth__Google__ClientId`); the web app reads `NEXT_PUBLIC_*` variables at build time (`apps/web/.env.local` locally, and Docker build arguments fed from GitHub repository variables for the Azure container). Secrets go in environment variables, never in the repository.

| Setting (environment variable) | What it is |
|---|---|
| `ConnectionStrings__DefaultConnection` | PostgreSQL connection string. |
| `Cors__AllowedOrigins` | Comma-separated web app origins (e.g. `https://imperatle.com,https://www.imperatle.com`). Also the only places the login may return to, and the only origins allowed to call logout and account deletion. |
| `Auth__Google__ClientId` | Google OAuth client id. Without it (and the secret) the API runs without login, and the sign-in button returns with an error message. |
| `Auth__Google__ClientSecret` | Google OAuth client secret. |
| `Auth__CookieDomain` | Domain of the login cookie. `imperatle.com` in production, so `imperatle.com` and `api.imperatle.com` share it; empty locally (the cookie stays on the API host, which is enough on `localhost`). |
| `Resend__ApiKey`, `Resend__From`, `Feedback__NotifyEmail` | E-mail forwarding of feedback messages (optional). |
| `Database__MigrateOnStartup` | `false` to apply migrations by hand instead of on startup. |

The web app reads `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SITE_URL` (public address used in share links and hreflang, default `https://imperatle.com`).

**Web container (Azure Container Apps).** `apps/web/Dockerfile` builds the standalone Next.js server (Node 24 LTS, non-root, port 8080, health route `GET /api/health`). Every `NEXT_PUBLIC_*` value is a build argument, since Next.js inlines them into the bundle; the image needs no runtime variables. In CI they come from these repository variables (Settings > Secrets and variables > Actions > Variables):

| Repository variable | What |
|---|---|
| `AZURE_DEPLOY_WEB` | `true` turns on the "Deploy web to Azure" job. Off (unset) by default. |
| `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` | Cloudflare Web Analytics site token (public). Unset, the page renders no analytics script. |

`NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SITE_URL` are fixed in the workflow (`API_URL`, `WEB_URL`). Page views are counted by Cloudflare Web Analytics (cookieless beacon), only when `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` is set at build time. Moving the site, step by step, in Portuguese: [docs/launch/front-container-apps.md](docs/launch/front-container-apps.md).

**Google sign-in.** Create an OAuth client of type "Web application" in Google Cloud and register these authorized redirect URIs (the path is fixed, `/signin-google`):

- local: `http://localhost:5055/signin-google` (and the port of any other API you run, e.g. `http://localhost:5101/signin-google`)
- production: `https://api.imperatle.com/signin-google`

Step by step, in Portuguese: [docs/launch/google-oauth-setup.md](docs/launch/google-oauth-setup.md). The login cookie is encrypted with ASP.NET Core Data Protection keys stored in the database (`DataProtectionKeys` table), so logins survive deploys and work across replicas.

### Stripe (Supporter purchase)

The one-time "Supporter (lifetime)" purchase goes through [Stripe Checkout](https://docs.stripe.com/payments/checkout); the author sells it and Stripe processes the payment. Step-by-step setup (test mode, then live), in Portuguese: [docs/launch/stripe-setup.md](docs/launch/stripe-setup.md). A local test purchase: [docs/launch/sandbox-purchase-test.md](docs/launch/sandbox-purchase-test.md) (`scripts/sandbox-test.ps1`).

| Variable | Where | What |
|---|---|---|
| `Stripe__SecretKey` | API (secret) | Secret API key, `sk_test_...` or `sk_live_...`. Empty = the purchase is unavailable. |
| `Stripe__WebhookSecret` | API (secret) | Signing secret of the webhook endpoint (`whsec_...`). Empty = every webhook is rejected. |
| `Stripe__SupporterPriceId` | API | The Supporter price (`price_...`), with an amount per currency; Checkout picks the buyer's. |
| `Stripe__WebhookToleranceSeconds` | API | How old a signed webhook may be before it's refused as stale. Default `300`. |

The web app needs no payment variable: it asks the API for the price (`GET /support/price`, cached for an hour) and for a Checkout session (`POST /support/checkout`: signed in, same origin, rate limited; a supporter is never charged again), then sends the player to Stripe's page. Stripe calls `POST /webhooks/stripe`, which checks the `Stripe-Signature`, refuses stale timestamps, records each event id so retries are applied once, sets `SupporterSinceUtc` on `checkout.session.completed` (or `async_payment_succeeded` for delayed methods) and clears it on a full refund (`charge.refunded`) or a lost dispute (`charge.dispute.closed`).

### Development and practice mode

| Setting | Where | What it does |
|---|---|---|
| `Dev:IsSupporter` (`Dev__IsSupporter`) | API, Development only | `true` makes every player a supporter (signed in or not), to try the supporter perks (past games, practice) without Google or Stripe. Applied as a Development-only wrapper around the real current player (`DevSupporterCurrentPlayer`); ignored outside Development. |

The ad slot (`apps/web/src/app/[locale]/AdSlot.tsx`, under the page content) is a reserved place only: it renders nothing while `ADS_ENABLED` in `apps/web/src/lib/ads.ts` is `false`, and never for supporters.

Practice opens only after the player's daily game of the day is over (won or lost): every `/practice` endpoint answers 409 `{"code":"daily_not_finished"}` until then (403 for non-supporters comes first), and once it is over any empire can be drawn, today's included. Practice mode's difficulty tiers live in [`apps/api/Content/practice-difficulty.json`](apps/api/Content/practice-difficulty.json): slugs listed per tier (easy, medium, hard), and empires not listed get a tier from their peak area (`thresholdsKm2`). Restart the API after editing it.

## Tests

- **API** (`tests/Imperatle.Api.Tests`, xUnit v3): scheduler rotation, content validation (including every shipped empire file and map), clue unlocking (one clue per wrong guess), the area and era comparisons, how much two maps share and how far apart they are (with the real shapes), guessed shapes served only to whoever guessed them, statistics, the content import, accounts (moving anonymous games into an account, `/me`, account deletion, login redirect and origin checks, server-side sessions: a login cookie replayed after logout, "sign out of all devices" and a deleted account are refused, on a TestServer), the Stripe checkout and webhook (signature, stale and replayed events, grant, refund and disputes), the archive and practice perks, and the launch integration (one owner rule for the daily game, stats, archive and practice, stored guesses rebuilt on a second device, the practice pool read from the query string through the real MVC pipeline). Run with `dotnet test --solution apps/api/Imperatle.Api.sln`. Simultaneous guesses (never more counted than the attempt limit) are checked against a real Postgres in `GuessConcurrencyPostgresTests`, skipped unless `IMPERATLE_TEST_POSTGRES` holds a connection string to a scratch database (e.g. `Host=localhost;Port=5432;Database=imperatle_fixes;Username=imperatle;Password=imperatle`; it migrates that database and adds rows to it).
- **Web** (`apps/web`, Vitest): share text, number and year formatting, empire name search, the `/me` client, the Supporter purchase flow, rebuilding a board from the server's progress, the clue order, practice options, the ad slot rule. Run with `npm test`. End-to-end (Playwright, its own API and database): `npm run e2e`.

CI runs both, plus lint, type checking and a production build, on every push and pull request. CodeQL scans C#, TypeScript and the workflows, and Dependabot keeps dependencies current.

## Deployment

On `main`, after the checks pass, the API image is pushed to GitHub Container Registry and deployed to Azure Container Apps (OIDC login, no stored passwords), then the workflow waits for the new revision to be healthy and smoke-tests the domain. Database migrations and the content import run when the API starts. A second job, "Deploy web to Azure", builds `apps/web/Dockerfile` and deploys the web app as its own Container App in the same environment the same way (after the API job, so a new page never meets an older API). It runs while the repository variable `AZURE_DEPLOY_WEB` is `true`.
