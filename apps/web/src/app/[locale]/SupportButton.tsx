"use client";

import { openSupport } from "@/lib/dialogs";
import { useMe } from "@/lib/me";

// Client island for the (server-rendered) footer. Supporters get a thank-you
// line instead of the button (shown until /me answers, like for everyone).
export function SupportButton({ label, supporterLabel }: { label: string; supporterLabel: string }) {
  const me = useMe();
  if (me?.authenticated && me.user?.isSupporter) {
    return <p className="font-display text-highlight">{supporterLabel}</p>;
  }

  return (
    <button
      type="button"
      onClick={openSupport}
      className="rounded-full border border-line px-4 py-1.5 font-medium text-foreground hover:bg-surface"
    >
      {label}
    </button>
  );
}
