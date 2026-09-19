import { el, type MessageKey, type Messages } from "./messages/el";
import { en } from "./messages/en";
import { ru } from "./messages/ru";
import { DEFAULT_LOCALE, LOCALE_TAGS, type Locale } from "./config";

export * from "./config";
export type { MessageKey, Messages };

export const dictionaries: Record<Locale, Messages> = { el, en, ru };

/**
 * Keys ending in `.other` mark a plural family, so the plural helper only
 * accepts bases that genuinely have every CLDR form defined.
 */
export type PluralBase = MessageKey extends infer K
  ? K extends `${infer Base}.other`
    ? Base
    : never
  : never;

export type MessageParams = Record<string, string | number>;

/**
 * Guard for values arriving from outside the bundle, such as the `code` field
 * on an API error response. Unknown codes fall back to the server's own
 * human-readable message rather than rendering a raw key at the reader.
 */
export const isMessageKey = (value: unknown): value is MessageKey =>
  typeof value === "string" && Object.hasOwn(dictionaries.el, value);

const PLACEHOLDER = /\{(\w+)\}/g;

function interpolate(template: string, params?: MessageParams) {
  if (!params) return template;
  return template.replace(PLACEHOLDER, (match, name: string) =>
    Object.hasOwn(params, name) ? String(params[name]) : match,
  );
}

/** Translate a key. Missing keys cannot happen at runtime: they fail to compile. */
export function translate(
  locale: Locale,
  key: MessageKey,
  params?: MessageParams,
): string {
  const dictionary = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
  return interpolate(dictionary[key] ?? dictionaries[DEFAULT_LOCALE][key], params);
}

const pluralRules = new Map<Locale, Intl.PluralRules>();

function rulesFor(locale: Locale) {
  let rules = pluralRules.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(LOCALE_TAGS[locale]);
    pluralRules.set(locale, rules);
  }
  return rules;
}

/**
 * Resolve a plural family with the locale's own CLDR category. Greek and English
 * only ever select `one`/`other`; Russian also uses `few` and `many`.
 */
export function translatePlural(
  locale: Locale,
  base: PluralBase,
  count: number,
  params?: MessageParams,
): string {
  const category = rulesFor(locale).select(count);
  const key = `${base}.${category}` as MessageKey;
  const dictionary = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
  const template = dictionary[key] ?? dictionary[`${base}.other` as MessageKey];
  return interpolate(template, { count, ...params });
}

export const formatNumber = (locale: Locale, value: number) =>
  new Intl.NumberFormat(LOCALE_TAGS[locale]).format(value);

export const formatDate = (
  locale: Locale,
  value: number | Date,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" },
) => new Intl.DateTimeFormat(LOCALE_TAGS[locale], options).format(value);

/**
 * Relative time for report timestamps. Kept as explicit message keys rather than
 * Intl.RelativeTimeFormat so the wording matches the rest of the interface.
 */
export function formatTimeAgo(locale: Locale, time: number): string {
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (minutes < 1) return translate(locale, "common.justNow");
  if (minutes < 60) return translate(locale, "common.minutesAgo", { count: minutes });
  if (minutes < 1440)
    return translate(locale, "common.hoursAgo", { count: Math.floor(minutes / 60) });
  return formatDate(locale, time);
}
