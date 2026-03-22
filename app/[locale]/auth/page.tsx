import { getTranslations } from "next-intl/server";

type AuthPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AuthPage({ params }: AuthPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });

  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p>{t("subtitle")}</p>
      <button className="rounded bg-black px-4 py-2 text-white" type="button">
        {t("action")}
      </button>
    </section>
  );
}
