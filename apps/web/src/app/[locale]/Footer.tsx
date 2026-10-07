import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SupportButton } from "./SupportButton";

interface FooterProps {
  challengeNumber: number | null;
}

export async function Footer({ challengeNumber }: FooterProps) {
  const t = await getTranslations("Footer");
  const year = new Date().getFullYear();

  return (
    <footer className="flex shrink-0 flex-col items-center gap-2 border-t border-line px-4 py-6 text-center text-sm text-muted">
      <SupportButton label={t("support")} />
      <p className="font-display">{t("copyright", { year })}</p>
      {challengeNumber !== null && <p className="font-display">{t("challengeNumber", { number: challengeNumber })}</p>}
      <nav className="flex gap-4 text-xs">
        <Link href="/privacy" className="underline-offset-2 hover:text-foreground hover:underline">
          {t("privacy")}
        </Link>
        <Link href="/terms" className="underline-offset-2 hover:text-foreground hover:underline">
          {t("terms")}
        </Link>
      </nav>
    </footer>
  );
}
