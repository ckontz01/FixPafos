import { insertIssue, listIssues, quarantine } from "@/lib/db";
import { parseIssue, validId } from "@/lib/validation";
import { moderateFeedback } from "@/lib/feedback-moderation";
import { assignIssue } from "@/lib/assignment";
import { body, handle, json, limited } from "@/lib/http";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export function GET(request: Request) {
  return handle(request, async () => {
    const voterId = new URL(request.url).searchParams.get("voterId");
    return json(await listIssues(validId(voterId) ? voterId : undefined));
  });
}
export function POST(request: Request) {
  return handle(request, async () => {
    const issue = parseIssue(await body(request));
    if (!issue)
      return json(
        {
          error:
            "Add a name (up to 40 characters), a report (up to 500), a category and a location in the Pafos area.",
        },
        400,
      );
    if (await limited(request, "moderation"))
      return json(
        { error: "Too many submissions. Please wait a minute and try again." },
        429,
      );
    const decision = await moderateFeedback({
      author: issue.author,
      message: issue.message,
      locationLabel: issue.location.label,
    });
    if (decision.status === "blocked") {
      await quarantine(issue, decision);
      return json(
        {
          error:
            "This report was not published because it may contain inappropriate content. It was saved for moderator review.",
        },
        422,
      );
    }
    if (decision.status === "unavailable")
      return json(
        {
          error:
            "This report could not be checked right now. Please try again.",
        },
        503,
      );
    const assignment = await assignIssue(issue);
    if (!assignment)
      return json(
        {
          error:
            "Department assignment is temporarily unavailable. Your report has not been published; please try again.",
        },
        503,
      );
    issue.assignment = assignment;
    issue.category = assignment.category;
    await insertIssue(issue);
    return json({ post: issue }, 201);
  });
}
