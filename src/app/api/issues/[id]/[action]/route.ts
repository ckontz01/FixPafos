import {
  insertReply,
  issueExists,
  quarantine,
  removeFlagged,
  setVote,
} from "@/lib/db";
import { parseReply, validId } from "@/lib/validation";
import { moderateFeedback } from "@/lib/feedback-moderation";
import { body, handle, json, limited } from "@/lib/http";
export const maxDuration = 60;
export function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; action: string }> },
) {
  return handle(request, async () => {
    const { id, action } = await params;
    if (!validId(id)) return json({ error: "Invalid issue" }, 400);
    if (!["replies", "second", "flag"].includes(action))
      return json({ error: "Not found" }, 404);
    if (!(await issueExists(id)))
      return json({ error: "Issue not found" }, 404);
    if (action === "flag") {
      if (await limited(request, "flag"))
        return json(
          { error: "Please wait a minute before flagging again." },
          429,
        );
      await removeFlagged(id);
      return new Response(null, { status: 204 });
    }
    const input = await body(request);
    if (action === "second") {
      if (!validId(input?.voterId) || typeof input?.seconded !== "boolean")
        return json({ error: "Invalid vote" }, 400);
      if (await limited(request, "vote", 60))
        return json(
          { error: "Please wait a minute before voting again." },
          429,
        );
      const seconds = await setVote(id, input.voterId, input.seconded);
      return seconds === null
        ? json({ error: "Issue not found" }, 404)
        : json({ seconds, seconded: input.seconded });
    }
    const reply = parseReply(input);
    if (!reply)
      return json(
        { error: "Add a name and a reply up to 500 characters." },
        400,
      );
    if (await limited(request, "moderation"))
      return json(
        { error: "Too many submissions. Please wait a minute and try again." },
        429,
      );
    const decision = await moderateFeedback(reply);
    if (decision.status === "blocked") {
      await quarantine(reply, decision, id);
      return json(
        {
          error:
            "This reply was not published because it may contain inappropriate content. It was saved for moderator review.",
        },
        422,
      );
    }
    if (decision.status === "unavailable")
      return json(
        {
          error: "This reply could not be checked right now. Please try again.",
        },
        503,
      );
    await insertReply(id, reply);
    return json({ reply }, 201);
  });
}
