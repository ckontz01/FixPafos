import { db, type Sql } from "@/lib/db";
import { authenticate, body, fail, handle } from "@/lib/http";
import { categories, severityLevels, type Issue } from "@/lib/issues";
import { departments, isDepartmentId } from "@/lib/departments";
import { csvDocument } from "@/lib/csv";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Operational export for municipal staff.
 *
 * This closes the loop from the platform to the people who can act, without
 * ever acting on their behalf: it produces a file a person downloads, reads and
 * forwards. Nothing is emailed, dispatched or transmitted to an authority
 * automatically, so no external communication happens without human approval.
 *
 * Access requires the moderation password, because an unauthenticated bulk
 * export would hand anyone a single file containing every report, author name
 * and coordinate on the platform. Hidden reports are never exported.
 */

const CSV_COLUMNS = [
  "id",
  "created_at",
  "status",
  "category",
  "department",
  "severity",
  "severity_confidence",
  "suggested_response_hours",
  "needs_review",
  "latitude",
  "longitude",
  "location",
  "author",
  "message",
  "support_votes",
  "cluster_id",
  "cluster_size",
  "resolved_at",
  "is_demo",
] as const;

const iso = (ms: unknown) =>
  ms === null || ms === undefined ? "" : new Date(Number(ms)).toISOString();

export function POST(request: Request) {
  return handle(request, async () => {
    const input = await body(request);
    const rejected = await authenticate(request, input?.password);
    if (rejected) return rejected;

    const departmentId = isDepartmentId(input?.department)
      ? input.department
      : null;
    const category =
      typeof input?.category === "string" && Object.hasOwn(categories, input.category)
        ? input.category
        : null;
    const severity = (severityLevels as readonly string[]).includes(
      input?.severity ?? "",
    )
      ? input.severity
      : null;
    const status =
      input?.status === "open" || input?.status === "resolved" ? input.status : null;
    const from = Number.isFinite(Number(input?.from)) ? Number(input.from) : null;
    const to = Number.isFinite(Number(input?.to)) ? Number(input.to) : null;

    const sql = db() as unknown as Sql;
    const rows = await sql`
      SELECT i.data, i.created_at, i.status, i.category, i.department_id,
             i.severity, i.severity_confidence, i.latitude, i.longitude,
             i.resolved_at, i.cluster_id, i.is_demo,
             COALESCE(v.total, 0) AS support_votes,
             COALESCE(c.size, 0) AS cluster_size
      FROM pafos_issues i
      LEFT JOIN LATERAL (
        SELECT count(*)::int AS total FROM pafos_votes v WHERE v.issue_id = i.id
      ) v ON true
      LEFT JOIN LATERAL (
        SELECT count(*)::int AS size FROM pafos_issues c
        WHERE c.cluster_id = i.cluster_id AND c.hidden_at IS NULL
      ) c ON i.cluster_id IS NOT NULL
      WHERE i.hidden_at IS NULL
        AND (${departmentId}::text IS NULL OR i.department_id = ${departmentId})
        AND (${category}::text IS NULL OR i.category = ${category})
        AND (${severity}::text IS NULL OR i.severity = ${severity})
        AND (${status}::text IS NULL OR i.status = ${status})
        AND (${from}::bigint IS NULL OR i.created_at >= ${from})
        AND (${to}::bigint IS NULL OR i.created_at <= ${to})
      ORDER BY i.created_at DESC
      LIMIT 5000`;

    if (input?.format === "digest") {
      if (!departmentId) return fail("error.invalidIssue", 400);
      return digest(rows, departmentId);
    }

    const csv = csvDocument(
      CSV_COLUMNS,
      rows.map((row) => {
        const issue = row.data as Issue;
        return [
          issue.id,
          iso(row.created_at),
          row.status,
          row.category,
          row.department_id,
          row.severity,
          row.severity_confidence,
          issue.severity?.slaHours ?? "",
          issue.severity?.needsReview ? "yes" : "no",
          row.latitude,
          row.longitude,
          issue.location.label,
          issue.author,
          issue.message,
          row.support_votes,
          row.cluster_id ?? "",
          row.cluster_size || "",
          iso(row.resolved_at),
          row.is_demo ? "yes" : "no",
        ];
      }),
    );

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="fixpafos-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  });
}

/**
 * A plain-text digest for one department, written to be pasted into an email
 * by a person who has read it. Ordered by urgency, so the top of the list is
 * what needs attention first.
 */
function digest(rows: Record<string, unknown>[], departmentId: string) {
  const rank = { critical: 0, high: 1, medium: 2, low: 3 } as Record<string, number>;
  const open = rows
    .filter((r) => r.status === "open")
    .sort(
      (a, b) =>
        (rank[String(a.severity)] ?? 4) - (rank[String(b.severity)] ?? 4) ||
        Number(a.created_at) - Number(b.created_at),
    );

  const name = departments[departmentId as keyof typeof departments].name;
  const lines = [
    `FixPafos digest for ${name}`,
    `Generated ${new Date().toISOString()}`,
    "",
    `Open reports: ${open.length} of ${rows.length} total`,
    "",
    "This is a summary of public reports suggested for this service by an",
    "automated classifier. It is not an official dispatch, the routing has not",
    "been confirmed by the authority, and severity is a model estimate intended",
    "to help prioritisation. Please verify before acting.",
    "",
  ];

  for (const row of open) {
    const issue = row.data as Issue;
    lines.push(
      `[${String(row.severity ?? "unrated").toUpperCase()}] ${issue.location.label}`,
      `  ${issue.message.replace(/\s+/g, " ").slice(0, 300)}`,
      `  Reported ${iso(row.created_at)} · ${row.support_votes} resident(s) supporting` +
        (Number(row.cluster_size) > 1
          ? ` · ${row.cluster_size} linked reports`
          : ""),
      `  Map: ${row.latitude}, ${row.longitude}`,
      "",
    );
  }

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="fixpafos-digest-${departmentId}.txt"`,
      "Cache-Control": "no-store",
    },
  });
}
