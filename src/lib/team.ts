import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { db } from "./db";
import { departments } from "./departments";
const derive = promisify(scrypt);
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const isDepartment = (id: unknown): id is keyof typeof departments =>
  typeof id === "string" && Object.hasOwn(departments, id);
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${((await derive(password, salt, 64)) as Buffer).toString("hex")}`;
}
export async function checkPassword(password: unknown, encoded: string) {
  if (typeof password !== "string" || password.length > 256) return false;
  const [salt, hash] = encoded.split(":");
  if (!salt || !hash || !/^[a-f0-9]{128}$/.test(hash)) return false;
  const actual = (await derive(password, salt, 64)) as Buffer;
  return timingSafeEqual(actual, Buffer.from(hash, "hex"));
}
export function sessionToken(request: Request) {
  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith("pafos-team="))
    ?.slice(11);
  return token && /^[a-f0-9]{64}$/.test(token) ? token : null;
}
export async function teamSession(request: Request) {
  const token = sessionToken(request);
  if (!token) return null;
  const sql = db();
  const [row] =
    await sql`SELECT department_id FROM pafos_team_sessions WHERE token_hash=${hashToken(token)} AND expires_at>${Date.now()}`;
  return row && isDepartment(row.department_id) ? row.department_id : null;
}
export function sessionCookie(request: Request, token: string, age = 28800) {
  return `pafos-team=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}
