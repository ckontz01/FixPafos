import test from "node:test";
import assert from "node:assert/strict";
import { parseIssue, parseReply } from "../src/lib/validation";
import { parseAssignment } from "../src/lib/assignment";
import { containsBlockedProfanity } from "../src/lib/feedback-profanity";
const input = {
  author: "Resident",
  message: "The pavement is broken.",
  category: "roads",
  location: {
    label: "Pafos town centre",
    longitude: 32.4245,
    latitude: 34.772,
  },
};
test("reports require Pafos coordinates and valid categories", () => {
  assert.ok(parseIssue(input));
  assert.equal(parseIssue({ ...input, location: undefined }), null);
  assert.equal(
    parseIssue({
      ...input,
      location: { ...input.location, longitude: 33.36, latitude: 35.17 },
    }),
    null,
  );
  assert.equal(
    parseIssue({ ...input, location: { ...input.location, longitude: NaN } }),
    null,
  );
  assert.equal(parseIssue({ ...input, category: "flood" }), null);
  assert.equal(parseIssue({ ...input, category: "toString" }), null);
});
test("client cannot assign its own department, votes, timestamp or identifier", () => {
  const result = parseIssue({
    ...input,
    id: "fake-identifier",
    seconds: 9000,
    createdAt: 0,
    assignment: { departmentId: "police" },
  });
  assert.notEqual(result?.id, "fake-identifier");
  assert.equal(result?.seconds, 0);
  assert.equal(result?.assignment.departmentId, "review");
  assert.ok(result!.createdAt > 0);
});
test("length and blank field limits", () => {
  assert.equal(parseIssue({ ...input, message: " " }), null);
  assert.equal(parseIssue({ ...input, author: "a".repeat(41) }), null);
  assert.equal(
    parseReply({ author: "Resident", message: "x".repeat(501) }),
    null,
  );
  assert.ok(
    parseReply({
      author: "Κάτοικος",
      message: "Το πεζοδρόμιο χρειάζεται επισκευή.",
    }),
  );
});
test("unsure submissions preserve no-hint provenance and cannot spoof a classification", () => {
  const issue = parseIssue({
    ...input,
    category: "unsure",
    reportedCategory: "roads",
    assignment: { source: "deepseek", category: "roads" },
  });
  assert.equal(issue?.reportedCategory, "unsure");
  assert.equal(issue?.category, "other");
  assert.equal(issue?.assignment.source, "manual_review");
  assert.equal(
    parseIssue({ ...input, reportedCategory: "unsure" })?.reportedCategory,
    "roads",
  );
  assert.equal(
    parseAssignment({
      category: "unsure",
      departmentId: "review",
      confidence: "low",
    }),
    null,
  );
});
test("routing only accepts the department directory and sends low confidence to human review", () => {
  assert.equal(
    parseAssignment({
      departmentId: "invented",
      category: "roads",
      confidence: "high",
    }),
    null,
  );
  assert.equal(
    parseAssignment({
      departmentId: "technical",
      category: "uhi",
      confidence: "high",
    }),
    null,
  );
  assert.equal(
    parseAssignment({
      departmentId: "technical",
      category: "roads",
      confidence: "low",
    })?.departmentId,
    "review",
  );
  assert.equal(
    parseAssignment({
      departmentId: "sewerage",
      category: "sewage",
      confidence: "high",
    })?.departmentId,
    "sewerage",
  );
});
test("original profanity filtering preserves Unicode normalization and civil criticism", () => {
  assert.equal(containsBlockedProfanity(["This fucking pothole"]), true);
  assert.equal(containsBlockedProfanity(["f\u200buck"]), true);
  assert.equal(
    containsBlockedProfanity([
      "The municipality has failed to repair this road.",
    ]),
    false,
  );
});
