import { db } from "@/lib/db";
import { json } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await db()`SELECT 1 FROM pafos_issues LIMIT 1`;
    const ready = Boolean(
      process.env.DEEPSEEK_API_KEY && process.env.FEEDBACK_ADMIN_PASSWORD,
    );
    return json(
      {
        app: "FixPafos",
        database: "ready",
        configuration: ready ? "ready" : "incomplete",
      },
      ready ? 200 : 503,
    );
  } catch {
    return json({ app: "FixPafos", database: "unavailable" }, 503);
  }
}
