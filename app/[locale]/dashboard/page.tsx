import { getTranslations } from "next-intl/server";

type DashboardPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard" });

  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p>{t("subtitle")}</p>
      <p className="text-sm text-gray-600">{t("summary")}</p>
    </section>
  );
}
