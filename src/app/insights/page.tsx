import Link from "next/link";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { cookies, headers } from "next/headers";
import { getInsights, type InsightFilters } from "@/lib/insights";
import { categoryIds, severityLevels } from "@/lib/issues";
import { departmentIds } from "@/lib/departments";
import {
  LOCALE_COOKIE,
  LOCALE_TAGS,
  isLocale,
  negotiateLocale,
  translate,
  type Locale,
  type MessageKey,
} from "@/lib/i18n";
import InsightsView from "@/components/insights-view";

export const dynamic = "force-dynamic";

async function resolveLocale(): Promise<Locale> {
  const stored = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(stored)) return stored;
  return negotiateLocale((await headers()).get("accept-language"));
}

const DAY = 86_400_000;
const PERIODS = { 30: 30, 90: 90, 365: 365 } as const;

function parseFilters(params: Record<string, string | string[] | undefined>) {
  const one = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const period = one("period");
  const days = PERIODS[period as unknown as keyof typeof PERIODS];
  const category = one("category");
  const departmentId = one("department");
  const severity = one("severity");
  const status = one("status");
  const filters: InsightFilters = {
    from: days ? Date.now() - days * DAY : undefined,
    category: categoryIds.includes(category as never) ? category : undefined,
    departmentId: departmentIds.includes(departmentId as never)
      ? departmentId
      : undefined,
    severity: (severityLevels as readonly string[]).includes(severity ?? "")
      ? severity
      : undefined,
    status: status === "open" || status === "resolved" ? status : undefined,
  };
  return { filters, period: period ?? "all" };
}

export async function generateMetadata() {
  const locale = await resolveLocale();
  return {
    title: `${translate(locale, "insights.title")} · ${translate(locale, "app.name")}`,
    description: translate(locale, "insights.subtitle"),
  };
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await resolveLocale();
  const { filters, period } = parseFilters(await searchParams);

  // A database that is not reachable must not take the whole page down: the
  // dashboard says it has no data rather than rendering an error screen.
  let insights = null;
  try {
    insights = await getInsights(filters);
  } catch (error) {
    // Log why, without leaking connection details into the response.
    console.error(
      "Insights could not be computed:",
      error instanceof Error ? error.message : "unknown error",
    );
  }

  const t = (key: MessageKey, params?: Record<string, string | number>) =>
    translate(locale, key, params);

  return (
    <main className="insights-page" id="main-content">
      <header className="insights-header">
        <Link className="back-link" href="/">
          <ArrowLeft size={17} /> {t("insights.backToMap")}
        </Link>
        <div className="insights-title">
          <BarChart3 size={26} aria-hidden="true" />
          <div>
            <h1>{t("insights.title")}</h1>
            <p>{t("insights.subtitle")}</p>
          </div>
        </div>
      </header>

      {!insights || !insights.hasAnyData ? (
        <p className="chart-empty standalone">{t("insights.noReports")}</p>
      ) : (
        <InsightsView
          insights={insights}
          locale={locale}
          localeTag={LOCALE_TAGS[locale]}
          period={period}
        />
      )}

      <p className="insights-method">{t("insights.method")}</p>
    </main>
  );
}
