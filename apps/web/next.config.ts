import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  devIndicators: false,
  // A self-contained server (.next/standalone/server.js plus only the
  // node_modules it needs) for the Docker image that runs on Azure Container
  // Apps. Harmless on Vercel, which ignores it.
  output: "standalone",
  // The empire generator (app/dev, api/dev, api/geo) answers 404 in
  // production, but its routes still get traced: keep the local Cliopatria
  // index out of the image. (The API's content files, ../api/Content, are
  // outside the project root and never traced.)
  outputFileTracingExcludes: {
    "/*": ["./dev-data/**/*"],
  },
  // No next/image anywhere (icons and share images are static files). Off, the
  // /_next/image endpoint can't be used to make the server resize images, and
  // the Dockerfile can drop sharp and its libvips binaries (about 19 MB).
  images: { unoptimized: true },
};

export default withNextIntl(nextConfig);
