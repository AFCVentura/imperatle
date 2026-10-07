"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { sendFeedback, type FeedbackCategory } from "@/lib/api";
import { FEEDBACK_EVENT } from "@/lib/dialogs";
import { AppDialog } from "./AppDialog";

const CATEGORIES: FeedbackCategory[] = ["Bug", "Idea", "Content", "Other"];
const MAX_LENGTH = 2000;

type Status = "idle" | "sending" | "sent" | "error" | "tooMany";

export function FeedbackDialog() {
  const t = useTranslations("Feedback");
  const locale = useLocale();
  const [category, setCategory] = useState<FeedbackCategory>("Idea");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  // A finished send starts a fresh form the next time the dialog opens.
  function reset() {
    if (status !== "sent") return;
    setMessage("");
    setEmail("");
    setStatus("idle");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "sending" || message.trim().length < 3) return;
    setStatus("sending");
    const result = await sendFeedback({
      category,
      message,
      email: email || null,
      locale,
      website,
    });
    setStatus(result === "ok" ? "sent" : result);
  }

  return (
    <AppDialog event={FEEDBACK_EVENT} title={t("title")} onOpen={reset} selectable>
      {status === "sent" ? (
        <>
          <p>{t("thanks")}</p>
          <form method="dialog" className="self-center">
            <button className="rounded-full bg-accent px-6 py-1.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/85">
              {t("done")}
            </button>
          </form>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <p>{t("intro")}</p>

          <fieldset className="flex flex-wrap gap-1.5">
            <legend className="sr-only">{t("categoryLabel")}</legend>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  category === c
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-line text-foreground hover:bg-surface"
                }`}
              >
                {t(`categories.${c}`)}
              </button>
            ))}
          </fieldset>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">{t("messageLabel")}</span>
            <textarea
              required
              minLength={3}
              maxLength={MAX_LENGTH}
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t(`placeholders.${category}`)}
              className="resize-y rounded-xl border border-line bg-surface px-3 py-2 outline-none placeholder:text-muted/70 focus:border-highlight"
            />
            <span className="self-end text-[11px] tabular-nums text-muted">
              {message.length}/{MAX_LENGTH}
            </span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">{t("emailLabel")}</span>
            <input
              type="email"
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              className="rounded-full border border-line bg-surface px-3 py-1.5 outline-none placeholder:text-muted/70 focus:border-highlight"
            />
          </label>

          {/* Honeypot: invisible to people, bots fill it in. */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="hidden"
          />

          {status === "error" && <p className="text-danger">{t("error")}</p>}
          {status === "tooMany" && <p className="text-danger">{t("tooMany")}</p>}

          <button
            type="submit"
            disabled={status === "sending" || message.trim().length < 3}
            className="self-center rounded-full bg-accent px-6 py-1.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/85 disabled:opacity-40 disabled:hover:bg-accent"
          >
            {status === "sending" ? t("sending") : t("send")}
          </button>
        </form>
      )}
    </AppDialog>
  );
}
