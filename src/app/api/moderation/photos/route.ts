import { db } from "@/lib/db";
import { authenticate, body, handle, json } from "@/lib/http";
import { validId } from "@/lib/validation";
import { photoResponse } from "@/lib/photos";
export function POST(request: Request) {
  return handle(request, async () => {
    const input = await body(request);
    const rejected = await authenticate(request, input?.password);
    if (rejected) return rejected;
    const sql = db();
    if (!input.action) {
      const rows =
        await sql`SELECT p.issue_id AS id,p.status,COALESCE(i.data,q.submission) AS report FROM pafos_photos p LEFT JOIN pafos_issues i ON i.id=p.issue_id LEFT JOIN pafos_quarantine q ON q.id=p.issue_id WHERE i.id IS NOT NULL OR (q.id IS NOT NULL AND q.status='pending') ORDER BY (p.status='pending') DESC,p.created_at DESC LIMIT 100`;
      return json({ photos: rows });
    }
    if (!validId(input.id)) return json({ error: "Invalid photo." }, 400);
    const [row] =
      await sql`SELECT blob_path FROM pafos_photos WHERE issue_id=${input.id}`;
    if (!row) return json({ error: "Photo not found." }, 404);
    if (input.action === "view") return photoResponse(row.blob_path);
    if (!["approve", "reject"].includes(input.action))
      return json({ error: "Invalid action." }, 400);
    await sql`UPDATE pafos_photos SET status=${input.action === "approve" ? "approved" : "rejected"},reviewed_at=${Date.now()} WHERE issue_id=${input.id}`;
    return json({ ok: true });
  });
}
