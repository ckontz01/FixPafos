import { createHash, timingSafeEqual } from "node:crypto";
import { db } from "./db";
export const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Error responses carry a stable `code` plus an English `error` fallback.
 * The client translates the code into the reader's language, so the server
 * never has to know which language that is; the fallback keeps the response
 * readable for anything that does not know the codes.
 */
export function fail(code: ErrorCode, status: number) {
  return json({ code, error: ERROR_FALLBACKS[code] }, status);
}

export const ERROR_FALLBACKS = {
  "error.generic": "The request failed.",
  "error.unavailable": "The community board is temporarily unavailable.",
  "error.crossOrigin": "The request was rejected.",
  "error.invalidReport":
    "Add a name (up to 40 characters), a report (up to 500), a category and a location in the Pafos area.",
  "error.invalidReply": "Add a name and a reply up to 500 characters.",
  "error.invalidIssue": "Invalid issue.",
  "error.notFound": "Issue not found.",
  "error.rateLimited": "Too many submissions. Please wait a minute.",
  "error.rateLimitedFlag": "Please wait a minute before flagging again.",
  "error.rateLimitedVote": "Please wait a minute before voting again.",
  "error.rateLimitedLogin":
    "Too many verification attempts. Try again in 15 minutes.",
  "error.moderationBlocked":
    "This report was not published because it may contain inappropriate content. It was saved for moderator review.",
  "error.moderationBlockedReply":
    "This reply was not published because it may contain inappropriate content. It was saved for moderator review.",
  "error.moderationUnavailable":
    "This could not be checked right now. Please try again.",
  "error.assignmentUnavailable":
    "Department assignment is temporarily unavailable. Your report has not been published; please try again.",
  "error.photoTooLarge": "Choose a photo smaller than 4 MB.",
  "error.photoInvalid":
    "Choose a valid JPEG, PNG or WebP photo, up to 4 MB and 25 megapixels.",
  "error.teamUnauthorized": "Verify your department first.",
  "error.teamForbidden":
    "Only the assigned department can give a verified update or resolve this issue.",
  "error.teamBadPassword": "Incorrect department password.",
  "error.alreadyResolved": "This issue is already resolved.",
  "error.conflict": "The issue changed. Refresh before trying again.",
  "error.moderationPassword": "Incorrect moderation password.",
  "error.moderationNotConfigured": "Moderation access is not configured.",
  "error.updateLength": "Add an update of 1-500 characters.",
  "flag.alreadyFlagged": "You have already flagged this report.",
} as const;

export type ErrorCode = keyof typeof ERROR_FALLBACKS;
export async function body(request: Request) {
  // Bound actual bytes, including chunked requests without Content-Length.
  const reader = request.body?.getReader();
  if (!reader) return null;
  let total = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > 16384) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return null;
  }
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
function clientKey(request: Request, scope: string) {
  const ip =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local";
  return createHash("sha256")
    .update(`${process.env.FEEDBACK_ADMIN_PASSWORD}:${scope}:${ip}`)
    .digest("hex");
}
export async function limited(
  request: Request,
  scope: string,
  limit = 10,
  windowMs = 60000,
) {
  const sql = db(),
    now = Date.now(),
    key = clientKey(request, scope);
  const [row] =
    await sql`INSERT INTO pafos_rate_limits(key,attempts) VALUES(${key},ARRAY[${now}::bigint])
    ON CONFLICT(key) DO UPDATE SET attempts = ARRAY(SELECT t FROM unnest(pafos_rate_limits.attempts) t WHERE t>${now - windowMs}) || ${now}::bigint
    RETURNING cardinality(attempts) AS count`;
  // Occasional expiry avoids retaining client hashes indefinitely.
  if (Math.random() < 0.02)
    await sql`DELETE FROM pafos_rate_limits WHERE attempts[array_length(attempts,1)]<${now - 86400000}`;
  return row.count > limit;
}
export async function authenticate(request: Request, password: unknown) {
  const configured = process.env.FEEDBACK_ADMIN_PASSWORD;
  if (!configured) return fail("error.moderationNotConfigured", 503);
  const key = clientKey(request, "admin"),
    sql = db();
  const [row] =
    await sql`SELECT cardinality(ARRAY(SELECT t FROM unnest(attempts) t WHERE t>${Date.now() - 900000})) AS count FROM pafos_rate_limits WHERE key=${key}`;
  if (row && row.count >= 5)
    return fail("error.rateLimitedLogin", 429);
  const hash = (s: string) => createHash("sha256").update(s).digest();
  if (
    typeof password !== "string" ||
    !timingSafeEqual(hash(password), hash(configured))
  ) {
    await limited(request, "admin", 5, 900000);
    return fail("error.moderationPassword", 401);
  }
  await sql`DELETE FROM pafos_rate_limits WHERE key=${key}`;
  return null;
}
export async function handle(
  request: Request,
  action: () => Promise<Response>,
) {
  if (request.method !== "GET" && !sameOrigin(request))
    return fail("error.crossOrigin", 403);
  try {
    return await action();
  } catch {
    console.error("PafosLive request could not complete");
    return fail("error.unavailable", 503);
  }
}
