import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "tr", "de"],
  defaultLocale: "en",
  localePrefix: "always",
});
