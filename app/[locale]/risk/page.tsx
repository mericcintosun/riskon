import { getTranslations } from "next-intl/server";

type RiskPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function RiskPage({ params }: RiskPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "risk" });

  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p>{t("subtitle")}</p>
      <p className="text-sm text-gray-600">{t("status")}</p>
    </section>
  );
}
