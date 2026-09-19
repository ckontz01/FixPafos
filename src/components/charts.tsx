"use client";
import { useId, useState, type ReactNode } from "react";
import { useI18n } from "./i18n-provider";

/**
 * Chart primitives for the insights dashboard.
 *
 * Hand-rolled inline SVG rather than a charting library: the four forms used
 * here are small, the bundle stays free of a dependency that would ship far
 * more than is needed, and every mark follows the house specs directly --
 * bars capped at 24px with a 4px rounded data-end squared at the baseline,
 * 2px lines with round caps, markers with a 2px surface ring, and hairline
 * recessive gridlines.
 *
 * Colour never carries identity alone: single-series charts use one magnitude
 * hue and name each row, the two-series chart ships a legend, and every chart
 * has a table view for screen readers, printing and forced-colours mode.
 */

/** Compact number formatting for tiles: 1,284 / 12.9K / 1.2M. */
export function compact(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: value >= 10_000 ? 1 : 0,
  }).format(value);
}

export function ChartCard({
  title,
  description,
  children,
  table,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  table?: ReactNode;
}) {
  const [showTable, setShowTable] = useState(false);
  const { t } = useI18n();
  const id = useId();
  return (
    <figure className="chart-card">
      <figcaption>
        <h2 id={`${id}-title`}>{title}</h2>
        {description && <p>{description}</p>}
      </figcaption>
      {showTable && table ? table : children}
      {table && (
        <button
          className="chart-table-toggle"
          aria-expanded={showTable}
          onClick={() => setShowTable((v) => !v)}
        >
          {showTable ? t("insights.showChart") : t("insights.showTable")}
        </button>
      )}
    </figure>
  );
}

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="stat-tile">
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {hint && <span className="stat-hint">{hint}</span>}
    </div>
  );
}

export type BarDatum = {
  key: string;
  label: string;
  /** Full name when `label` is deliberately shortened for the narrow column. */
  title?: string;
  value: number;
  /** Optional per-row fill, used only for the ordered severity ramp. */
  fill?: string;
  /** Text shown instead of the raw number, e.g. a formatted duration. */
  display?: string;
};

/**
 * Horizontal bars for a single measure across a labelled dimension.
 *
 * Every row is named, so the bars carry magnitude only and one hue is correct;
 * colouring each row differently would add ink without adding information.
 */
export function BarList({
  data,
  emptyLabel,
  locale,
}: {
  data: BarDatum[];
  emptyLabel: string;
  locale: string;
}) {
  if (!data.length) return <p className="chart-empty">{emptyLabel}</p>;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="bar-list">
      {data.map((d) => {
        const pct = (d.value / max) * 100;
        return (
          <li key={d.key}>
            <span className="bar-label" title={d.title ?? d.label}>
              {d.label}
            </span>
            <span className="bar-track">
              <span
                className="bar-fill"
                style={{
                  width: `${Math.max(pct, 1.5)}%`,
                  background: d.fill ?? "var(--chart-magnitude)",
                }}
              />
            </span>
            <span className="bar-value">
              {d.display ?? new Intl.NumberFormat(locale).format(d.value)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export type SeriesPoint = { label: string; opened: number; resolved: number };

/**
 * Two-series day line. Opened and resolved are counts of the same unit on one
 * scale, so they legitimately share a single axis -- a second axis would invent
 * a relationship between them that the data does not contain.
 */
export function TimeSeries({
  points,
  emptyLabel,
  openedLabel,
  resolvedLabel,
  locale,
  bucket = "day",
}: {
  points: SeriesPoint[];
  emptyLabel: string;
  openedLabel: string;
  resolvedLabel: string;
  locale: string;
  bucket?: "day" | "week";
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2) return <p className="chart-empty">{emptyLabel}</p>;

  // A 2:1 box keeps the plot legible at card width instead of collapsing the
  // line into a thin strip, and the padding leaves room for the axis text.
  const width = 320;
  const height = 160;
  const pad = { top: 10, right: 10, bottom: 22, left: 26 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const max = Math.max(...points.flatMap((p) => [p.opened, p.resolved]), 1);
  // Round the axis top to a clean number so ticks read 0 / 5 / 10.
  const step = Math.max(1, Math.ceil(max / 4));
  const top = step * 4;
  const x = (i: number) => pad.left + (i / (points.length - 1)) * plotW;
  const y = (v: number) => pad.top + plotH - (v / top) * plotH;
  const path = (pick: (p: SeriesPoint) => number) =>
    points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(pick(p))}`).join(" ");
  const active = hover === null ? null : points[hover];

  return (
    <div className="time-series">
      <div className="chart-legend">
        <span>
          <i style={{ background: "var(--chart-open)" }} aria-hidden="true" />
          {openedLabel}
        </span>
        <span>
          <i style={{ background: "var(--chart-resolved)" }} aria-hidden="true" />
          {resolvedLabel}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        className="line-chart"
        onMouseLeave={() => setHover(null)}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={i}
            x1={pad.left}
            x2={width - pad.right}
            y1={y(step * i)}
            y2={y(step * i)}
            stroke="var(--chart-grid)"
            strokeWidth="1"
          />
        ))}
        {[0, 2, 4].map((i) => (
          <text
            key={i}
            x={pad.left - 5}
            y={y(step * i) + 3.5}
            textAnchor="end"
            className="axis-text"
          >
            {step * i}
          </text>
        ))}
        <path
          d={path((p) => p.opened)}
          fill="none"
          stroke="var(--chart-open)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d={path((p) => p.resolved)}
          fill="none"
          stroke="var(--chart-resolved)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={pad.top}
            y2={pad.top + plotH}
            stroke="var(--chart-grid)"
            strokeWidth="1"
          />
        )}
        {hover !== null &&
          (["opened", "resolved"] as const).map((series) => (
            <circle
              key={series}
              cx={x(hover)}
              cy={y(points[hover][series])}
              r="4"
              fill={
                series === "opened"
                  ? "var(--chart-open)"
                  : "var(--chart-resolved)"
              }
              stroke="var(--panel)"
              strokeWidth="2"
            />
          ))}
        {/* Hit targets are full-height bands, far larger than the marks. */}
        {points.map((p, i) => (
          <rect
            key={p.label}
            x={x(i) - plotW / (points.length * 2)}
            y={pad.top}
            width={Math.max(plotW / points.length, 8)}
            height={plotH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          >
            <title>{`${p.label}: ${p.opened} / ${p.resolved}`}</title>
          </rect>
        ))}
        <text x={pad.left} y={height - 6} className="axis-text">
          {points[0].label}
        </text>
        <text
          x={width - pad.right}
          y={height - 6}
          textAnchor="end"
          className="axis-text"
        >
          {points[points.length - 1].label}
        </text>
      </svg>
      <p className="chart-readout" role="status">
        {active
          ? `${bucket === "week" ? `${active.label}+` : active.label} · ${openedLabel} ${new Intl.NumberFormat(locale).format(active.opened)} · ${resolvedLabel} ${new Intl.NumberFormat(locale).format(active.resolved)}`
          : " "}
      </p>
    </div>
  );
}

/** Simple data table used as the accessible alternative behind every chart. */
export function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="chart-table-wrap">
      <table className="chart-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} scope="col">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
