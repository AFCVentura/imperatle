# Production image of the web app for Azure Container Apps.
# Build from apps/web:  docker build -t imperatle-web --build-arg NEXT_PUBLIC_API_URL=https://api.imperatle.com .
#
# Node LTS, pinned to an exact version and Alpine release so a rebuild doesn't
# change the runtime under us. Dependabot (docker ecosystem) can bump it.
ARG NODE_IMAGE=node:24.22.2-alpine3.24

# 1. Dependencies, in their own layer: reused while package-lock.json doesn't change.
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# 2. Build. NEXT_PUBLIC_* values are inlined into the bundle by "next build",
# so they are build arguments, not runtime settings: changing one means a new
# image. They are all public by design (the browser sees them anyway).
FROM ${NODE_IMAGE} AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=https://api.imperatle.com
ARG NEXT_PUBLIC_SITE_URL=https://imperatle.com
ARG NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=
ARG NEXT_PUBLIC_PADDLE_SUPPORTER_PRICE_ID=
ARG NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox
# Cloudflare Web Analytics site token; empty = no analytics beacon.
ARG NEXT_PUBLIC_CF_ANALYTICS_TOKEN=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=$NEXT_PUBLIC_PADDLE_CLIENT_TOKEN \
    NEXT_PUBLIC_PADDLE_SUPPORTER_PRICE_ID=$NEXT_PUBLIC_PADDLE_SUPPORTER_PRICE_ID \
    NEXT_PUBLIC_PADDLE_ENVIRONMENT=$NEXT_PUBLIC_PADDLE_ENVIRONMENT \
    NEXT_PUBLIC_CF_ANALYTICS_TOKEN=$NEXT_PUBLIC_CF_ANALYTICS_TOKEN \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# sharp (with libvips, about 19 MB) is only loaded by the image optimizer,
# which is off (images.unoptimized in next.config.ts), so it leaves the bundle.
RUN npm run build && rm -rf .next/standalone/node_modules/sharp .next/standalone/node_modules/@img

# 3. Runtime: the standalone server only (no npm, no full node_modules, no sources).
FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080 \
    HOSTNAME=0.0.0.0

# npm and corepack aren't needed to run server.js; dropping them saves space
# and removes packages a scanner would flag.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

# "node" (uid 1000) ships with the image. The app files belong to root and are
# read-only for it; only the Next.js cache folder is writable.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
RUN mkdir -p .next/cache && chown node:node .next/cache
USER node

# Same port as the API (Container Apps ingress target port 8080).
EXPOSE 8080

# Container Apps uses its own probes (see docs/launch/front-container-apps.md);
# this one is for "docker run" and anything else that reads it.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

# HOSTNAME is forced here too: some runtimes (Kubernetes, which Container Apps
# runs on) set it to the replica's name, and server.js would then listen on
# that address only, missing the probes on 127.0.0.1. "exec" keeps node as
# PID 1, so it gets the stop signal directly.
CMD ["/bin/sh", "-c", "HOSTNAME=0.0.0.0 exec node server.js"]
