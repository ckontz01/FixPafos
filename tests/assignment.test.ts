import test from "node:test";
import assert from "node:assert/strict";
import { assignIssue } from "../src/lib/assignment";
import { parseIssue } from "../src/lib/validation";
import { getDeepSeekClient } from "../src/lib/deepseek";
test("DeepSeek receives no category hint for unsure reports, including moderator releases", async () => {
  const before = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test-key";
  const client = getDeepSeekClient()!,
    original = client.messages.create;
  const sent: unknown[] = [];
  client.messages.create = (async (params: {
    messages: { content: string }[];
  }) => {
    sent.push(JSON.parse(params.messages[0].content).category);
    return {
      content: [
        {
          type: "tool_use",
          name: "assign_department",
          input: {
            category: "lighting",
            departmentId: "technical",
            confidence: "high",
          },
        },
      ],
    };
  }) as unknown as typeof original;
  try {
    const issue = parseIssue({
      author: "Resident",
      message: "The street lamp is broken.",
      category: "unsure",
      location: { label: "Pafos", longitude: 32.42, latitude: 34.77 },
    })!;
    assert.equal((await assignIssue(issue))?.category, "lighting");
    assert.equal(
      (await assignIssue(JSON.parse(JSON.stringify(issue))))?.source,
      "deepseek",
    );
    await assignIssue({
      ...issue,
      reportedCategory: "roads",
      category: "other",
    });
    assert.deepEqual(sent, [null, null, "roads"]);
    client.messages.create = (async () => {
      throw new Error("Provider unavailable");
    }) as unknown as typeof original;
    assert.equal(await assignIssue(issue), null);
  } finally {
    client.messages.create = original;
    if (before) process.env.DEEPSEEK_API_KEY = before;
    else delete process.env.DEEPSEEK_API_KEY;
  }
});
