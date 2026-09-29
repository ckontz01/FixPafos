import { isLocale, type Locale } from "./i18n/config";

export type ChatTurn = { role: "user" | "assistant"; content: string };
export type ChatRequest = { locale: Locale; messages: ChatTurn[] };
export type ChatGuidance = { reply: string; summary: string; ready: boolean };

const object = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

// A bounded, text-only conversation. Device permissions, files, coordinates,
// identity and publication are owned by the UI, never model-generated actions.
export function parseChatRequest(value: unknown): ChatRequest | null {
  const input = object(value);
  if (
    !input ||
    !isLocale(input.locale) ||
    !Array.isArray(input.messages) ||
    input.messages.length < 1 ||
    input.messages.length > 11 ||
    input.messages.length % 2 !== 1
  )
    return null;
  const messages: ChatTurn[] = [];
  for (const [index, raw] of input.messages.entries()) {
    const turn = object(raw);
    const role = index % 2 === 0 ? "user" : "assistant";
    if (
      !turn ||
      turn.role !== role ||
      typeof turn.content !== "string" ||
      !turn.content.trim() ||
      turn.content.length > 1200
    )
      return null;
    messages.push({ role, content: turn.content.trim() });
  }
  if (messages.reduce((total, turn) => total + turn.content.length, 0) > 9000)
    return null;
  return { locale: input.locale, messages };
}

export function parseChatGuidance(value: unknown): ChatGuidance | null {
  const result = object(value);
  if (
    !result ||
    typeof result.reply !== "string" ||
    !result.reply.trim() ||
    result.reply.length > 900 ||
    typeof result.summary !== "string" ||
    result.summary.length > 500 ||
    typeof result.ready !== "boolean" ||
    (result.ready && result.summary.trim().length < 10)
  )
    return null;
  return {
    reply: result.reply.trim(),
    summary: result.summary.trim(),
    ready: result.ready,
  };
}
