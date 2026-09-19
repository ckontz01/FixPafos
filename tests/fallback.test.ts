import test from "node:test";
import assert from "node:assert/strict";
import type { Issue } from "../src/lib/issues";

/**
 * The fallback exists so a demonstration survives a provider outage. These
 * tests pin the two properties that make it safe: it is off unless explicitly
 * enabled, and it never claims to be the model.
 */

const issueFor = (message: string, over: Partial<Issue> = {}): Issue => ({
  id: "f-1",
  author: "Resident",
  message,
  location: { longitude: 32.42, latitude: 34.77, label: "Pafos" },
  category: "other",
  reportedCategory: "unsure",
  assignment: {
    departmentId: "review",
    confidence: "low",
    source: "manual_review",
    category: "other",
  },
  createdAt: Date.now(),
  seconds: 0,
  replies: [],
  ...over,
});

/** The module reads DEMO_MODE at import, so each case imports it freshly. */
async function loadWithDemoMode(enabled: boolean) {
  const before = process.env.DEMO_MODE;
  if (enabled) process.env.DEMO_MODE = "true";
  else delete process.env.DEMO_MODE;
  const loaded = await import(
    `../src/lib/fallback-classifier?demo=${enabled}-${Math.random()}`
  );
  if (before) process.env.DEMO_MODE = before;
  else if (!enabled) delete process.env.DEMO_MODE;
  return loaded as typeof import("../src/lib/fallback-classifier");
}

test("production fails closed: without demonstration mode there is no fallback", async () => {
  const { fallbackClassify } = await loadWithDemoMode(false);
  assert.equal(
    fallbackClassify(issueFor("Huge pothole on the road")),
    null,
    "an unavailable model must not silently degrade in production",
  );
});

test("a fallback result never presents itself as a model decision", async () => {
  const { fallbackClassify } = await loadWithDemoMode(true);
  const result = fallbackClassify(issueFor("Huge pothole on the road"))!;
  assert.ok(result);
  assert.equal(result.assignment.source, "fallback");
  assert.equal(result.severity.source, "fallback");
  // A keyword match is a guess, so it is never high confidence and always
  // marked for a person to check.
  assert.notEqual(result.assignment.confidence, "high");
  assert.equal(result.severity.confidence, "low");
  assert.equal(result.severity.needsReview, true);
  assert.match(result.severity.rationale, /fallback/i);
});

test("keywords route across Greek, Greeklish, English and Russian", async () => {
  const { fallbackClassify } = await loadWithDemoMode(true);
  const cases: [string, string][] = [
    ["Μεγάλη λακκούβα στον δρόμο", "roads"],
    ["Megali lakkouva ston dromo", "roads"],
    ["Huge pothole in the road", "roads"],
    ["Большая яма на дороге", "roads"],
    ["Δεν μαζεύτηκαν τα σκουπίδια", "waste"],
    ["Переполненные мусорные баки", "waste"],
    ["The street light is broken", "lighting"],
    ["Σπασμένος σωλήνας νερού", "water"],
    ["Βουλωμένη αποχέτευση", "sewage"],
    ["Παράνομη στάθμευση", "traffic"],
  ];
  for (const [message, expected] of cases) {
    const result = fallbackClassify(issueFor(message))!;
    assert.equal(
      result.assignment.category,
      expected,
      `${message} -> expected ${expected}, got ${result.assignment.category}`,
    );
  }
});

test("unrecognised text goes to human review rather than being guessed", async () => {
  const { fallbackClassify } = await loadWithDemoMode(true);
  const result = fallbackClassify(issueFor("Something is wrong somewhere"))!;
  assert.equal(result.assignment.departmentId, "review");
  assert.equal(result.assignment.confidence, "low");
});

test("stated danger raises the fallback severity", async () => {
  const { fallbackClassify } = await loadWithDemoMode(true);
  const fire = fallbackClassify(issueFor("Φωτιά στον κάδο απορριμμάτων"))!;
  assert.equal(fire.severity.level, "critical");
  assert.ok(fire.severity.factors.includes("danger"));

  const ordinary = fallbackClassify(issueFor("Δεν μαζεύτηκαν τα σκουπίδια"))!;
  assert.equal(ordinary.severity.level, "medium");
});

test("a reporter's own category is used only when keywords find nothing", async () => {
  const { fallbackClassify } = await loadWithDemoMode(true);
  // Keywords win over a contradicting hint.
  const contradicted = fallbackClassify(
    issueFor("The street light is broken", { reportedCategory: "water" }),
  )!;
  assert.equal(contradicted.assignment.category, "lighting");

  // With no keyword signal, the hint is a reasonable last resort.
  const hinted = fallbackClassify(
    issueFor("It is not working again", { reportedCategory: "parks" }),
  )!;
  assert.equal(hinted.assignment.category, "parks");
  assert.equal(
    hinted.assignment.departmentId,
    "review",
    "a hint alone is not enough to route to a department",
  );
});
