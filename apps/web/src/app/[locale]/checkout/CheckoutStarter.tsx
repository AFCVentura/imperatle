"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { openSupport } from "@/lib/dialogs";
import { PADDLE_CONFIG, getPaddle } from "@/lib/paddle";
import { checkoutTransactionId } from "@/lib/checkoutLink";

type Status = "opening" | "unavailable";

// With a Paddle transaction in the URL, loading Paddle.js is enough: it opens
// that checkout by itself, and the support dialog (mounted in the layout)
// shows the thank-you when the payment completes. Without one, the visitor
// just gets the normal support dialog.
export function CheckoutStarter() {
  const t = useTranslations("Checkout");
  const [status, setStatus] = useState<Status>("opening");

  useEffect(() => {
    const transactionId = checkoutTransactionId(window.location.search);
    if (!transactionId || !PADDLE_CONFIG) {
      openSupport();
      return;
    }
    void getPaddle(PADDLE_CONFIG).then((paddle) => {
      if (!paddle) setStatus("unavailable");
    });
  }, []);

  return (
    <p className="max-w-md text-sm text-muted" role="status">
      {status === "opening" ? t("opening") : t("unavailable")}
    </p>
  );
}
