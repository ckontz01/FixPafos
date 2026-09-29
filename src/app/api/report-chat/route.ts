import { body, fail, handle, json, limited } from "@/lib/http";
import { parseChatRequest } from "@/lib/report-chat";
import { guideReport } from "@/lib/report-chat-ai";

export const runtime = "nodejs";
export const maxDuration = 35;

export async function POST(request: Request) {
  return handle(request, async () => {
    const input = parseChatRequest(await body(request, 49152));
    if (!input) return fail("error.invalidReport", 400);
    if (
      (await limited(request, "report-chat", 20)) ||
      (await limited(request, "report-chat-hour", 120, 3600000))
    )
      return fail("error.rateLimited", 429);
    const guidance = await guideReport(input);
    if (!guidance) return fail("error.unavailable", 503);
    return json(guidance);
  });
}
