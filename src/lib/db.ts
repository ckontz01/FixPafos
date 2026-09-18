import postgres from "postgres";
import type { Issue, Reply, QuarantineItem } from "./issues";
let client: ReturnType<typeof postgres> | undefined;
export function db() {
  if (!process.env.DATABASE_URL)
    throw new Error("PafosLive database is not configured");
  client ??= postgres(process.env.DATABASE_URL, {
    ssl: "verify-full",
    max: 3,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
  return client;
}
export async function listIssues(voterId?: string) {
  const sql = db();
  const rows = await sql`
    SELECT i.data,
      p.status AS photo_status,
      (SELECT count(*)::int FROM pafos_votes v WHERE v.issue_id=i.id) AS seconds,
      EXISTS(SELECT 1 FROM pafos_votes v WHERE v.issue_id=i.id AND v.voter_id=${voterId ?? ""}) AS seconded,
      COALESCE((SELECT jsonb_agg(r.data ORDER BY r.created_at) FROM pafos_replies r WHERE r.issue_id=i.id),'[]'::jsonb) AS replies
    FROM pafos_issues i LEFT JOIN pafos_photos p ON p.issue_id=i.id ORDER BY i.created_at DESC`;
  return {
    posts: rows.map(
      (r) =>
        ({
          ...r.data,
          status: r.data.status ?? "open",
          seconds: r.seconds,
          replies: r.replies,
          photo: r.photo_status
            ? {
                status: r.photo_status,
                ...(r.photo_status === "approved"
                  ? { url: `/api/photos/${r.data.id}` }
                  : {}),
              }
            : undefined,
        }) as Issue,
    ),
    seconded: rows.filter((r) => r.seconded).map((r) => r.data.id as string),
  };
}
export async function insertIssue(issue: Issue) {
  const sql = db();
  await sql`INSERT INTO pafos_issues(id,data,created_at) VALUES(${issue.id},${sql.json(issue)},${issue.createdAt})`;
}
export async function issueExists(id: string) {
  const sql = db();
  return (await sql`SELECT 1 FROM pafos_issues WHERE id=${id}`).length > 0;
}
export async function insertReply(id: string, reply: Reply) {
  const sql = db();
  await sql`INSERT INTO pafos_replies(id,issue_id,data,created_at) VALUES(${reply.id},${id},${sql.json(reply)},${reply.createdAt})`;
}
export async function quarantine(
  submission: Issue | Reply,
  decision: { source: string; category: string },
  parentId?: string,
) {
  const sql = db();
  await sql`INSERT INTO pafos_quarantine(id,submission_type,parent_post_id,submission,blocked_by,category,created_at)
  VALUES(${submission.id},${parentId ? "reply" : "post"},${parentId ?? null},${sql.json(submission)},${decision.source},${decision.category},${submission.createdAt}) ON CONFLICT DO NOTHING`;
}
export async function listQuarantine(): Promise<QuarantineItem[]> {
  const sql = db();
  const rows =
    await sql`SELECT * FROM pafos_quarantine ORDER BY status='pending' DESC,created_at DESC`;
  return rows.map((r) => ({
    id: r.id,
    submissionType: r.submission_type,
    parentPostId: r.parent_post_id ?? undefined,
    submission: r.submission,
    blockedBy: r.blocked_by,
    category: r.category,
    status: r.status,
    reviewedAt: r.reviewed_at ? Number(r.reviewed_at) : undefined,
  }));
}
export async function publishQuarantine(
  id: string,
  assignment?: Issue["assignment"],
) {
  const sql = db();
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
  const sql = db();
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
    return row.count as number;
  });
}
export async function removeFlagged(id: string) {
  const sql = db();
  return (
    (await sql`DELETE FROM pafos_issues WHERE id=${id} RETURNING id`).length > 0
  );
}
