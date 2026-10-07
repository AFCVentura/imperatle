import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { getLegalDocument, type LegalKind } from "@/lib/legal";

// hreflang/canonical for /{locale}/{kind}: the layout's alternates point at
// the home page, so each document page sets its own.
export function legalMetadata(kind: LegalKind, locale: string): Metadata {
  const doc = getLegalDocument(kind, locale);
  return {
    title: `${doc.title} · Imperatle`,
    alternates: {
      canonical: `/${locale}/${kind}`,
      languages: Object.fromEntries(routing.locales.map((l) => [l, `/${l}/${kind}`])),
    },
  };
}

export function LegalPage({ kind, locale }: { kind: LegalKind; locale: string }) {
  const doc = getLegalDocument(kind, locale);

  return (
    <article className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 pt-4 pb-10 text-sm leading-relaxed">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-2xl">{doc.title}</h1>
        <p className="text-muted">{doc.updated}</p>
      </header>
      <p>{doc.intro}</p>
      {doc.sections.map((section) => (
        <section key={section.heading} className="flex flex-col gap-2">
          <h2 className="font-display text-base text-muted">{section.heading}</h2>
          {section.paragraphs?.map((p) => <p key={p}>{p}</p>)}
          {section.items && (
            <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-highlight">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </article>
  );
}
