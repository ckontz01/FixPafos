"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_TAGS,
  formatDate,
  formatNumber,
  formatTimeAgo,
  translate,
  translatePlural,
  type Locale,
  type MessageKey,
  type MessageParams,
  type PluralBase,
} from "@/lib/i18n";

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, params?: MessageParams) => string;
  tp: (base: PluralBase, count: number, params?: MessageParams) => string;
  formatNumber: (value: number) => string;
  formatDate: (value: number | Date, options?: Intl.DateTimeFormatOptions) => string;
  timeAgo: (time: number) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

/**
 * The locale cookie is a display preference only. It carries no personal data,
 * so it is a plain readable cookie rather than an HttpOnly session cookie, and
 * the server reads it to render the first paint in the right language. It is
 * the single source of truth: no parallel copy is kept in browser storage.
 */
function persist(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  // The server already resolved the language from the cookie (and from any
  // ?lang= override, via middleware), so the initial value is authoritative and
  // needs no post-hydration correction.
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = LOCALE_TAGS[locale];
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    persist(next);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => translate(locale, key, params),
      tp: (base, count, params) => translatePlural(locale, base, count, params),
      formatNumber: (v) => formatNumber(locale, v),
      formatDate: (v, options) => formatDate(locale, v, options),
      timeAgo: (time) => formatTimeAgo(locale, time),
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  // A default-locale fallback keeps isolated component tests renderable without
  // forcing every one of them to mount a provider.
  return (
    value ?? {
      locale: DEFAULT_LOCALE,
      setLocale: () => {},
      t: (key: MessageKey, params?: MessageParams) =>
        translate(DEFAULT_LOCALE, key, params),
      tp: (base: PluralBase, count: number, params?: MessageParams) =>
        translatePlural(DEFAULT_LOCALE, base, count, params),
      formatNumber: (v: number) => formatNumber(DEFAULT_LOCALE, v),
      formatDate: (v: number | Date, options?: Intl.DateTimeFormatOptions) =>
        formatDate(DEFAULT_LOCALE, v, options),
      timeAgo: (time: number) => formatTimeAgo(DEFAULT_LOCALE, time),
    }
  );
}
