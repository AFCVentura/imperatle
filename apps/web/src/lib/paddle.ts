import type { Environments, Paddle, PaddleEventData, PricePreviewResponse } from "@paddle/paddle-js";

// Paddle Billing in the browser: the overlay checkout and the localized price
// of the Supporter (lifetime) purchase. Public values only; the webhook
// secret lives in the API. See README "Configuration".
export interface PaddleConfig {
  clientToken: string;
  priceId: string;
  environment: Environments;
}

export function readPaddleConfig(env: Record<string, string | undefined>): PaddleConfig | null {
  const clientToken = env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN?.trim();
  const priceId = env.NEXT_PUBLIC_PADDLE_SUPPORTER_PRICE_ID?.trim();
  if (!clientToken || !priceId) return null;
  const environment: Environments = env.NEXT_PUBLIC_PADDLE_ENVIRONMENT?.trim() === "production" ? "production" : "sandbox";
  return { clientToken, priceId, environment };
}

// NEXT_PUBLIC_* are inlined at build time only when written out in full.
export const PADDLE_CONFIG = readPaddleConfig({
  NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
  NEXT_PUBLIC_PADDLE_SUPPORTER_PRICE_ID: process.env.NEXT_PUBLIC_PADDLE_SUPPORTER_PRICE_ID,
  NEXT_PUBLIC_PADDLE_ENVIRONMENT: process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT,
});

// The price as Paddle shows it in the visitor's country (currency, local
// price override and taxes included), e.g. "US$ 4.99" or "R$ 19,90".
export function formattedSupporterPrice(preview: PricePreviewResponse | null | undefined): string | null {
  const line = preview?.data?.details?.lineItems?.[0];
  return line?.formattedTotals?.total ?? null;
}

// Paddle.Initialize() can run only once per page, so every caller shares one
// instance and listens to its events through this set.
type Listener = (event: PaddleEventData) => void;
const listeners = new Set<Listener>();
let instance: Promise<Paddle | undefined> | null = null;

export function onPaddleEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPaddle(config: PaddleConfig): Promise<Paddle | undefined> {
  if (!instance) {
    instance = import("@paddle/paddle-js")
      .then(({ initializePaddle }) =>
        initializePaddle({
          token: config.clientToken,
          environment: config.environment,
          eventCallback: (event) => listeners.forEach((listener) => listener(event)),
        }),
      )
      .catch(() => {
        // Blocked by an extension or offline: let a later click try again.
        instance = null;
        return undefined;
      });
  }
  return instance;
}
