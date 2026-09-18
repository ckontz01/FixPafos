import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { body, handle, json, limited } from "@/lib/http";
import {
  checkPassword,
  hashToken,
  isDepartment,
  sessionCookie,
  sessionToken,
  teamSession,
} from "@/lib/team";
export const dynamic = "force-dynamic";
export function GET(request: Request) {
  return handle(request, async () =>
    json({ departmentId: await teamSession(request) }),
  );
}
export function POST(request: Request) {
  return handle(request, async () => {
    if (await limited(request, "team-login", 5, 900000))
      return json(
        { error: "Too many verification attempts. Try again in 15 minutes." },
        429,
      );
    const input = await body(request);
    if (!isDepartment(input?.departmentId))
      return json({ error: "Choose a valid department." }, 400);
    const sql = db();
    const [row] =
      await sql`SELECT password_hash FROM pafos_team_credentials WHERE department_id=${input.departmentId}`;
    if (!row || !(await checkPassword(input.password, row.password_hash)))
      return json({ error: "Incorrect department password." }, 401);
    const old = sessionToken(request);
    if (old)
      await sql`DELETE FROM pafos_team_sessions WHERE token_hash=${hashToken(old)}`;
    await sql`DELETE FROM pafos_team_sessions WHERE expires_at<${Date.now()}`;
    const token = randomBytes(32).toString("hex");
    await sql`INSERT INTO pafos_team_sessions(token_hash,department_id,expires_at) VALUES(${hashToken(token)},${input.departmentId},${Date.now() + 28800000})`;
    const response = json({ departmentId: input.departmentId });
    response.headers.set("Set-Cookie", sessionCookie(request, token));
    return response;
  });
}
export function DELETE(request: Request) {
  return handle(request, async () => {
    const token = sessionToken(request),
      sql = db();
    if (token)
      await sql`DELETE FROM pafos_team_sessions WHERE token_hash=${hashToken(token)}`;
    const response = json({ departmentId: null });
    response.headers.set("Set-Cookie", sessionCookie(request, "", 0));
    return response;
  });
}
