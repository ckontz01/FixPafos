import { randomUUID } from "node:crypto";
import { db, quarantine } from "@/lib/db";
import { body, fail, handle, json, limited } from "@/lib/http";
import { teamSession } from "@/lib/team";
import { departmentFor } from "@/lib/departments";
import { moderateFeedback } from "@/lib/feedback-moderation";
import { validId } from "@/lib/validation";
import type { Reply } from "@/lib/issues";
export const maxDuration = 60;
export function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handle(request, async () => {
    const departmentId = await teamSession(request);
    if (!departmentId)
      return fail("error.teamUnauthorized", 401);
    const { id } = await context.params,
      input = await body(request),
      sql = db();
    if (
      !validId(id) ||
      !["reply", "resolve"].includes(input?.action) ||
      typeof input?.message !== "string" ||
      !input.message.trim() ||
      input.message.trim().length > 500
    )
      return fail("error.updateLength", 400);
    const [issue] = await sql`SELECT data FROM pafos_issues WHERE id=${id}`;
    if (!issue) return fail("error.notFound", 404);
    if (issue.data.assignment.departmentId !== departmentId)
      return fail("error.teamForbidden", 403);
    if (input.action === "resolve" && issue.data.status === "resolved")
      return fail("error.alreadyResolved", 409);
    if (await limited(request, "moderation"))
      return fail("error.rateLimited", 429);
    const reply: Reply = {
      id: randomUUID(),
      author: departmentFor(departmentId).name,
      message: input.message.trim(),
      createdAt: Date.now(),
      verifiedDepartmentId: departmentId,
    };
    const decision = await moderateFeedback({
      author: reply.author,
      message: reply.message,
    });
    if (decision.status === "unavailable")
      return fail("error.moderationUnavailable", 503);
    if (decision.status === "blocked") {
      await quarantine(reply, decision, id);
      return fail("error.moderationBlockedReply", 422);
    }
    const result = await sql.begin(async (tx) => {
      const [current] =
        await tx`SELECT data FROM pafos_issues WHERE id=${id} FOR UPDATE`;
      if (!current) return 404;
      if (current.data.assignment.departmentId !== departmentId) return 403;
      if (input.action === "resolve") {
        if (current.data.status === "resolved") return 409;
        reply.kind = "resolution";
        const updated = {
          ...current.data,
          status: "resolved",
          resolution: { departmentId, at: reply.createdAt },
        };
        await tx`UPDATE pafos_issues SET data=${tx.json(updated)} WHERE id=${id}`;
      }
      await tx`INSERT INTO pafos_replies(id,issue_id,data,created_at) VALUES(${reply.id},${id},${tx.json(reply)},${reply.createdAt})`;
      return 201;
    });
    return result === 201
      ? json(
          {
            reply,
            status:
              input.action === "resolve"
                ? "resolved"
                : (issue.data.status ?? "open"),
          },
          201,
        )
      : fail("error.conflict", result === 404 ? 404 : result === 403 ? 403 : 409);
  });
}
