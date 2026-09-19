import { flagIssue, insertReply, issueExists, quarantine, setVote } from "@/lib/db";
import { parseReply, validId } from "@/lib/validation";
import { moderateFeedback } from "@/lib/feedback-moderation";
import { body, fail, handle, json, limited } from "@/lib/http";
import { isFlagReason } from "@/lib/issues";

export const maxDuration = 60;

export function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  return handle(request, async () => {
    const { id, action } = await params;
    if (!validId(id)) return fail("error.invalidIssue", 400);
    if (!["replies", "second", "flag"].includes(action))
      return json({ error: "Not found" }, 404);
    if (!(await issueExists(id))) return fail("error.notFound", 404);

    const input = await body(request);

    if (action === "flag") {
      if (await limited(request, "flag"))
        return fail("error.rateLimitedFlag", 429);
      if (!isFlagReason(input?.reason) || !validId(input?.voterId))
        return fail("error.invalidIssue", 400);
      // Flagging never deletes: it records a review request and only withdraws
      // the report from public view once enough distinct people have flagged it.
      const result = await flagIssue(id, input.voterId, input.reason);
      return json(result, result.alreadyFlagged ? 200 : 201);
    }

    if (action === "second") {
      if (!validId(input?.voterId) || typeof input?.seconded !== "boolean")
        return fail("error.invalidIssue", 400);
      if (await limited(request, "vote", 60))
        return fail("error.rateLimitedVote", 429);
      const seconds = await setVote(id, input.voterId, input.seconded);
      return seconds === null
        ? fail("error.notFound", 404)
        : json({ seconds, seconded: input.seconded });
    }

    const reply = parseReply(input);
    if (!reply) return fail("error.invalidReply", 400);
    if (await limited(request, "moderation"))
      return fail("error.rateLimited", 429);
    const decision = await moderateFeedback(reply);
    if (decision.status === "blocked") {
      await quarantine(reply, decision, id);
      return fail("error.moderationBlockedReply", 422);
    }
    if (decision.status === "unavailable")
      return fail("error.moderationUnavailable", 503);
    await insertReply(id, reply);
    return json({ reply }, 201);
  });
}
