import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { Geist, Noto_Sans, Space_Grotesk } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import "./design.css";
import { I18nProvider } from "@/components/i18n-provider";
import ServiceWorkerRegistration from "@/components/service-worker";
import {
  LOCALE_COOKIE,
  LOCALE_TAGS,
  isLocale,
  negotiateLocale,
  translate,
  type Locale,
} from "@/lib/i18n";

const body = Geist({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});
const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
// Geist and Space Grotesk ship no Greek or Cyrillic glyphs. Loading Noto Sans
// for only those two subsets gives the browser a per-glyph fallback: Latin text
// still renders in the design system's fonts, while Greek and Russian text
// renders properly instead of dropping to an arbitrary system font.
const coverage = Noto_Sans({
  subsets: ["greek", "cyrillic"],
  variable: "--font-coverage",
  display: "swap",
});

/** The first paint must already be in the reader's language, so resolve it on the server. */
async function resolveLocale(): Promise<Locale> {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(stored)) return stored;
  return negotiateLocale((await headers()).get("accept-language"));
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale();
  return {
    title: translate(locale, "app.title"),
    description: translate(locale, "app.description"),
    manifest: "/manifest.webmanifest",
    applicationName: translate(locale, "app.name"),
    other: { "mobile-web-app-capable": "yes" },
  };
}

export const viewport = {
  themeColor: "#f7f5ef",
  width: "device-width",
  initialScale: 1,
};

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await resolveLocale();
  return (
    <html
      lang={LOCALE_TAGS[locale]}
      className={`${body.variable} ${display.variable} ${coverage.variable}`}
    >
      <body>
        <I18nProvider initialLocale={locale}>
          {children}
          <ServiceWorkerRegistration />
        </I18nProvider>
      </body>
    </html>
  );
}
