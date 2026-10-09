"use client";

import { useTranslations } from "next-intl";
import { ABOUT_EVENT, openFeedback } from "@/lib/dialogs";
import { AppDialog } from "./AppDialog";

const AUTHOR_URL = "https://jventura.dev";
const SOURCE_URLS = {
  clio: "https://github.com/Seshat-Global-History-Databank/cliopatria",
  license: "https://creativecommons.org/licenses/by/4.0/",
  ne: "https://www.naturalearthdata.com/",
};

export function AboutDialog() {
  const t = useTranslations("About");

  return (
    <AppDialog event={ABOUT_EVENT} title={t("title")} selectable>
      <p>{t("what")}</p>

      <section className="flex flex-col gap-1">
        <h3 className="font-display text-base text-muted">{t("editorialTitle")}</h3>
        <p>{t("editorial")}</p>
      </section>

      <section className="flex flex-col gap-1">
        <h3 className="font-display text-base text-muted">{t("sourcesTitle")}</h3>
        <p>
          {t.rich("sources", {
            clio: (chunks) => <ExternalLink href={SOURCE_URLS.clio}>{chunks}</ExternalLink>,
            license: (chunks) => <ExternalLink href={SOURCE_URLS.license}>{chunks}</ExternalLink>,
            ne: (chunks) => <ExternalLink href={SOURCE_URLS.ne}>{chunks}</ExternalLink>,
          })}
        </p>
        {/* method="dialog": the click closes this dialog, then opens Feedback. */}
        <form method="dialog">
          {t("mistakes")}{" "}
          <button onClick={openFeedback} className="font-semibold text-highlight underline underline-offset-2">
            {t("mistakesLink")}
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-1">
        <h3 className="font-display text-base text-muted">{t("authorTitle")}</h3>
        <p>
          {t.rich("author", {
            link: (chunks) => <ExternalLink href={AUTHOR_URL}>{chunks}</ExternalLink>,
          })}
        </p>
        <p className="text-xs text-muted">{t("stack")}</p>
      </section>
    </AppDialog>
  );
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-highlight underline underline-offset-2">
      {children}
    </a>
  );
}
