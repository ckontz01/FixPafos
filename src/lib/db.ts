import postgres from "postgres";
import type {
  FlagReason,
  FlaggedIssue,
  Issue,
  QuarantineItem,
  Reply,
} from "./issues";
import { FLAG_HIDE_THRESHOLD } from "./issues";

let client: ReturnType<typeof postgres> | undefined;

/**
 * Certificate verification is required for every connection that leaves the
 * machine. It is relaxed only for an explicit loopback address, which is the
 * local development database and cannot be a hosted instance -- so a
 * misconfigured production URL can never silently downgrade its transport.
 */
function sslMode(url: string): "verify-full" | false {
  try {
    const { hostname } = new URL(url);
    return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1"
      ? false
      : "verify-full";
  } catch {
    return "verify-full";
  }
}

export function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("PafosLive database is not configured");
  const loopback = sslMode(url) === false;
  client ??= postgres(url, {
    ssl: sslMode(url),
    // The local development database serves a single connection; hosted
    // Postgres is pooled normally.
    max: loopback ? 1 : 3,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
  return client;
}

/**
 * Minimal structural type for the SQL client, so the query functions below can
 * also run against the in-process Postgres used by the test suite.
 */
export type Sql = {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<
    Record<string, unknown>[]
  >;
  json: (value: unknown) => unknown;
  begin: <T>(fn: (tx: Sql) => Promise<T>) => Promise<T>;
};

const asSql = (value: unknown) => value as unknown as Sql;

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

export type IssueCursor = { createdAt: number; id: string };

export type IssueQuery = {
  voterId?: string;
  /** Keyset cursor: reports strictly older than this position. */
  cursor?: IssueCursor;
  limit?: number;
  category?: string;
  status?: "open" | "resolved";
  severity?: string;
  departmentId?: string;
  /** Viewport filter, so the board only loads what the map can show. */
  bounds?: { west: number; south: number; east: number; north: number };
  /** Case-insensitive substring over report text and location label. */
  search?: string;
  /** Moderator view: include reports currently hidden pending review. */
  includeHidden?: boolean;
};

export type IssuePage = {
  posts: Issue[];
  seconded: string[];
  nextCursor: IssueCursor | null;
};

function toIssue(row: Record<string, unknown>): Issue {
  const data = row.data as Issue;
  const photoStatus = row.photo_status as Issue["photo"] extends infer P
    ? P extends { status: infer S }
      ? S
      : never
    : never;
  return {
    ...data,
    status: data.status ?? "open",
    seconds: Number(row.seconds ?? 0),
    replies: (row.replies ?? []) as Reply[],
    photo: row.photo_status
      ? {
          status: photoStatus,
          ...(row.photo_status === "approved"
            ? { url: `/api/photos/${data.id}` }
            : {}),
        }
      : undefined,
  };
}

/**
 * One page of public reports.
 *
 * Filtering, ordering and the page limit are applied in the `page` CTE before
 * anything is joined, so the vote count and reply aggregation only ever run
 * over the rows actually being returned rather than the whole table. Filters
 * are passed as nullable parameters instead of composed SQL fragments: it keeps
 * a single prepared shape and leaves no room for interpolation mistakes, at the
 * cost of slightly less selective planning than bespoke per-filter SQL.
 */
export async function listIssues(query: IssueQuery = {}): Promise<IssuePage> {
  const sql = asSql(db());
  return listIssuesWith(sql, query);
}

export async function listIssuesWith(
  sql: Sql,
  query: IssueQuery = {},
): Promise<IssuePage> {
  const limit = Math.min(
    Math.max(1, query.limit ?? DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE,
  );
  const voterId = query.voterId ?? "";
  const cursorAt = query.cursor?.createdAt ?? null;
  const cursorId = query.cursor?.id ?? null;
  const search = query.search?.trim() ? `%${query.search.trim()}%` : null;

  const rows = await sql`
    WITH page AS (
      SELECT i.id, i.data, i.created_at
      FROM pafos_issues i
      WHERE (${query.includeHidden ?? false} OR i.hidden_at IS NULL)
        AND (${query.category ?? null}::text IS NULL OR i.category = ${query.category ?? null})
        AND (${query.status ?? null}::text IS NULL OR i.status = ${query.status ?? null})
        AND (${query.severity ?? null}::text IS NULL OR i.severity = ${query.severity ?? null})
        AND (${query.departmentId ?? null}::text IS NULL OR i.department_id = ${query.departmentId ?? null})
        AND (${query.bounds?.west ?? null}::double precision IS NULL OR (
              i.longitude BETWEEN ${query.bounds?.west ?? null} AND ${query.bounds?.east ?? null}
          AND i.latitude BETWEEN ${query.bounds?.south ?? null} AND ${query.bounds?.north ?? null}))
        AND (${search}::text IS NULL OR
             i.data->>'message' ILIKE ${search} OR
             i.data->'location'->>'label' ILIKE ${search})
        AND (${cursorAt}::bigint IS NULL OR
             (i.created_at, i.id) < (${cursorAt}::bigint, ${cursorId}::text))
      ORDER BY i.created_at DESC, i.id DESC
      LIMIT ${limit + 1}
    )
    SELECT page.data,
      page.created_at,
      photo.status AS photo_status,
      COALESCE(votes.total, 0) AS seconds,
      COALESCE(votes.mine, false) AS seconded,
      COALESCE(replies.items, '[]'::jsonb) AS replies
    FROM page
    LEFT JOIN pafos_photos photo ON photo.issue_id = page.id
    LEFT JOIN LATERAL (
      SELECT count(*)::int AS total,
             bool_or(v.voter_id = ${voterId}) AS mine
      FROM pafos_votes v WHERE v.issue_id = page.id
    ) votes ON true
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(r.data ORDER BY r.created_at) AS items
      FROM pafos_replies r WHERE r.issue_id = page.id
    ) replies ON true
    ORDER BY page.created_at DESC, page.data->>'id' DESC`;

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const posts = page.map(toIssue);
  const last = page.at(-1);
  return {
    posts,
    seconded: page
      .filter((row) => row.seconded)
      .map((row) => (row.data as Issue).id),
    nextCursor:
      hasMore && last
        ? { createdAt: Number(last.created_at), id: (last.data as Issue).id }
        : null,
  };
}

export async function getIssue(id: string): Promise<Issue | null> {
  const sql = asSql(db());
  const [row] =
    await sql`SELECT data FROM pafos_issues WHERE id=${id} AND hidden_at IS NULL`;
  return row ? (row.data as Issue) : null;
}

export async function insertIssue(issue: Issue) {
  const sql = asSql(db());
  await sql`INSERT INTO pafos_issues(id,data,created_at) VALUES(${issue.id},${sql.json(issue)},${issue.createdAt})`;
}

export async function issueExists(id: string) {
  const sql = asSql(db());
  return (
    (await sql`SELECT 1 FROM pafos_issues WHERE id=${id} AND hidden_at IS NULL`)
      .length > 0
  );
}

export async function insertReply(id: string, reply: Reply) {
  const sql = asSql(db());
  await sql`INSERT INTO pafos_replies(id,issue_id,data,created_at) VALUES(${reply.id},${id},${sql.json(reply)},${reply.createdAt})`;
}

export async function quarantine(
  submission: Issue | Reply,
  decision: { source: string; category: string },
  parentId?: string,
) {
  const sql = asSql(db());
  await sql`INSERT INTO pafos_quarantine(id,submission_type,parent_post_id,submission,blocked_by,category,created_at)
  VALUES(${submission.id},${parentId ? "reply" : "post"},${parentId ?? null},${sql.json(submission)},${decision.source},${decision.category},${submission.createdAt}) ON CONFLICT DO NOTHING`;
}

export async function listQuarantine(): Promise<QuarantineItem[]> {
  const sql = asSql(db());
  const rows =
    await sql`SELECT * FROM pafos_quarantine ORDER BY status='pending' DESC,created_at DESC`;
  return rows.map((r) => ({
    id: r.id as string,
    submissionType: r.submission_type as QuarantineItem["submissionType"],
    parentPostId: (r.parent_post_id as string) ?? undefined,
    submission: r.submission as Issue | Reply,
    blockedBy: r.blocked_by as string,
    category: r.category as string,
    status: r.status as QuarantineItem["status"],
    reviewedAt: r.reviewed_at ? Number(r.reviewed_at) : undefined,
  }));
}

export async function publishQuarantine(
  id: string,
  assignment?: Issue["assignment"],
) {
  const sql = asSql(db());
  return sql.begin(async (tx) => {
    const [row] =
      await tx`SELECT * FROM pafos_quarantine WHERE id=${id} FOR UPDATE`;
    if (!row) return "missing";
    if (row.status === "published") return "already_published";
    if (row.submission_type === "post") {
      const issue = row.submission as Issue;
      if (!assignment) return "assignment_missing";
      issue.assignment = assignment;
      issue.category = assignment.category;
      await tx`INSERT INTO pafos_issues(id,data,created_at) VALUES(${id},${tx.json(issue)},${issue.createdAt})`;
    } else {
      const [parent] =
        await tx`SELECT id FROM pafos_issues WHERE id=${row.parent_post_id} FOR KEY SHARE`;
      if (!parent) return "parent_missing";
      await tx`INSERT INTO pafos_replies(id,issue_id,data,created_at) VALUES(${id},${row.parent_post_id},${tx.json(row.submission)},${row.created_at})`;
    }
    await tx`UPDATE pafos_quarantine SET status='published',reviewed_at=${Date.now()} WHERE id=${id}`;
    return "published";
  });
}

export async function setVote(id: string, voterId: string, seconded: boolean) {
  const sql = asSql(db());
  return sql.begin(async (tx) => {
    // Lock parent so each returned count corresponds to an ordered vote update.
    const [parent] =
      await tx`SELECT id FROM pafos_issues WHERE id=${id} FOR UPDATE`;
    if (!parent) return null;
    if (seconded)
      await tx`INSERT INTO pafos_votes(issue_id,voter_id) VALUES(${id},${voterId}) ON CONFLICT DO NOTHING`;
    else
      await tx`DELETE FROM pafos_votes WHERE issue_id=${id} AND voter_id=${voterId}`;
    const [row] =
      await tx`SELECT count(*)::int AS count FROM pafos_votes WHERE issue_id=${id}`;
    return Number(row.count);
  });
}

/**
 * Record a citizen's flag.
 *
 * A flag is a request for review, not a delete: the report is only withdrawn
 * from public view once `FLAG_HIDE_THRESHOLD` distinct people have flagged it,
 * and even then the row is retained for a moderator to restore or confirm.
 * Flags are keyed by reporter so one person cannot reach the threshold alone.
 */
export async function flagIssue(
  issueId: string,
  voterId: string,
  reason: FlagReason,
): Promise<{ hidden: boolean; flagCount: number; alreadyFlagged: boolean }> {
  const sql = asSql(db());
  return flagIssueWith(sql, issueId, voterId, reason);
}

export async function flagIssueWith(
  sql: Sql,
  issueId: string,
  voterId: string,
  reason: FlagReason,
): Promise<{ hidden: boolean; flagCount: number; alreadyFlagged: boolean }> {
  return sql.begin(async (tx) => {
    const [issue] =
      await tx`SELECT id, hidden_at FROM pafos_issues WHERE id=${issueId} FOR UPDATE`;
    if (!issue) return { hidden: false, flagCount: 0, alreadyFlagged: false };

    const inserted = await tx`
      INSERT INTO pafos_flags(issue_id, voter_id, reason, created_at)
      VALUES(${issueId}, ${voterId}, ${reason}, ${Date.now()})
      ON CONFLICT (issue_id, voter_id) DO NOTHING
      RETURNING issue_id`;
    const alreadyFlagged = inserted.length === 0;

    const [counted] =
      await tx`SELECT count(*)::int AS total FROM pafos_flags WHERE issue_id=${issueId}`;
    const flagCount = Number(counted.total);

    // Already hidden reports stay hidden; the moderator decides what happens.
    if (issue.hidden_at != null)
      return { hidden: true, flagCount, alreadyFlagged };

    if (flagCount >= FLAG_HIDE_THRESHOLD) {
      await tx`UPDATE pafos_issues
               SET hidden_at=${Date.now()}, hidden_reason='flagged'
               WHERE id=${issueId} AND hidden_at IS NULL`;
      return { hidden: true, flagCount, alreadyFlagged };
    }
    return { hidden: false, flagCount, alreadyFlagged };
  });
}

/** Flagged reports for the moderation queue, unreviewed and hidden ones first. */
export async function listFlagged(): Promise<FlaggedIssue[]> {
  const sql = asSql(db());
  return listFlaggedWith(sql);
}

export async function listFlaggedWith(sql: Sql): Promise<FlaggedIssue[]> {
  const rows = await sql`
    SELECT i.data, i.hidden_at, i.reviewed_at, i.reviewed_by, i.review_outcome,
           count(f.*)::int AS flag_count,
           array_agg(DISTINCT f.reason) AS reasons
    FROM pafos_issues i
    JOIN pafos_flags f ON f.issue_id = i.id
    GROUP BY i.id, i.data, i.hidden_at, i.reviewed_at, i.reviewed_by, i.review_outcome
    ORDER BY (i.reviewed_at IS NULL) DESC, (i.hidden_at IS NOT NULL) DESC, max(f.created_at) DESC
    LIMIT 200`;
  return rows.map((row) => ({
    issueId: (row.data as Issue).id,
    flagCount: Number(row.flag_count),
    reasons: (row.reasons as FlagReason[]) ?? [],
    hiddenAt: row.hidden_at ? Number(row.hidden_at) : undefined,
    reviewedAt: row.reviewed_at ? Number(row.reviewed_at) : undefined,
    reviewedBy: (row.reviewed_by as string) ?? undefined,
    outcome: (row.review_outcome as FlaggedIssue["outcome"]) ?? undefined,
    issue: row.data as Issue,
  }));
}

/**
 * Apply a moderator's decision to a flagged report. `restored` returns it to
 * the public board and clears the flags that triggered the hide; `removed`
 * keeps it hidden and auditable rather than deleting the row.
 */
export async function reviewFlagged(
  issueId: string,
  outcome: "restored" | "removed",
  reviewer = "moderator",
) {
  const sql = asSql(db());
  return reviewFlaggedWith(sql, issueId, outcome, reviewer);
}

export async function reviewFlaggedWith(
  sql: Sql,
  issueId: string,
  outcome: "restored" | "removed",
  reviewer = "moderator",
) {
  return sql.begin(async (tx) => {
    const [issue] =
      await tx`SELECT id FROM pafos_issues WHERE id=${issueId} FOR UPDATE`;
    if (!issue) return false;
    const now = Date.now();
    if (outcome === "restored") {
      await tx`DELETE FROM pafos_flags WHERE issue_id=${issueId}`;
      await tx`UPDATE pafos_issues
               SET hidden_at=NULL, hidden_reason=NULL,
                   reviewed_at=${now}, reviewed_by=${reviewer}, review_outcome='restored'
               WHERE id=${issueId}`;
    } else {
      await tx`UPDATE pafos_issues
               SET hidden_at=COALESCE(hidden_at, ${now}), hidden_reason='moderator',
                   reviewed_at=${now}, reviewed_by=${reviewer}, review_outcome='removed'
               WHERE id=${issueId}`;
    }
    return true;
  });
}
