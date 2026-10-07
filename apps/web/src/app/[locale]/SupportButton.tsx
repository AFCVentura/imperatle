"use client";

import { openSupport } from "@/lib/dialogs";

// Client island for the (server-rendered) footer.
export function SupportButton({ label }: { label: string }) {
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
