"use client";

import { openChangelog } from "@/lib/dialogs";

// The game's version in the footer; a click opens the list of changes.
export function VersionButton({ label, title }: { label: string; title: string }) {
  return (
    <button type="button" onClick={openChangelog} title={title} className="font-display underline-offset-2 hover:text-foreground hover:underline">
      {label}
    </button>
  );
}
