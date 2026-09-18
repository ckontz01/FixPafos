import { randomUUID } from "node:crypto";
import {
  categories,
  withinPafos,
  type Category,
  type Issue,
  type Reply,
} from "./issues";
export const validId = (v: unknown): v is string =>
  typeof v === "string" && /^[a-zA-Z0-9-]{8,80}$/.test(v);
const record = (v: unknown): Record<string, unknown> | null =>
  v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
const text = (v: unknown, max: number) =>
  typeof v === "string" && v.trim().length > 0 && v.trim().length <= max
    ? v.trim()
    : null;
export function parseIssue(value: unknown): Issue | null {
  const input = record(value);
  if (!input) return null;
  const author = text(input.author, 40),
    message = text(input.message, 500),
    loc = record(input.location);
  const category = input.category;
  if (
    !author ||
    !message ||
    !loc ||
    typeof category !== "string" ||
    (category !== "unsure" && !Object.hasOwn(categories, category))
  )
    return null;
  const label = text(loc.label, 100),
    longitude = loc.longitude,
    latitude = loc.latitude;
  if (
    !label ||
    typeof longitude !== "number" ||
    typeof latitude !== "number" ||
    !withinPafos(longitude, latitude)
  )
    return null;
  return {
    id: randomUUID(),
    author,
    message,
    location: { label, longitude, latitude },
    // A valid internal placeholder until DeepSeek supplies the public category.
    // reportedCategory preserves the absence of a user hint through quarantine.
    category: category === "unsure" ? "other" : (category as Category),
    reportedCategory: category as Issue["reportedCategory"],
    assignment: {
      departmentId: "review",
      confidence: "low",
      source: "manual_review",
      category: category === "unsure" ? "other" : (category as Category),
    },
    createdAt: Date.now(),
    seconds: 0,
    replies: [],
  };
}
export function parseReply(value: unknown): Reply | null {
  const input = record(value);
  if (!input) return null;
  const author = text(input.author, 40),
    message = text(input.message, 500);
  return author && message
    ? { id: randomUUID(), author, message, createdAt: Date.now() }
    : null;
}
