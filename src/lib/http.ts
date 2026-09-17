import { createHash, timingSafeEqual } from "node:crypto";
import { db } from "./db";
export const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
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
  if (!configured)
    return json({ error: "Moderation access is not configured" }, 503);
  const key = clientKey(request, "admin"),
    sql = db();
  const [row] =
    await sql`SELECT cardinality(ARRAY(SELECT t FROM unnest(attempts) t WHERE t>${Date.now() - 900000})) AS count FROM pafos_rate_limits WHERE key=${key}`;
  if (row && row.count >= 5)
    return json(
      { error: "Too many incorrect attempts. Please try again later" },
      429,
    );
  const hash = (s: string) => createHash("sha256").update(s).digest();
  if (
    typeof password !== "string" ||
    !timingSafeEqual(hash(password), hash(configured))
  ) {
    await limited(request, "admin", 5, 900000);
    return json({ error: "Incorrect moderation password" }, 401);
  }
  await sql`DELETE FROM pafos_rate_limits WHERE key=${key}`;
  return null;
}
export async function handle(
  request: Request,
  action: () => Promise<Response>,
) {
  if (request.method !== "GET" && !sameOrigin(request))
    return json({ error: "Cross-origin request rejected" }, 403);
  try {
    return await action();
  } catch {
    console.error("PafosLive request could not complete");
    return json(
      {
        error:
          "The community board is temporarily unavailable. Please try again.",
      },
      503,
    );
  }
}
