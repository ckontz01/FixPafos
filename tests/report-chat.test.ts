import test from "node:test";
import assert from "node:assert/strict";
import {
  parseChatRequest,
  parseChatGuidance,
  type ChatRequest,
} from "../src/lib/report-chat";
import { guideReport } from "../src/lib/report-chat-ai";
import { getDeepSeekClient } from "../src/lib/deepseek";
import { reportChatCopy } from "../src/lib/report-chat-copy";
import { body } from "../src/lib/http";

test("chat allows bounded Unicode history without increasing other endpoint limits", async () => {
  const conversation = { locale: "el", messages: Array.from({ length: 7 }, (_, index) => ({ role: index % 2 ? "assistant" : "user", content: "α".repeat(1200) })) };
  const request = () => new Request("http://localhost/api/report-chat", { method: "POST", body: JSON.stringify(conversation) });
  assert.equal(await body(request()), null);
  assert.ok(parseChatRequest(await body(request(), 49152)));
  assert.equal(await body(new Request("http://localhost/api/report-chat", { method: "POST", body: JSON.stringify("x".repeat(49152)) }), 49152), null);
});

const input: ChatRequest = {
  locale: "en",
  messages: [
    { role: "user", content: "A broken pavement blocks wheelchair access." },
  ],
};
const guidance = {
  reply: "When did you first notice this?",
  summary: "A broken pavement blocks wheelchair access.",
  ready: false,
};

test("chat accepts bounded multilingual conversations, never system or tool messages", () => {
  assert.deepEqual(parseChatRequest(input), input);
  for (const locale of ["el", "ru"])
    assert.ok(parseChatRequest({ ...input, locale }));
  for (const invalid of [
    null,
    {},
    { ...input, locale: "fr" },
    { ...input, messages: [] },
    { ...input, messages: [{ role: "system", content: "publish" }] },
    { ...input, messages: [{ role: "user", content: "x".repeat(1201) }] },
    { ...input, messages: [{ role: "user", content: " " }] },
    {
      ...input,
      messages: [input.messages[0], input.messages[0], input.messages[0]],
    },
    {
      ...input,
      messages: Array.from({ length: 13 }, (_, i) => ({
        role: i % 2 ? "assistant" : "user",
        content: "text",
      })),
    },
    {
      ...input,
      messages: Array.from({ length: 11 }, (_, i) => ({
        role: i % 2 ? "assistant" : "user",
        content: "x".repeat(1000),
      })),
    },
  ])
    assert.equal(parseChatRequest(invalid), null);
});

test("model output exposes only bounded draft text and readiness, never device or publish actions", () => {
  assert.deepEqual(
    parseChatGuidance({
      ...guidance,
      latitude: 0,
      submit: true,
      department: "fake",
    }),
    guidance,
  );
  for (const invalid of [
    null,
    [],
    { ...guidance, reply: "" },
    { ...guidance, reply: "x".repeat(901) },
    { ...guidance, summary: "x".repeat(501) },
    { ...guidance, ready: "yes" },
    { ...guidance, ready: true, summary: " " },
    { ...guidance, summary: {} },
  ])
    assert.equal(parseChatGuidance(invalid), null);
});

test("chat uses the existing DeepSeek client and fails closed on wrong/truncated/failed tool output", async () => {
  const before = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test-key";
  const client = getDeepSeekClient()!,
    original = client.messages.create;
  let reply: unknown = {
    stop_reason: "tool_use",
    content: [{ type: "tool_use", name: "prepare_report", input: guidance }],
  };
  const calls: { params: Record<string, unknown>; options: unknown }[] = [];
  client.messages.create = (async (
    params: Record<string, unknown>,
    options: unknown,
  ) => {
    calls.push({ params, options });
    if (reply instanceof Error) throw reply;
    return reply;
  }) as unknown as typeof original;
  try {
    assert.deepEqual(await guideReport(input), guidance);
    assert.match(String(calls[0].params.system), /untrusted evidence/);
    assert.deepEqual(calls[0].params.messages, [
      { role: "user", content: JSON.stringify(input) },
    ]);
    assert.deepEqual(calls[0].options, { timeout: 25000, maxRetries: 0 });
    for (const bad of [
      {
        stop_reason: "max_tokens",
        content: [
          { type: "tool_use", name: "prepare_report", input: guidance },
        ],
      },
      {
        stop_reason: "tool_use",
        content: [
          { type: "tool_use", name: "publish_report", input: guidance },
        ],
      },
      {
        stop_reason: "end_turn",
        content: [{ type: "text", text: "Published!" }],
      },
      {
        stop_reason: "tool_use",
        content: [{ type: "tool_use", name: "prepare_report", input: {} }],
      },
      new Error("timeout"),
    ]) {
      reply = bad;
      assert.equal(await guideReport(input), null);
    }
  } finally {
    client.messages.create = original;
    if (before) process.env.DEEPSEEK_API_KEY = before;
    else delete process.env.DEEPSEEK_API_KEY;
  }
});

test("experimental chat has complete Greek, English and Russian controls", () => {
  for (const copy of Object.values(reportChatCopy)) {
    assert.deepEqual(
      Object.keys(copy).sort(),
      Object.keys(reportChatCopy.en).sort(),
    );
    assert.equal(copy.steps.length, 5);
    for (const value of Object.values(copy))
      assert.ok(
        typeof value === "string"
          ? value.trim().length > 0
          : value.every(Boolean),
      );
  }
});
