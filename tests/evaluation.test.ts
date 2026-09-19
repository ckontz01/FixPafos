import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  score,
  classMetrics,
  confusionMatrix,
  DEPARTMENTS,
  type EvalCase,
  type EvalResult,
} from "../scripts/evaluation-metrics";

/**
 * The evaluation exists to make claims about the AI checkable. A metric that is
 * itself wrong would invalidate every one of those claims, so the arithmetic is
 * tested against hand-computed values on cases small enough to verify by eye.
 */

type Case = EvalCase;

const caseFor = (over: Partial<Case> & { id: string }): Case => ({
  message: "x",
  language: "en",
  tags: [],
  location: { label: "Pafos", longitude: 32.42, latitude: 34.77 },
  expected: { category: "roads", departmentId: "technical", severity: "medium" },
  ...over,
});

const resultFor = (
  id: string,
  expected: Case["expected"],
  actual: {
    departmentId: string;
    category: string;
    confidence: string;
    severity: string;
  } | null,
  extra: Partial<Case> = {},
): EvalResult => ({
  case: caseFor({ id, expected, ...extra }),
  classification: actual
    ? {
        assignment: {
          departmentId: actual.departmentId,
          category: actual.category,
          confidence: actual.confidence,
          source: "deepseek",
        },
        severity: { level: actual.severity, confidence: "high" },
      }
    : null,
  error: actual ? null : "provider failed",
});

test("precision, recall and F1 match hand-computed values", () => {
  // technical: tp=2, fp=1, fn=1  -> P=2/3, R=2/3, F1=2/3
  const pairs = [
    { expected: "technical", actual: "technical" },
    { expected: "technical", actual: "technical" },
    { expected: "technical", actual: "cleaning" },
    { expected: "green", actual: "technical" },
  ];
  const { rows } = classMetrics(pairs, DEPARTMENTS);
  const technical = rows.find((r) => r.cls === "technical")!;
  assert.equal(technical.tp, 2);
  assert.equal(technical.fp, 1);
  assert.equal(technical.fn, 1);
  assert.equal(technical.precision, 2 / 3);
  assert.equal(technical.recall, 2 / 3);
  assert.equal(technical.f1, 2 / 3);
});

test("macro F1 ignores classes that never appear in the labels", () => {
  const pairs = [
    { expected: "technical", actual: "technical" },
    { expected: "green", actual: "green" },
  ];
  const { rows, macroF1 } = classMetrics(pairs, DEPARTMENTS);
  // Six departments have no support here and must not count as zero.
  assert.equal(rows.filter((r) => r.support > 0).length, 2);
  assert.equal(macroF1, 1);
});

test("the confusion matrix counts expected against predicted", () => {
  const matrix = confusionMatrix(
    [
      { expected: "technical", actual: "cleaning" },
      { expected: "technical", actual: "cleaning" },
      { expected: "technical", actual: "technical" },
    ],
    DEPARTMENTS,
  );
  assert.equal(matrix.technical.cleaning, 2);
  assert.equal(matrix.technical.technical, 1);
  assert.equal(matrix.cleaning.technical, 0);
});

test("severity is scored both exactly and within one level", () => {
  const report = score({
    name: "t",
    label: "t",
    model: "m",
    results: [
      // exact
      resultFor(
        "a",
        { category: "roads", departmentId: "technical", severity: "high" },
        { departmentId: "technical", category: "roads", confidence: "high", severity: "high" },
      ),
      // one level off: counts for within-one, not exact
      resultFor(
        "b",
        { category: "roads", departmentId: "technical", severity: "high" },
        { departmentId: "technical", category: "roads", confidence: "high", severity: "medium" },
      ),
      // two levels off: counts for neither
      resultFor(
        "c",
        { category: "roads", departmentId: "technical", severity: "critical" },
        { departmentId: "technical", category: "roads", confidence: "high", severity: "medium" },
      ),
    ],
  });
  assert.equal(report.severity.exactAccuracy, 1 / 3);
  assert.equal(report.severity.withinOneAccuracy, 2 / 3);
  // The critical case was under-called, which is tracked separately.
  assert.equal(report.severity.criticalCases, 1);
  assert.equal(report.severity.criticalUnderCalls, 1);
});

test("over-calling severity is not counted as a critical under-call", () => {
  const report = score({
    name: "t",
    label: "t",
    model: "m",
    results: [
      resultFor(
        "a",
        { category: "roads", departmentId: "technical", severity: "low" },
        { departmentId: "technical", category: "roads", confidence: "high", severity: "critical" },
      ),
    ],
  });
  assert.equal(report.severity.criticalUnderCalls, 0);
});

test("escalation recall and missed escalations are reported separately", () => {
  const report = score({
    name: "t",
    label: "t",
    model: "m",
    results: [
      // Should escalate, did.
      resultFor(
        "a",
        { category: "other", departmentId: "review", severity: "low" },
        { departmentId: "review", category: "other", confidence: "low", severity: "low" },
      ),
      // Should escalate, did not: the dangerous failure.
      resultFor(
        "b",
        { category: "other", departmentId: "review", severity: "low" },
        { departmentId: "technical", category: "roads", confidence: "high", severity: "low" },
      ),
      // Should not escalate, did: costs a person's time but is safe.
      resultFor(
        "c",
        { category: "roads", departmentId: "technical", severity: "low" },
        { departmentId: "review", category: "roads", confidence: "low", severity: "low" },
      ),
    ],
  });
  assert.equal(report.humanReview.shouldEscalate, 2);
  assert.equal(report.humanReview.didEscalate, 2);
  assert.equal(report.humanReview.recall, 1 / 2);
  assert.equal(report.humanReview.precision, 1 / 2);
  assert.equal(report.humanReview.missedEscalations, 1);
  assert.deepEqual(report.humanReview.missedIds, ["b"]);
});

test("calibration groups the error rate by the model's stated confidence", () => {
  const report = score({
    name: "t",
    label: "t",
    model: "m",
    results: [
      resultFor(
        "a",
        { category: "roads", departmentId: "technical", severity: "low" },
        { departmentId: "technical", category: "roads", confidence: "high", severity: "low" },
      ),
      resultFor(
        "b",
        { category: "roads", departmentId: "technical", severity: "low" },
        { departmentId: "cleaning", category: "roads", confidence: "low", severity: "low" },
      ),
      resultFor(
        "c",
        { category: "roads", departmentId: "technical", severity: "low" },
        { departmentId: "cleaning", category: "roads", confidence: "low", severity: "low" },
      ),
    ],
  });
  assert.equal(report.calibration.high.errorRate, 0);
  assert.equal(report.calibration.low.errorRate, 1);
  assert.equal(report.calibration.medium.count, 0);
  assert.equal(report.calibration.medium.errorRate, null);
});

test("responses rejected by validation are counted, not silently scored", () => {
  const report = score({
    name: "t",
    label: "t",
    model: "m",
    results: [
      resultFor(
        "a",
        { category: "roads", departmentId: "technical", severity: "low" },
        { departmentId: "technical", category: "roads", confidence: "high", severity: "low" },
      ),
      resultFor(
        "b",
        { category: "roads", departmentId: "technical", severity: "low" },
        null,
      ),
    ],
  });
  assert.equal(report.cases, 2);
  assert.equal(report.unusableResponses, 1);
  // Accuracy is over usable responses; the failure is reported, not averaged in.
  assert.equal(report.department.accuracy, 1);
  assert.equal(report.errors.length, 1);
});

test("an empty run reports null rather than a misleading zero or one", () => {
  const report = score({ name: "t", label: "t", model: "m", results: [] });
  assert.equal(report.department.accuracy, null);
  assert.equal(report.severity.exactAccuracy, null);
  assert.equal(report.humanReview.recall, null);
});

test("accuracy is broken down by language and by difficulty tag", () => {
  const report = score({
    name: "t",
    label: "t",
    model: "m",
    results: [
      resultFor(
        "a",
        { category: "roads", departmentId: "technical", severity: "low" },
        { departmentId: "technical", category: "roads", confidence: "high", severity: "low" },
        { language: "el", tags: ["clear"] },
      ),
      resultFor(
        "b",
        { category: "roads", departmentId: "technical", severity: "low" },
        { departmentId: "cleaning", category: "roads", confidence: "high", severity: "low" },
        { language: "ru", tags: ["injection"] },
      ),
    ],
  });
  assert.equal(report.byLanguage.el.departmentAccuracy, 1);
  assert.equal(report.byLanguage.ru.departmentAccuracy, 0);
  assert.equal(report.byTag.clear.departmentAccuracy, 1);
  assert.equal(report.byTag.injection.departmentAccuracy, 0);
});

// ------------------------------------------------------------------ dataset
test("the labelled dataset is well formed and covers the hard cases", () => {
  const lines = readFileSync("evaluation/dataset.jsonl", "utf8").trim().split("\n");
  const cases = lines.map((line, i) => {
    try {
      return JSON.parse(line) as Case;
    } catch (error) {
      throw new Error(`line ${i + 1} is not valid JSON: ${(error as Error).message}`);
    }
  });

  assert.ok(cases.length >= 100, "at least 100 labelled cases");
  assert.equal(
    new Set(cases.map((c) => c.id)).size,
    cases.length,
    "case ids must be unique",
  );

  const CATEGORIES = [
    "roads", "sewage", "water", "waste", "lighting", "parks", "traffic", "other",
  ];
  const SEVERITIES = ["low", "medium", "high", "critical"];
  for (const c of cases) {
    assert.ok(CATEGORIES.includes(c.expected.category), `${c.id}: bad category`);
    assert.ok(DEPARTMENTS.includes(c.expected.departmentId), `${c.id}: bad department`);
    assert.ok(SEVERITIES.includes(c.expected.severity), `${c.id}: bad severity`);
    assert.ok(c.message.trim().length > 0, `${c.id}: empty message`);
    assert.ok(
      Number.isFinite(c.location.longitude) && Number.isFinite(c.location.latitude),
      `${c.id}: bad location`,
    );
  }

  // The set must actually contain the inputs that break naive classifiers,
  // otherwise a high score would mean very little.
  const tags = new Set(cases.flatMap((c) => c.tags ?? []));
  for (const required of [
    "vague",
    "wrong-hint",
    "private-property",
    "boundary",
    "emergency",
    "injection",
    "adversarial",
    "multi-issue",
  ])
    assert.ok(tags.has(required), `dataset is missing ${required} cases`);

  const languages = new Set(cases.map((c) => c.language));
  for (const required of ["el", "greeklish", "en", "ru", "mixed"])
    assert.ok(languages.has(required), `dataset is missing ${required} cases`);

  // Escalation cases must be a meaningful share, or escalation recall is noise.
  const escalations = cases.filter((c) => c.expected.departmentId === "review");
  assert.ok(
    escalations.length >= 15,
    `expected at least 15 escalation cases, found ${escalations.length}`,
  );
});
