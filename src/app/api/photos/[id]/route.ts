import { db } from "@/lib/db";
import { handle, json } from "@/lib/http";
import { validId } from "@/lib/validation";
import { photoResponse } from "@/lib/photos";
export const dynamic = "force-dynamic";
export function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handle(request, async () => {
    const { id } = await context.params;
    if (!validId(id)) return json({ error: "Photo not found." }, 404);
    const sql = db();
    const [row] =
      await sql`SELECT p.blob_path FROM pafos_photos p JOIN pafos_issues i ON i.id=p.issue_id WHERE p.issue_id=${id} AND p.status='approved'`;
    return row
      ? photoResponse(row.blob_path)
      : json({ error: "Photo not found." }, 404);
  });
}
