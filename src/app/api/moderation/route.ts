import { listQuarantine, publishQuarantine } from "@/lib/db";
import { authenticate, body, handle, json } from "@/lib/http";
import { validId } from "@/lib/validation";
import { assignIssue } from "@/lib/assignment";
import type { Issue } from "@/lib/issues";
export const maxDuration = 60;
export function POST(request: Request) {
  return handle(request, async () => {
    const input = await body(request);
    const rejected = await authenticate(request, input?.password);
    if (rejected) return rejected;
    if (input?.action === "publish") {
      if (!validId(input.id)) return json({ error: "Invalid submission" }, 400);
      const item = (await listQuarantine()).find((i) => i.id === input.id);
      if (!item) return json({ error: "Submission not found" }, 404);
      if (item.status === "published")
        return json({ status: "already_published" });
      const assignment =
        item.submissionType === "post"
          ? await assignIssue(item.submission as Issue)
          : undefined;
      if (assignment === null)
        return json(
          { error: "Department assignment unavailable. Please try again." },
          503,
        );
      const status = await publishQuarantine(item.id, assignment);
      if (status === "parent_missing")
        return json(
          {
            error:
              "The original issue was removed; this reply cannot be published.",
          },
          409,
        );
      return json({ status });
    }
    return json({ items: await listQuarantine() });
  });
}
