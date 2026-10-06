import { getTranslations } from "next-intl/server";

interface FooterProps {
  challengeNumber: number | null;
}

export async function Footer({ challengeNumber }: FooterProps) {
  const t = await getTranslations("Footer");
  const year = new Date().getFullYear();

  return (
    <footer className="flex shrink-0 flex-col items-center gap-2 border-t border-line px-4 py-6 text-center text-sm text-muted">
      <button
        type="button"
        className="rounded-full border border-line px-4 py-1.5 font-medium text-foreground hover:bg-surface"
      >
        {t("support")}
      </button>
      <p>{t("copyright", { year })}</p>
      {challengeNumber !== null && <p>{t("challengeNumber", { number: challengeNumber })}</p>}
    </footer>
  );
}
