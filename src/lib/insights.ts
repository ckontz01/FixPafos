import { db, type Sql } from "./db";

/**
 * Operational aggregates for the municipal insights dashboard.
 *
 * Every figure here is computed from stored reports. Nothing is estimated,
 * extrapolated or filled in: when there is no data for a period the query
 * returns an empty series and the page says so, rather than drawing a
 * plausible-looking line. Seeded demonstration rows are counted separately so
 * the interface can state plainly when it is showing sample data.
 *
 * Queries read the generated columns added by the migration, so grouping and
 * range filtering use indexes instead of unpacking JSONB per row.
 */

export type InsightFilters = {
  from?: number;
  to?: number;
  category?: string;
  departmentId?: string;
  severity?: string;
  status?: "open" | "resolved";
};

export type Count = { key: string; count: number };
export type TimePoint = { day: string; opened: number; resolved: number };
export type Hotspot = {
  label: string;
  count: number;
  latitude: number;
  longitude: number;
};
export type DepartmentPerformance = {
  departmentId: string;
  total: number;
  resolved: number;
  medianHours: number | null;
};
export type ClusterSize = { clusterId: string; size: number };

export type Insights = {
  totals: {
    total: number;
    open: number;
    resolved: number;
    /** 0-1; null when there is nothing to divide by. */
    resolutionRate: number | null;
    demo: number;
    /** True when every report in range is seeded demonstration data. */
    demoOnly: boolean;
  };
  resolution: { averageHours: number | null; medianHours: number | null };
  byCategory: Count[];
  byDepartment: Count[];
  byStatus: Count[];
  bySeverity: Count[];
  overTime: TimePoint[];
  hotspots: Hotspot[];
  recurring: Hotspot[];
  clusters: ClusterSize[];
  departments: DepartmentPerformance[];
  seasonal: Count[];
  /** Whether any report at all exists, to distinguish "empty" from "filtered out". */
  hasAnyData: boolean;
  /** "week" when the range is long enough that a daily line would be noise. */
  bucket: "day" | "week";
};

const num = (value: unknown): number => Number(value ?? 0);
const maybe = (value: unknown): number | null =>
  value === null || value === undefined ? null : Number(value);

export async function getInsights(filters: InsightFilters = {}) {
  return getInsightsWith(db() as unknown as Sql, filters);
}

export async function getInsightsWith(
  sql: Sql,
  filters: InsightFilters = {},
): Promise<Insights> {
  const from = filters.from ?? null;
  const to = filters.to ?? null;
  const category = filters.category ?? null;
  const departmentId = filters.departmentId ?? null;
  const severity = filters.severity ?? null;
  const status = filters.status ?? null;

  // Hidden reports are excluded everywhere: a report withdrawn pending review
  // must not quietly inflate the municipality's operational figures.

  // Choose the time bucket from the span actually being shown.
  const [span] = await sql`
    SELECT min(created_at) AS first, max(created_at) AS last
    FROM pafos_issues
    WHERE hidden_at IS NULL
      AND (${from}::bigint IS NULL OR created_at >= ${from})
      AND (${to}::bigint IS NULL OR created_at <= ${to})`;
  const spanDays =
    span?.first && span?.last
      ? (Number(span.last) - Number(span.first)) / 86_400_000
      : 0;
  const bucketWeekly = spanDays > 70;

  const [totals] = await sql`
    WITH scoped AS (
      SELECT * FROM pafos_issues i
      WHERE i.hidden_at IS NULL
        AND (${from}::bigint IS NULL OR i.created_at >= ${from})
        AND (${to}::bigint IS NULL OR i.created_at <= ${to})
        AND (${category}::text IS NULL OR i.category = ${category})
        AND (${departmentId}::text IS NULL OR i.department_id = ${departmentId})
        AND (${severity}::text IS NULL OR i.severity = ${severity})
        AND (${status}::text IS NULL OR i.status = ${status})
    )
    SELECT count(*)::int AS total,
           count(*) FILTER (WHERE status = 'open')::int AS open,
           count(*) FILTER (WHERE status = 'resolved')::int AS resolved,
           count(*) FILTER (WHERE is_demo)::int AS demo,
           avg((resolved_at - created_at) / 3600000.0)
             FILTER (WHERE resolved_at IS NOT NULL) AS average_hours,
           percentile_cont(0.5) WITHIN GROUP (
             ORDER BY (resolved_at - created_at) / 3600000.0
           ) FILTER (WHERE resolved_at IS NOT NULL) AS median_hours
    FROM scoped`;

  /**
   * One grouped count per dimension. Each is written out separately rather than
   * built from a column name, so every query is a fixed shape the planner can
   * serve from that column's index and no identifier is ever interpolated.
   */
  const countByCategory = async (): Promise<Count[]> => {
    const rows = await sql`
      WITH scoped AS (
        SELECT * FROM pafos_issues i
        WHERE i.hidden_at IS NULL
          AND (${from}::bigint IS NULL OR i.created_at >= ${from})
          AND (${to}::bigint IS NULL OR i.created_at <= ${to})
          AND (${category}::text IS NULL OR i.category = ${category})
          AND (${departmentId}::text IS NULL OR i.department_id = ${departmentId})
          AND (${severity}::text IS NULL OR i.severity = ${severity})
          AND (${status}::text IS NULL OR i.status = ${status})
      )
      SELECT category AS key, count(*)::int AS count
      FROM scoped WHERE category IS NOT NULL
      GROUP BY key ORDER BY count DESC, key ASC`;
    return rows.map((r) => ({ key: String(r.key), count: num(r.count) }));
  };
  const countByDepartment = async (): Promise<Count[]> => {
    const rows = await sql`
      WITH scoped AS (
        SELECT * FROM pafos_issues i
        WHERE i.hidden_at IS NULL
          AND (${from}::bigint IS NULL OR i.created_at >= ${from})
          AND (${to}::bigint IS NULL OR i.created_at <= ${to})
          AND (${category}::text IS NULL OR i.category = ${category})
          AND (${departmentId}::text IS NULL OR i.department_id = ${departmentId})
          AND (${severity}::text IS NULL OR i.severity = ${severity})
          AND (${status}::text IS NULL OR i.status = ${status})
      )
      SELECT department_id AS key, count(*)::int AS count
      FROM scoped WHERE department_id IS NOT NULL
      GROUP BY key ORDER BY count DESC, key ASC`;
    return rows.map((r) => ({ key: String(r.key), count: num(r.count) }));
  };
  const countByStatus = async (): Promise<Count[]> => {
    const rows = await sql`
      WITH scoped AS (
        SELECT * FROM pafos_issues i
        WHERE i.hidden_at IS NULL
          AND (${from}::bigint IS NULL OR i.created_at >= ${from})
          AND (${to}::bigint IS NULL OR i.created_at <= ${to})
          AND (${category}::text IS NULL OR i.category = ${category})
          AND (${departmentId}::text IS NULL OR i.department_id = ${departmentId})
          AND (${severity}::text IS NULL OR i.severity = ${severity})
          AND (${status}::text IS NULL OR i.status = ${status})
      )
      SELECT status AS key, count(*)::int AS count
      FROM scoped WHERE status IS NOT NULL
      GROUP BY key ORDER BY count DESC, key ASC`;
    return rows.map((r) => ({ key: String(r.key), count: num(r.count) }));
  };
  const countBySeverity = async (): Promise<Count[]> => {
    const rows = await sql`
      WITH scoped AS (
        SELECT * FROM pafos_issues i
        WHERE i.hidden_at IS NULL
          AND (${from}::bigint IS NULL OR i.created_at >= ${from})
          AND (${to}::bigint IS NULL OR i.created_at <= ${to})
          AND (${category}::text IS NULL OR i.category = ${category})
          AND (${departmentId}::text IS NULL OR i.department_id = ${departmentId})
          AND (${severity}::text IS NULL OR i.severity = ${severity})
          AND (${status}::text IS NULL OR i.status = ${status})
      )
      SELECT severity AS key, count(*)::int AS count
      FROM scoped WHERE severity IS NOT NULL
      GROUP BY key ORDER BY count DESC, key ASC`;
    return rows.map((r) => ({ key: String(r.key), count: num(r.count) }));
  };

  const [byCategory, byDepartment, byStatus, bySeverity] = await Promise.all([
    countByCategory(),
    countByDepartment(),
    countByStatus(),
    countBySeverity(),
  ]);

  const overTimeRows = await sql`
    WITH scoped AS (
      SELECT * FROM pafos_issues i
      WHERE i.hidden_at IS NULL
        AND (${from}::bigint IS NULL OR i.created_at >= ${from})
        AND (${to}::bigint IS NULL OR i.created_at <= ${to})
        AND (${category}::text IS NULL OR i.category = ${category})
        AND (${departmentId}::text IS NULL OR i.department_id = ${departmentId})
        AND (${severity}::text IS NULL OR i.severity = ${severity})
        AND (${status}::text IS NULL OR i.status = ${status})
    )
    SELECT to_char(
             CASE WHEN ${bucketWeekly}
                  THEN date_trunc('week', to_timestamp(created_at / 1000.0))
                  ELSE date_trunc('day', to_timestamp(created_at / 1000.0))
             END, 'YYYY-MM-DD') AS day,
           count(*)::int AS opened,
           count(*) FILTER (WHERE status = 'resolved')::int AS resolved
    FROM scoped
    GROUP BY day
    ORDER BY day ASC`;

  const hotspotRows = await sql`
    WITH scoped AS (
      SELECT * FROM pafos_issues i
      WHERE i.hidden_at IS NULL
        AND (${from}::bigint IS NULL OR i.created_at >= ${from})
        AND (${to}::bigint IS NULL OR i.created_at <= ${to})
        AND (${category}::text IS NULL OR i.category = ${category})
        AND (${departmentId}::text IS NULL OR i.department_id = ${departmentId})
        AND (${severity}::text IS NULL OR i.severity = ${severity})
        AND (${status}::text IS NULL OR i.status = ${status})
    )
    -- Roughly a 110 m grid, so nearby reports aggregate into one hotspot.
    SELECT round(latitude::numeric, 3) AS lat,
           round(longitude::numeric, 3) AS lng,
           count(*)::int AS count,
           mode() WITHIN GROUP (ORDER BY data->'location'->>'label') AS label
    FROM scoped
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    GROUP BY lat, lng
    -- A single report is not a hotspot; showing a column of ones would imply
    -- concentration that the data does not contain.
    HAVING count(*) > 1
    ORDER BY count DESC, lat, lng
    LIMIT 12`;

  const recurringRows = await sql`
    WITH scoped AS (
      SELECT * FROM pafos_issues i
      WHERE i.hidden_at IS NULL
        AND (${from}::bigint IS NULL OR i.created_at >= ${from})
        AND (${to}::bigint IS NULL OR i.created_at <= ${to})
        AND (${category}::text IS NULL OR i.category = ${category})
        AND (${departmentId}::text IS NULL OR i.department_id = ${departmentId})
        AND (${severity}::text IS NULL OR i.severity = ${severity})
        AND (${status}::text IS NULL OR i.status = ${status})
    )
    SELECT data->'location'->>'label' AS label,
           count(*)::int AS count,
           avg(latitude) AS lat,
           avg(longitude) AS lng
    FROM scoped
    GROUP BY label
    HAVING count(*) > 1
    ORDER BY count DESC, label ASC
    LIMIT 10`;

  const clusterRows = await sql`
    SELECT cluster_id, count(*)::int AS size
    FROM pafos_issues
    WHERE hidden_at IS NULL AND cluster_id IS NOT NULL
      AND (${from}::bigint IS NULL OR created_at >= ${from})
      AND (${to}::bigint IS NULL OR created_at <= ${to})
    GROUP BY cluster_id
    HAVING count(*) > 1
    ORDER BY size DESC
    LIMIT 10`;

  const departmentRows = await sql`
    WITH scoped AS (
      SELECT * FROM pafos_issues i
      WHERE i.hidden_at IS NULL
        AND (${from}::bigint IS NULL OR i.created_at >= ${from})
        AND (${to}::bigint IS NULL OR i.created_at <= ${to})
        AND (${category}::text IS NULL OR i.category = ${category})
        AND (${departmentId}::text IS NULL OR i.department_id = ${departmentId})
        AND (${severity}::text IS NULL OR i.severity = ${severity})
    )
    SELECT department_id,
           count(*)::int AS total,
           count(*) FILTER (WHERE status = 'resolved')::int AS resolved,
           percentile_cont(0.5) WITHIN GROUP (
             ORDER BY (resolved_at - created_at) / 3600000.0
           ) FILTER (WHERE resolved_at IS NOT NULL) AS median_hours
    FROM scoped
    WHERE department_id IS NOT NULL
    GROUP BY department_id
    ORDER BY total DESC`;

  const seasonalRows = await sql`
    WITH scoped AS (
      SELECT * FROM pafos_issues i
      WHERE i.hidden_at IS NULL
        AND (${category}::text IS NULL OR i.category = ${category})
        AND (${departmentId}::text IS NULL OR i.department_id = ${departmentId})
        AND (${severity}::text IS NULL OR i.severity = ${severity})
    )
    SELECT to_char(to_timestamp(created_at / 1000.0), 'MM') AS key,
           count(*)::int AS count
    FROM scoped
    GROUP BY key
    ORDER BY key ASC`;

  const [anyRow] = await sql`SELECT count(*)::int AS total FROM pafos_issues`;

  const total = num(totals.total);
  const demo = num(totals.demo);

  return {
    totals: {
      total,
      open: num(totals.open),
      resolved: num(totals.resolved),
      resolutionRate: total > 0 ? num(totals.resolved) / total : null,
      demo,
      demoOnly: total > 0 && demo === total,
    },
    resolution: {
      averageHours: maybe(totals.average_hours),
      medianHours: maybe(totals.median_hours),
    },
    byCategory,
    byDepartment,
    byStatus,
    bySeverity,
    overTime: overTimeRows.map((r) => ({
      day: String(r.day),
      opened: num(r.opened),
      resolved: num(r.resolved),
    })),
    hotspots: hotspotRows.map((r) => ({
      label: String(r.label ?? ""),
      count: num(r.count),
      latitude: Number(r.lat),
      longitude: Number(r.lng),
    })),
    recurring: recurringRows.map((r) => ({
      label: String(r.label ?? ""),
      count: num(r.count),
      latitude: Number(r.lat),
      longitude: Number(r.lng),
    })),
    clusters: clusterRows.map((r) => ({
      clusterId: String(r.cluster_id),
      size: num(r.size),
    })),
    departments: departmentRows.map((r) => ({
      departmentId: String(r.department_id),
      total: num(r.total),
      resolved: num(r.resolved),
      medianHours: maybe(r.median_hours),
    })),
    seasonal: seasonalRows.map((r) => ({
      key: String(r.key),
      count: num(r.count),
    })),
    hasAnyData: num(anyRow.total) > 0,
    bucket: bucketWeekly ? "week" : "day",
  };
}
