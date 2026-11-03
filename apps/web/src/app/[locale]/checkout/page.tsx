import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CheckoutStarter } from "./CheckoutStarter";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Checkout" });
  return { title: `${t("title")} · Imperatle`, robots: { index: false } };
}

// Paddle's "default payment link": payment links Paddle creates outside the
// site's own button (e-mails, invoices, the dashboard) open this page with
// ?_ptxn=txn_..., and Paddle.js opens that checkout as soon as it loads.
export default async function Page({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Checkout");

  return (
    <div className="flex flex-1 flex-col items-center gap-3 px-4 pt-10 pb-8 text-center sm:px-6">
      <h1 className="font-display text-2xl tracking-wide">{t("title")}</h1>
      <CheckoutStarter />
      <Link href="/" className="text-sm underline underline-offset-4">
        {t("back")}
      </Link>
    </div>
  );
}
