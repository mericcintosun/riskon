"use client";

import { useLocale, useTranslations } from "next-intl";
import { ChangeEvent } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export default function LanguageSwitcher() {
  const t = useTranslations("navigation");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const onSelectChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const nextLocale = event.target.value as (typeof routing.locales)[number];
    router.replace(pathname, { locale: nextLocale });
    router.refresh();
  };

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span>{t("language")}</span>
      <select
        value={locale}
        onChange={onSelectChange}
        className="rounded border border-gray-300 px-2 py-1"
      >
        {routing.locales.map((supportedLocale) => (
          <option key={supportedLocale} value={supportedLocale}>
            {supportedLocale.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}
