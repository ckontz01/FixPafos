import test from "node:test";
import assert from "node:assert/strict";
import {
  LOCALES,
  dictionaries,
  translate,
  translatePlural,
  formatTimeAgo,
  negotiateLocale,
  isLocale,
  isMessageKey,
  DEFAULT_LOCALE,
  type Locale,
  type MessageKey,
} from "../src/lib/i18n";

const placeholders = (value: string) =>
  [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test("every locale defines exactly the canonical key set with usable values", () => {
  const canonical = Object.keys(dictionaries.el).sort();
  assert.ok(canonical.length > 250, "expected a substantial dictionary");
  for (const locale of LOCALES) {
    assert.deepEqual(
      Object.keys(dictionaries[locale]).sort(),
      canonical,
      `${locale} key set diverged from Greek`,
    );
    for (const [key, value] of Object.entries(dictionaries[locale])) {
      assert.equal(typeof value, "string", `${locale}/${key} is not a string`);
      assert.ok(value.trim().length > 0, `${locale}/${key} is empty`);
    }
  }
});

test("translated strings keep the same interpolation placeholders", () => {
  for (const [key, greek] of Object.entries(dictionaries.el)) {
    const expected = placeholders(greek);
    for (const locale of LOCALES) {
      assert.deepEqual(
        placeholders(dictionaries[locale][key as MessageKey]),
        expected,
        `${locale}/${key} placeholders diverged from Greek`,
      );
    }
  }
});

test("no locale leaks another language into its own user-facing strings", () => {
  const greek = /[\u0370-\u03ff]/;
  const cyrillic = /[\u0400-\u04ff]/;
  for (const [key, value] of Object.entries(dictionaries.ru)) {
    // The report placeholder deliberately names all three languages.
    if (key === "report.messagePlaceholder") continue;
    assert.ok(!greek.test(value), `ru/${key} contains Greek text`);
  }
  for (const [key, value] of Object.entries(dictionaries.el)) {
    if (key === "report.messagePlaceholder") continue;
    assert.ok(!cyrillic.test(value), `el/${key} contains Cyrillic text`);
  }
});

test("interpolation substitutes named parameters and leaves unknown ones intact", () => {
  assert.equal(
    translate("en", "board.updatesPaused", { message: "offline" }),
    "Updates paused: offline",
  );
  // A missing parameter must not throw or silently blank the sentence.
  assert.match(translate("en", "board.updatesPaused"), /\{message\}/);
});

test("Russian selects one, few and many where Greek and English do not", () => {
  const forms = (locale: Locale, count: number) =>
    translatePlural(locale, "board.reportCount", count);
  assert.equal(forms("ru", 1), "1 сообщение");
  assert.equal(forms("ru", 3), "3 сообщения");
  assert.equal(forms("ru", 7), "7 сообщений");
  // 21 is "one" in Russian but plural in English: the rule, not the digit, wins.
  assert.equal(forms("ru", 21), "21 сообщение");
  assert.equal(forms("en", 1), "1 report");
  assert.equal(forms("en", 21), "21 reports");
  assert.equal(forms("el", 1), "1 αναφορά");
  assert.equal(forms("el", 5), "5 αναφορές");
});

test("relative time is rendered in the active language", () => {
  const twoHoursAgo = Date.now() - 2 * 3600_000;
  assert.equal(formatTimeAgo("en", twoHoursAgo), "2h ago");
  assert.equal(formatTimeAgo("ru", twoHoursAgo), "2 ч назад");
  assert.equal(formatTimeAgo("el", Date.now()), "Μόλις τώρα");
});

test("locale negotiation prefers a supported language and falls back to Greek", () => {
  assert.equal(negotiateLocale("ru-RU,ru;q=0.9,en;q=0.8"), "ru");
  assert.equal(negotiateLocale("en-GB,en;q=0.9"), "en");
  // Unsupported languages fall back to the primary local language, not English.
  assert.equal(negotiateLocale("de-DE,de;q=0.9"), DEFAULT_LOCALE);
  assert.equal(negotiateLocale(null), DEFAULT_LOCALE);
  // A lower-priority supported language still wins over unsupported ones.
  assert.equal(negotiateLocale("de;q=0.9,ru;q=0.4"), "ru");
});

test("every error code the API can return is translatable in every locale", async () => {
  const { ERROR_FALLBACKS } = await import("../src/lib/http");
  for (const code of Object.keys(ERROR_FALLBACKS)) {
    assert.ok(
      isMessageKey(code),
      `${code} is returned by the API but has no translation, so a reader would see a raw key`,
    );
    for (const locale of LOCALES)
      assert.ok(
        translate(locale, code as MessageKey).trim().length > 0,
        `${code} is empty in ${locale}`,
      );
  }
});

test("only the three supported locale codes are accepted", () => {
  assert.ok(isLocale("el") && isLocale("en") && isLocale("ru"));
  assert.ok(!isLocale("de") && !isLocale("") && !isLocale(undefined));
});
