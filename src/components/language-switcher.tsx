"use client";
import { Languages } from "lucide-react";
import { useI18n } from "./i18n-provider";
import { LOCALES, LOCALE_LABELS, isLocale } from "@/lib/i18n";

/**
 * Each language is offered in its own script, which is what a reader scanning
 * for their own language actually looks for.
 */
export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <label className="language-switcher">
      <Languages size={16} aria-hidden="true" />
      <span className="visually-hidden">{t("lang.select")}</span>
      <select
        value={locale}
        aria-label={t("lang.select")}
        onChange={(event) => {
          if (isLocale(event.target.value)) setLocale(event.target.value);
        }}
      >
        {LOCALES.map((code) => (
          <option key={code} value={code} lang={code}>
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
