import { listIssues, type IssueQuery } from "@/lib/db";
import { parseIssue, validId } from "@/lib/validation";
import { moderateFeedback } from "@/lib/feedback-moderation";
import { classifyIssue } from "@/lib/assignment";
import { fail, handle, json, limited } from "@/lib/http";
import { PhotoInputError, reportInput, saveReport } from "@/lib/photos";
import { applyCluster, detectDuplicate } from "@/lib/duplicates";
import { db, type Sql } from "@/lib/db";
import {
  categories,
  severityLevels,
  withinPafos,
  type Category,
  type Severity,
} from "@/lib/issues";
import { isDepartmentId } from "@/lib/departments";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const number = (value: string | null) => {
  if (value === null) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * Translate query parameters into a validated `IssueQuery`.
 *
 * Anything unrecognised is dropped rather than rejected: an unknown filter
 * should return the unfiltered board, not an error page. Bounds are only
 * applied when all four edges parse and describe a real box.
 */
function parseQuery(url: URL): IssueQuery {
  const params = url.searchParams;
  const category = params.get("category");
  const status = params.get("status");
  const severity = params.get("severity");
  const departmentId = params.get("department");
  const voterId = params.get("voterId");
  const cursorAt = number(params.get("cursorAt"));
  const cursorId = params.get("cursorId");

  const west = number(params.get("west"));
  const south = number(params.get("south"));
  const east = number(params.get("east"));
  const north = number(params.get("north"));
  const bounded =
    west !== undefined &&
    south !== undefined &&
    east !== undefined &&
    north !== undefined &&
    west < east &&
    south < north;

  const search = params.get("q")?.slice(0, 120);

  return {
    voterId: validId(voterId) ? voterId : undefined,
    limit: number(params.get("limit")),
    category:
      category && Object.hasOwn(categories, category)
        ? (category as Category)
        : undefined,
    status: status === "open" || status === "resolved" ? status : undefined,
    severity: (severityLevels as readonly string[]).includes(severity ?? "")
      ? (severity as Severity)
      : undefined,
    departmentId: isDepartmentId(departmentId) ? departmentId : undefined,
    bounds: bounded ? { west, south, east, north } : undefined,
    search: search || undefined,
    cursor:
      cursorAt !== undefined && cursorId && validId(cursorId)
        ? { createdAt: cursorAt, id: cursorId }
        : undefined,
  };
}

export function GET(request: Request) {
  return handle(request, async () =>
    json(await listIssues(parseQuery(new URL(request.url)))),
  );
}

export function POST(request: Request) {
  return handle(request, async () => {
    if (await limited(request, "report-upload", 10))
      return fail("error.rateLimited", 429);
    let submission;
    try {
      submission = await reportInput(request);
    } catch (e) {
      if (e instanceof PhotoInputError)
        return fail(
          e.message.includes("4 MB") ? "error.photoTooLarge" : "error.photoInvalid",
          400,
        );
      throw e;
    }
    const issue = parseIssue(submission.input);
    if (!issue) return fail("error.invalidReport", 400);
    if (!withinPafos(issue.location.longitude, issue.location.latitude))
      return fail("error.invalidReport", 400);
    if (await limited(request, "moderation"))
      return fail("error.rateLimited", 429);
    const decision = await moderateFeedback({
      author: issue.author,
      message: issue.message,
      locationLabel: issue.location.label,
    });
    if (decision.status === "blocked") {
      await saveReport(issue, submission.photo, decision);
      return fail("error.moderationBlocked", 422);
    }
    if (decision.status === "unavailable")
      return fail("error.moderationUnavailable", 503);
    const classification = await classifyIssue(issue);
    if (!classification) return fail("error.assignmentUnavailable", 503);
    issue.assignment = classification.assignment;
    issue.category = classification.assignment.category;
    issue.severity = classification.severity;

    // Duplicate detection runs after classification, because the category it
    // produces is one of the matching signals. A failure here must never block
    // publication: the report is valid either way, it simply stays an
    // independent case. Detection and linking are therefore separate from the
    // save, which happens exactly once on every path.
    let duplicate = null;
    try {
      duplicate = await detectDuplicate(db() as unknown as Sql, issue);
      if (duplicate) issue.cluster = duplicate.link;
    } catch (error) {
      console.error(
        "Duplicate detection could not complete:",
        error instanceof Error ? error.message : "unknown error",
      );
    }

    await saveReport(issue, submission.photo);

    if (duplicate) {
      try {
        await applyCluster(db() as unknown as Sql, issue, duplicate);
      } catch (error) {
        // The report is already published; only the cluster bookkeeping failed.
        console.error(
          "Cluster link could not be recorded:",
          error instanceof Error ? error.message : "unknown error",
        );
      }
    }
    return json({ post: issue }, 201);
  });
}
