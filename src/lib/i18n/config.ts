// Canonical locale configuration. Locale codes are stable identifiers and are
// never translated; only the display labels below change per language.
export const LOCALES = ["el", "en", "ru"] as const;
export type Locale = (typeof LOCALES)[number];
// Greek is the primary language of Pafos; English and Russian follow the two
// largest additional language communities in the city.
export const DEFAULT_LOCALE: Locale = "el";
export const LOCALE_STORAGE_KEY = "pafoslive-locale";
export const LOCALE_COOKIE = "pafos-locale";
// Endonyms: each language is offered in its own script.
export const LOCALE_LABELS: Record<Locale, string> = {
  el: "Ελληνικά",
  en: "English",
  ru: "Русский",
};
// BCP 47 tags for <html lang>, Intl formatters and speech recognition.
export const LOCALE_TAGS: Record<Locale, string> = {
  el: "el-GR",
  en: "en-GB",
  ru: "ru-RU",
};
export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && (LOCALES as readonly string[]).includes(value);
// Accept-Language is advisory: an explicit choice always wins over negotiation.
export function negotiateLocale(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return {
        tag: tag.trim().toLowerCase(),
        q: q ? Number.parseFloat(q.split("=")[1]) || 0 : 1,
      };
    })
    .filter((entry) => entry.tag)
    .sort((a, b) => b.q - a.q);
  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}
