import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

test("offline shell does not intercept moderation, insights or API requests", async () => {
  const handlers: Record<string, (event: unknown) => void> = {};
  const writes: string[] = [];
  runInNewContext(readFileSync("public/sw.js", "utf8"), {
    self: { location: { origin: "https://pafoslive.vercel.app" }, addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler; } },
    URL, Response,
    fetch: async () => new Response("shell"),
    caches: { open: async () => ({ put: async (path: string) => { writes.push(path); } }) },
  });
  for (const path of ["/moderation", "/insights", "/api/issues", "/api/photos/id"]) {
    handlers.fetch({ request: { method: "GET", mode: "navigate", url: `https://pafoslive.vercel.app${path}` }, respondWith: () => assert.fail(`Unexpected cache interception: ${path}`) });
  }
  let response: Promise<Response> | undefined;
  handlers.fetch({ request: { method: "GET", mode: "navigate", url: "https://pafoslive.vercel.app/?lang=en" }, respondWith: (value: Promise<Response>) => { response = value; } });
  assert.equal(await (await response)?.text(), "shell");
  assert.deepEqual(writes, ["/"]);
});
