const RTL_LOCALES = new Set(["ar", "fa", "he", "ur"]);

export function getLocaleDirection(locale: string): "ltr" | "rtl" {
  return RTL_LOCALES.has(locale) ? "rtl" : "ltr";
}
