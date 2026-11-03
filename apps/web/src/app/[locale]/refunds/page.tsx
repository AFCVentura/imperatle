import { setRequestLocale } from "next-intl/server";
import { LegalPage, legalMetadata } from "../LegalPage";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return legalMetadata("refunds", locale);
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalPage kind="refunds" locale={locale} />;
}
