"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useI18n } from "./i18n-provider";
import {
  BarList,
  ChartCard,
  DataTable,
  StatTile,
  TimeSeries,
  compact,
  type BarDatum,
} from "./charts";
import type { Insights } from "@/lib/insights";
import { categoryIds, severityLevels, type Severity } from "@/lib/issues";
import { departmentIds, departmentShortName } from "@/lib/departments";
import type { Locale, MessageKey } from "@/lib/i18n";

const SEVERITY_FILL: Record<Severity, string> = {
  low: "var(--chart-severity-low)",
  medium: "var(--chart-severity-medium)",
  high: "var(--chart-severity-high)",
  critical: "var(--chart-severity-critical)",
};

export default function InsightsView({
  insights,
  localeTag,
  period,
}: {
  insights: Insights;
  locale: Locale;
  localeTag: string;
  period: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/insights?${next.toString()}`);
  };

  const number = (value: number) =>
    new Intl.NumberFormat(localeTag).format(value);

  /** Durations read as hours below two days, and whole days above. */
  const duration = (hours: number | null) => {
    if (hours === null) return t("common.notAvailable");
    if (hours < 48)
      return `${number(Math.round(hours))} ${t("insights.hoursUnit")}`;
    return `${number(Math.round(hours / 24))} ${t("insights.daysUnit")}`;
  };

  const monthName = (mm: string) =>
    new Intl.DateTimeFormat(localeTag, { month: "short" }).format(
      new Date(Date.UTC(2026, Number(mm) - 1, 1)),
    );

  const dayLabel = (iso: string) =>
    new Intl.DateTimeFormat(localeTag, {
      day: "numeric",
      month: "short",
    }).format(new Date(`${iso}T00:00:00Z`));

  const categoryBars: BarDatum[] = insights.byCategory.map((c) => ({
    key: c.key,
    label: t(`category.${c.key}` as MessageKey),
    value: c.count,
  }));
  const departmentBars: BarDatum[] = insights.byDepartment.map((d) => ({
    key: d.key,
    label: departmentShortName(t(`department.${d.key}` as MessageKey)),
    title: t(`department.${d.key}` as MessageKey),
    value: d.count,
  }));
  const severityBars: BarDatum[] = [...insights.bySeverity]
    .sort(
      (a, b) =>
        severityLevels.indexOf(b.key as Severity) -
        severityLevels.indexOf(a.key as Severity),
    )
    .map((s) => ({
      key: s.key,
      label: t(`severity.${s.key}` as MessageKey),
      value: s.count,
      fill: SEVERITY_FILL[s.key as Severity],
    }));
  const statusBars: BarDatum[] = insights.byStatus.map((s) => ({
    key: s.key,
    label:
      s.key === "resolved" ? t("status.resolvedPlain") : t("status.openPlain"),
    value: s.count,
    fill: s.key === "resolved" ? "var(--chart-resolved)" : "var(--chart-open)",
  }));
  const hotspotBars: BarDatum[] = insights.hotspots.map((h, i) => ({
    key: `${h.latitude},${h.longitude},${i}`,
    label: h.label || `${h.latitude.toFixed(3)}, ${h.longitude.toFixed(3)}`,
    value: h.count,
  }));
  const recurringBars: BarDatum[] = insights.recurring.map((h, i) => ({
    key: `${h.label}-${i}`,
    label: h.label,
    value: h.count,
  }));
  const clusterBars: BarDatum[] = insights.clusters.map((c) => ({
    key: c.clusterId,
    label: `${t("insights.clusterLabel")} ${c.clusterId.slice(0, 8)}`,
    value: c.size,
  }));
  const seasonalBars: BarDatum[] = insights.seasonal.map((s) => ({
    key: s.key,
    label: monthName(s.key),
    value: s.count,
  }));
  const performanceBars: BarDatum[] = insights.departments
    .filter((d) => d.medianHours !== null)
    .sort((a, b) => (a.medianHours ?? 0) - (b.medianHours ?? 0))
    .map((d) => ({
      key: d.departmentId,
      label: departmentShortName(
        t(`department.${d.departmentId}` as MessageKey),
      ),
      title: t(`department.${d.departmentId}` as MessageKey),
      value: d.medianHours ?? 0,
      display: duration(d.medianHours),
    }));

  const empty = t("insights.noData");

  return (
    <>
      {insights.totals.demoOnly && (
        <p className="demo-banner" role="status">
          {t("insights.demoBanner")}
        </p>
      )}

      <section className="insights-filters" aria-label={t("insights.filters")}>
        <label>
          {t("insights.period")}
          <select
            value={period}
            onChange={(e) => setParam("period", e.target.value)}
          >
            <option value="all">{t("insights.allTime")}</option>
            <option value="30">{t("insights.last30")}</option>
            <option value="90">{t("insights.last90")}</option>
            <option value="365">{t("insights.last365")}</option>
          </select>
        </label>
        <label>
          {t("insights.category")}
          <select
            value={params.get("category") ?? ""}
            onChange={(e) => setParam("category", e.target.value)}
          >
            <option value="">{t("insights.allCategories")}</option>
            {categoryIds.map((id) => (
              <option key={id} value={id}>
                {t(`category.${id}` as MessageKey)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("insights.department")}
          <select
            value={params.get("department") ?? ""}
            onChange={(e) => setParam("department", e.target.value)}
          >
            <option value="">{t("insights.allDepartments")}</option>
            {departmentIds.map((id) => (
              <option key={id} value={id}>
                {t(`department.${id}` as MessageKey)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("severity.label")}
          <select
            value={params.get("severity") ?? ""}
            onChange={(e) => setParam("severity", e.target.value)}
          >
            <option value="">{t("insights.allSeverities")}</option>
            {severityLevels.map((id) => (
              <option key={id} value={id}>
                {t(`severity.${id}` as MessageKey)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("board.statusFilter")}
          <select
            value={params.get("status") ?? ""}
            onChange={(e) => setParam("status", e.target.value)}
          >
            <option value="">{t("insights.allStatuses")}</option>
            <option value="open">{t("status.openPlain")}</option>
            <option value="resolved">{t("status.resolvedPlain")}</option>
          </select>
        </label>
      </section>

      <section className="stat-row" aria-label={t("insights.totalReports")}>
        <StatTile
          label={t("insights.totalReports")}
          value={compact(insights.totals.total, localeTag)}
        />
        <StatTile
          label={t("insights.activeIssues")}
          value={compact(insights.totals.open, localeTag)}
        />
        <StatTile
          label={t("insights.resolvedIssues")}
          value={compact(insights.totals.resolved, localeTag)}
        />
        <StatTile
          label={t("insights.resolutionRate")}
          value={
            insights.totals.resolutionRate === null
              ? t("common.notAvailable")
              : new Intl.NumberFormat(localeTag, {
                  style: "percent",
                  maximumFractionDigits: 0,
                }).format(insights.totals.resolutionRate)
          }
        />
        <StatTile
          label={t("insights.medianResolution")}
          value={duration(insights.resolution.medianHours)}
        />
        <StatTile
          label={t("insights.avgResolution")}
          value={duration(insights.resolution.averageHours)}
        />
      </section>

      <div className="chart-grid">
        <ChartCard
          title={t("insights.overTime")}
          table={
            <DataTable
              columns={[
                t("insights.day"),
                t("insights.opened"),
                t("insights.resolvedSeries"),
              ]}
              rows={insights.overTime.map((p) => [
                dayLabel(p.day),
                p.opened,
                p.resolved,
              ])}
            />
          }
        >
          <TimeSeries
            points={insights.overTime.map((p) => ({
              label: dayLabel(p.day),
              opened: p.opened,
              resolved: p.resolved,
            }))}
            bucket={insights.bucket}
            emptyLabel={empty}
            openedLabel={t("insights.opened")}
            resolvedLabel={t("insights.resolvedSeries")}
            locale={localeTag}
          />
        </ChartCard>

        <ChartCard
          title={t("insights.byCategory")}
          table={
            <DataTable
              columns={[t("insights.category"), t("insights.count")]}
              rows={categoryBars.map((b) => [b.label, b.value])}
            />
          }
        >
          <BarList data={categoryBars} emptyLabel={empty} locale={localeTag} />
        </ChartCard>

        <ChartCard
          title={t("insights.byDepartment")}
          table={
            <DataTable
              columns={[t("insights.department"), t("insights.count")]}
              rows={departmentBars.map((b) => [b.label, b.value])}
            />
          }
        >
          <BarList data={departmentBars} emptyLabel={empty} locale={localeTag} />
        </ChartCard>

        <ChartCard
          title={t("insights.bySeverity")}
          description={t("severity.advisory")}
          table={
            <DataTable
              columns={[t("severity.label"), t("insights.count")]}
              rows={severityBars.map((b) => [b.label, b.value])}
            />
          }
        >
          <BarList data={severityBars} emptyLabel={empty} locale={localeTag} />
        </ChartCard>

        <ChartCard
          title={t("insights.byStatus")}
          table={
            <DataTable
              columns={[t("board.statusFilter"), t("insights.count")]}
              rows={statusBars.map((b) => [b.label, b.value])}
            />
          }
        >
          <BarList data={statusBars} emptyLabel={empty} locale={localeTag} />
        </ChartCard>

        <ChartCard
          title={t("insights.departmentPerformance")}
          description={t("insights.medianLabel")}
          table={
            <DataTable
              columns={[t("insights.department"), t("insights.medianLabel")]}
              rows={performanceBars.map((b) => [b.label, b.display ?? ""])}
            />
          }
        >
          <BarList
            data={performanceBars}
            emptyLabel={empty}
            locale={localeTag}
          />
        </ChartCard>

        <ChartCard
          title={t("insights.hotspots")}
          table={
            <DataTable
              columns={[t("insights.location"), t("insights.count")]}
              rows={hotspotBars.map((b) => [b.label, b.value])}
            />
          }
        >
          <BarList data={hotspotBars} emptyLabel={empty} locale={localeTag} />
        </ChartCard>

        <ChartCard
          title={t("insights.recurring")}
          table={
            <DataTable
              columns={[t("insights.location"), t("insights.count")]}
              rows={recurringBars.map((b) => [b.label, b.value])}
            />
          }
        >
          <BarList data={recurringBars} emptyLabel={empty} locale={localeTag} />
        </ChartCard>

        <ChartCard
          title={t("insights.clusters")}
          description={t("cluster.explain")}
          table={
            <DataTable
              columns={[t("insights.clusterLabel"), t("insights.size")]}
              rows={clusterBars.map((b) => [b.label, b.value])}
            />
          }
        >
          <BarList data={clusterBars} emptyLabel={empty} locale={localeTag} />
        </ChartCard>

        <ChartCard
          title={t("insights.seasonal")}
          table={
            <DataTable
              columns={[t("insights.month"), t("insights.count")]}
              rows={seasonalBars.map((b) => [b.label, b.value])}
            />
          }
        >
          <BarList data={seasonalBars} emptyLabel={empty} locale={localeTag} />
        </ChartCard>
      </div>
    </>
  );
}
