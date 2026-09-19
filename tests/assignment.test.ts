import test from "node:test";
import assert from "node:assert/strict";
import {
  assignIssue,
  classifyIssue,
  parseSeverity,
  parseClassification,
} from "../src/lib/assignment";
import { parseIssue } from "../src/lib/validation";
import { getDeepSeekClient } from "../src/lib/deepseek";
import { SEVERITY_SLA_HOURS } from "../src/lib/issues";

const VALID = {
  category: "lighting",
  departmentId: "technical",
  confidence: "high",
  severity: "medium",
  severityConfidence: "high",
  severityFactors: ["infrastructure"],
  severityRationale: "A single street light is out.",
};

/** Run `body` with a stubbed model client, restoring the real one afterwards. */
async function withStubbedModel(
  reply: unknown,
  body: (sent: unknown[]) => Promise<void>,
) {
  const before = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test-key";
  const client = getDeepSeekClient()!;
  const original = client.messages.create;
  const sent: unknown[] = [];
  client.messages.create = (async (params: {
    messages: { content: string }[];
  }) => {
    sent.push(JSON.parse(params.messages[0].content).category);
    if (reply instanceof Error) throw reply;
    return reply;
  }) as unknown as typeof original;
  try {
    await body(sent);
  } finally {
    client.messages.create = original;
    if (before) process.env.DEEPSEEK_API_KEY = before;
    else delete process.env.DEEPSEEK_API_KEY;
  }
}

const issueFor = (category: string) =>
  parseIssue({
    author: "Resident",
    message: "The street lamp is broken.",
    category,
    location: { label: "Pafos", longitude: 32.42, latitude: 34.77 },
  })!;

test("the model receives no category hint for unsure reports, including moderator releases", async () => {
  await withStubbedModel(
    { content: [{ type: "tool_use", name: "classify_issue", input: VALID }] },
    async (sent) => {
      const issue = issueFor("unsure");
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
    },
  );
});

test("classification fails closed when the provider is unavailable", async () => {
  await withStubbedModel(new Error("Provider unavailable"), async () => {
    assert.equal(await assignIssue(issueFor("unsure")), null);
    assert.equal(await classifyIssue(issueFor("unsure")), null);
  });
});

test("severity arrives with the routing and carries a deterministic response window", async () => {
  await withStubbedModel(
    {
      content: [
        {
          type: "tool_use",
          name: "classify_issue",
          input: { ...VALID, severity: "critical", severityFactors: ["danger"] },
        },
      ],
    },
    async () => {
      const result = await classifyIssue(issueFor("roads"));
      assert.equal(result?.severity.level, "critical");
      assert.deepEqual(result?.severity.factors, ["danger"]);
      assert.equal(result?.severity.source, "deepseek");
      // The window is policy, not a model output, so it cannot be invented.
      assert.equal(result?.severity.slaHours, SEVERITY_SLA_HOURS.critical);
      assert.equal(result?.severity.needsReview, false);
    },
  );
});

test("a severity estimate without a recognised factor is not explainable, so it is rejected", () => {
  assert.equal(parseSeverity({ ...VALID, severityFactors: [] }), null);
  assert.equal(parseSeverity({ ...VALID, severityFactors: ["invented"] }), null);
  assert.ok(parseSeverity({ ...VALID, severityFactors: ["danger", "traffic"] }));
});

test("malformed severity output is rejected rather than published", () => {
  assert.equal(parseSeverity({ ...VALID, severity: "catastrophic" }), null);
  assert.equal(parseSeverity({ ...VALID, severityConfidence: "certain" }), null);
  assert.equal(parseSeverity({ ...VALID, severityRationale: "" }), null);
  assert.equal(parseSeverity({ ...VALID, severityRationale: "x".repeat(301) }), null);
  assert.equal(parseSeverity(null), null);
  // A whole classification is rejected if either half is unusable.
  assert.equal(parseClassification({ ...VALID, severity: "nope" }), null);
  assert.equal(parseClassification({ ...VALID, departmentId: "invented" }), null);
});

test("low confidence anywhere routes the report to human review", () => {
  const lowSeverity = parseSeverity({ ...VALID, severityConfidence: "low" });
  assert.equal(lowSeverity?.needsReview, true);
  // Low routing confidence also marks the severity for review, because the
  // report itself is the thing that was unclear.
  const lowRouting = parseSeverity(VALID, "low");
  assert.equal(lowRouting?.needsReview, true);
  assert.equal(parseSeverity(VALID, "high")?.needsReview, false);

  const classified = parseClassification({ ...VALID, confidence: "low" });
  assert.equal(classified?.assignment.departmentId, "review");
  assert.equal(classified?.severity.needsReview, true);
});

test("duplicate factors are collapsed and unknown ones dropped", () => {
  const parsed = parseSeverity({
    ...VALID,
    severityFactors: ["danger", "danger", "nonsense", "traffic"],
  });
  assert.deepEqual(parsed?.factors, ["danger", "traffic"]);
});
