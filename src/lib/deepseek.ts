import Anthropic from "@anthropic-ai/sdk";

export const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";

const DEEPSEEK_BASE_URL =
  process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/anthropic";

let deepSeekClient: Anthropic | null = null;

export function getDeepSeekClient() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;

  deepSeekClient ??= new Anthropic({
    apiKey,
    baseURL: DEEPSEEK_BASE_URL,
  });

  return deepSeekClient;
}
