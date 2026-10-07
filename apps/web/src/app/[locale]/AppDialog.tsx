"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, type ReactNode } from "react";

interface AppDialogProps {
  // Window event that opens this dialog (see lib/dialogs.ts).
  event: string;
  title: string;
  // Receives the opening event, for dialogs whose content depends on it.
  onOpen?: (event: Event) => void;
  // Reading/tooling dialogs block text selection; ones with text worth
  // copying or a form keep it.
  selectable?: boolean;
  // A button inside <form method="dialog"> closes the dialog natively.
  children: ReactNode;
}

// Shared shell for the app's dialogs. Native <dialog> + showModal(): focus
// trapping, Escape to close and the backdrop come for free; a click on the
// backdrop lands on the <dialog> element itself and closes it.
export function AppDialog({ event, title, onOpen, selectable = false, children }: AppDialogProps) {
  const t = useTranslations("Common");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const onOpenRef = useRef(onOpen);

  useEffect(() => {
    onOpenRef.current = onOpen;
  });

  useEffect(() => {
    const open = (e: Event) => {
      dialogRef.current?.showModal();
      onOpenRef.current?.(e);
    };
    window.addEventListener(event, open);
    return () => window.removeEventListener(event, open);
  }, [event]);

  const close = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === dialogRef.current) close();
      }}
      className={`m-auto max-h-[85dvh] w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-line bg-background p-0 text-foreground shadow-xl backdrop:bg-black/50 ${
        selectable ? "" : "select-none"
      }`}
    >
      <div className="flex flex-col gap-4 px-5 py-4 text-sm leading-relaxed">
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="font-display text-xl">
            {title}
          </h2>
          <button
            type="button"
            aria-label={t("close")}
            onClick={close}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
