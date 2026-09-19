import {
  db,
  listFlagged,
  listQuarantine,
  publishQuarantine,
  reviewFlagged,
  type Sql,
} from "@/lib/db";
import { authenticate, body, fail, handle, json } from "@/lib/http";
import { validId } from "@/lib/validation";
import { classifyIssue } from "@/lib/assignment";
import { listSuggestedClusters, reviewClusterWith } from "@/lib/duplicates";
import type { Issue } from "@/lib/issues";

export const maxDuration = 60;

export function POST(request: Request) {
  return handle(request, async () => {
    const input = await body(request);
    const rejected = await authenticate(request, input?.password);
    if (rejected) return rejected;

    switch (input?.action) {
      case "publish": {
        if (!validId(input.id)) return fail("error.invalidIssue", 400);
        const item = (await listQuarantine()).find((i) => i.id === input.id);
        if (!item) return fail("error.notFound", 404);
        if (item.status === "published") return json({ status: "already_published" });
        // A released report is classified now, so it is routed and triaged on
        // the same terms as one that was never quarantined.
        const classification =
          item.submissionType === "post"
            ? await classifyIssue(item.submission as Issue)
            : undefined;
        if (classification === null) return fail("error.assignmentUnavailable", 503);
        if (classification && item.submissionType === "post")
          (item.submission as Issue).severity = classification.severity;
        const status = await publishQuarantine(item.id, classification?.assignment);
        if (status === "parent_missing") return fail("error.conflict", 409);
        return json({ status });
      }

      case "flags":
        return json({ flagged: await listFlagged() });

      case "review-flag": {
        if (!validId(input.id)) return fail("error.invalidIssue", 400);
        if (input.outcome !== "restored" && input.outcome !== "removed")
          return fail("error.invalidIssue", 400);
        const applied = await reviewFlagged(input.id, input.outcome);
        return applied ? json({ status: input.outcome }) : fail("error.notFound", 404);
      }

      case "clusters":
        return json({
          clusters: await listSuggestedClusters(db() as unknown as Sql),
        });

      case "review-cluster": {
        if (!validId(input.id)) return fail("error.invalidIssue", 400);
        if (input.outcome !== "confirmed" && input.outcome !== "separated")
          return fail("error.invalidIssue", 400);
        const applied = await reviewClusterWith(
          db() as unknown as Sql,
          input.id,
          input.outcome,
        );
        return applied ? json({ status: input.outcome }) : fail("error.notFound", 404);
      }

      default:
        return json({ items: await listQuarantine() });
    }
  });
}
