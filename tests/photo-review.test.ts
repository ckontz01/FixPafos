import test from "node:test";
import assert from "node:assert/strict";
import { parsePhotoReview, reviewPhoto } from "../src/lib/photo-review";
import { getDeepSeekClient } from "../src/lib/deepseek";

const clear = { category: "relevant", confidence: "high", safe: true, containsPersonalInformation: false, reason: "Visible road damage matches the report." };
test("photo publication requires every relevance, safety and confidence gate", () => {
  assert.equal(parsePhotoReview(clear)?.autoApproved, true);
  for (const change of [
    { category: "uncertain" }, { category: "irrelevant" },
    { category: "inappropriate" }, { category: "privacy" },
    { confidence: "medium" }, { confidence: "low" },
    { safe: false }, { containsPersonalInformation: true },
  ]) assert.equal(parsePhotoReview({ ...clear, ...change })?.autoApproved, false);
  for (const input of [null, {}, { ...clear, safe: "true" }, { ...clear, reason: "" },
    { ...clear, containsPersonalInformation: undefined }, { ...clear, category: "approved" },
    { ...clear, reason: "x".repeat(401) }]) assert.equal(parsePhotoReview(input), null);
});

test("vision receives actual image bytes; failures and incomplete decisions stay private", async () => {
  const key = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test-key";
  const client = getDeepSeekClient()!, original = client.messages.create;
  const issue = { message: "Road damage", location: { label: "Pafos", latitude: 34.77, longitude: 32.42 } };
  const bytes = Buffer.from("test-image-pixels");
  let response: unknown = { stop_reason: "tool_use", content: [{ type: "tool_use", name: "review_photo", input: clear }] };
  client.messages.create = (async (params: { messages: { content: unknown[] }[] }) => {
    assert.deepEqual(params.messages[0].content[1], { type: "image", source: { type: "base64", media_type: "image/jpeg", data: bytes.toString("base64") } });
    return response;
  }) as unknown as typeof original;
  try {
    assert.equal((await reviewPhoto(bytes, issue)).autoApproved, true);
    for (const invalid of [
      { stop_reason: "max_tokens", content: [{ type: "tool_use", name: "review_photo", input: clear }] },
      { stop_reason: "end_turn", content: [] },
      { stop_reason: "tool_use", content: [{ type: "tool_use", name: "review_photo", input: {} }] },
      { stop_reason: "tool_use", content: [1, 2].map(() => ({ type: "tool_use", name: "review_photo", input: clear })) },
    ]) {
      response = invalid;
      assert.equal((await reviewPhoto(bytes, issue)).category, "unavailable");
    }
    client.messages.create = (async () => { throw new Error("Timeout"); }) as unknown as typeof original;
    assert.equal((await reviewPhoto(bytes, issue)).autoApproved, false);
    delete process.env.DEEPSEEK_API_KEY;
    assert.equal((await reviewPhoto(bytes, issue)).category, "unavailable");
  } finally {
    client.messages.create = original;
    if (key) process.env.DEEPSEEK_API_KEY = key;
    else delete process.env.DEEPSEEK_API_KEY;
  }
});
