import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

// Unknown pages, unknown archive dates and the like. Rendered inside the
// locale layout, so the header, menu and footer stay in place.
export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-8 text-center">
        <p className="font-display text-5xl text-highlight" aria-hidden>
          404
        </p>
        <h1 className="font-display text-lg">{t("title")}</h1>
        <p className="text-sm leading-relaxed">{t("body")}</p>
        <Link
          href="/"
          className="mt-1 rounded-full bg-accent px-6 py-1.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/85"
        >
          {t("backToGame")}
        </Link>
      </div>
    </div>
  );
}
