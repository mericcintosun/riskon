"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Navigation() {
  const t = useTranslations("navigation");

  return (
    <header className="border-b border-gray-200 bg-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <strong>{t("appName")}</strong>
          <Link href="/">{t("home")}</Link>
          <Link href="/dashboard">{t("dashboard")}</Link>
          <Link href="/auth">{t("auth")}</Link>
          <Link href="/risk">{t("risk")}</Link>
        </div>
        <LanguageSwitcher />
      </nav>
    </header>
  );
}
