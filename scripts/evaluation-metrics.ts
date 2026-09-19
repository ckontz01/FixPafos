/**
 * Pure scoring functions for the evaluation runner.
 *
 * Separated from scripts/evaluate.mjs so the arithmetic can be unit-tested
 * without calling a model: a metric that is itself wrong would invalidate every
 * claim made from it.
 */

export type EvalCase = {
  id: string;
  message: string;
  language: string;
  reportedCategory?: string;
  location: { label: string; longitude: number; latitude: number };
  tags?: string[];
  expected: { category: string; departmentId: string; severity: string };
  notes?: string;
};

export type EvalResult = {
  case: EvalCase;
  classification: {
    assignment: {
      departmentId: string;
      category: string;
      confidence: string;
      source: string;
    };
    severity: { level: string; confidence: string };
  } | null;
  error?: string | null;
};

type Pair = { expected: string; actual: string };

export const DEPARTMENTS = [
  "technical",
  "sewerage",
  "water",
  "cleaning",
  "green",
  "traffic",
  "health",
  "review",
];

export const CATEGORIES = [
  "roads",
  "sewage",
  "water",
  "waste",
  "lighting",
  "parks",
  "traffic",
  "other",
];

export const SEVERITY_ORDER = ["low", "medium", "high", "critical"];

/** Per-class precision, recall and F1 from a list of {expected, actual}. */
export function classMetrics(pairs: Pair[], classes: readonly string[]) {
  const rows = classes.map((cls) => {
    const tp = pairs.filter((p) => p.expected === cls && p.actual === cls).length;
    const fp = pairs.filter((p) => p.expected !== cls && p.actual === cls).length;
    const fn = pairs.filter((p) => p.expected === cls && p.actual !== cls).length;
    const precision = tp + fp ? tp / (tp + fp) : null;
    const recall = tp + fn ? tp / (tp + fn) : null;
    const f1 =
      precision !== null && recall !== null && precision + recall > 0
        ? (2 * precision * recall) / (precision + recall)
        : null;
    return { cls, support: tp + fn, tp, fp, fn, precision, recall, f1 };
  });
  // Macro F1 averages only classes that actually occur in the labels, so an
  // unused department cannot drag the figure down or prop it up.
  const scored = rows.filter(
    (r): r is typeof r & { f1: number } => r.support > 0 && r.f1 !== null,
  );
  const macroF1 = scored.length
    ? scored.reduce((a, r) => a + r.f1, 0) / scored.length
    : null;
  return { rows, macroF1 };
}

export function confusionMatrix(pairs: Pair[], classes: readonly string[]) {
  const matrix: Record<string, Record<string, number>> = {};
  for (const cls of classes)
    matrix[cls] = Object.fromEntries(classes.map((c) => [c, 0]));
  for (const p of pairs)
    if (matrix[p.expected] && p.actual in matrix[p.expected])
      matrix[p.expected][p.actual] += 1;
  return matrix;
}

const accuracy = (pairs: Pair[]) =>
  pairs.length
    ? pairs.filter((p) => p.expected === p.actual).length / pairs.length
    : null;

const groupAccuracy = (subset: EvalResult[], pick: (r: EvalResult) => Pair) =>
  subset.length
    ? subset.filter((r) => pick(r).expected === pick(r).actual).length / subset.length
    : null;

/**
 * Score a completed run.
 *
 * `results` is a list of { case, classification, error }, where `classification`
 * is null when the model failed or its output was rejected by validation.
 */
export function score({
  name,
  label,
  model,
  results,
}: {
  name: string;
  label: string;
  model: string;
  results: EvalResult[];
}) {
  const usable = results.filter((r) => r.classification);

  const deptPairs = usable.map((r) => ({
    id: r.case.id,
    expected: r.case.expected.departmentId,
    actual: r.classification!.assignment.departmentId,
  }));
  const catPairs = usable.map((r) => ({
    id: r.case.id,
    expected: r.case.expected.category,
    actual: r.classification!.assignment.category,
  }));

  const sevIndex = (s: string) => SEVERITY_ORDER.indexOf(s);
  const criticalCases = usable.filter((r) => r.case.expected.severity === "critical");

  const shouldEscalate = usable.filter(
    (r) => r.case.expected.departmentId === "review",
  );
  const didEscalate = usable.filter(
    (r) => r.classification!.assignment.departmentId === "review",
  );
  const correctlyEscalated = shouldEscalate.filter(
    (r) => r.classification!.assignment.departmentId === "review",
  );
  const missedEscalations = shouldEscalate.filter(
    (r) => r.classification!.assignment.departmentId !== "review",
  );

  const calibration: Record<
    string,
    { count: number; errors: number; errorRate: number | null }
  > = {};
  for (const level of ["high", "medium", "low"]) {
    const subset = usable.filter(
      (r) => r.classification!.assignment.confidence === level,
    );
    const errors = subset.filter(
      (r) =>
        r.classification!.assignment.departmentId !== r.case.expected.departmentId,
    );
    calibration[level] = {
      count: subset.length,
      errors: errors.length,
      errorRate: subset.length ? errors.length / subset.length : null,
    };
  }

  const group = (keyOf: (r: EvalResult) => string[]) => {
    const out: Record<
      string,
      { count: number; departmentAccuracy: number | null }
    > = {};
    for (const key of [...new Set(results.flatMap(keyOf))].sort()) {
      const subset = usable.filter((r) => keyOf(r).includes(key));
      out[key] = {
        count: subset.length,
        departmentAccuracy: groupAccuracy(subset, (r) => ({
          expected: r.case.expected.departmentId,
          actual: r.classification!.assignment.departmentId,
        })),
      };
    }
    return out;
  };

  return {
    name,
    label,
    model,
    ranAt: new Date().toISOString(),
    cases: results.length,
    unusableResponses: results.length - usable.length,
    department: {
      accuracy: accuracy(deptPairs),
      ...classMetrics(deptPairs, DEPARTMENTS),
      confusion: confusionMatrix(deptPairs, DEPARTMENTS),
    },
    category: {
      accuracy: accuracy(catPairs),
      ...classMetrics(catPairs, CATEGORIES),
    },
    severity: {
      exactAccuracy: usable.length
        ? usable.filter(
            (r) => r.classification!.severity.level === r.case.expected.severity,
          ).length / usable.length
        : null,
      withinOneAccuracy: usable.length
        ? usable.filter(
            (r) =>
              Math.abs(
                sevIndex(r.classification!.severity.level) -
                  sevIndex(r.case.expected.severity),
              ) <= 1,
          ).length / usable.length
        : null,
      // Under-calling a critical report is the failure that can hurt someone,
      // so it is counted separately rather than averaged away.
      criticalUnderCalls: criticalCases.filter(
        (r) => sevIndex(r.classification!.severity.level) < sevIndex("critical"),
      ).length,
      criticalCases: criticalCases.length,
    },
    humanReview: {
      shouldEscalate: shouldEscalate.length,
      didEscalate: didEscalate.length,
      correctlyEscalated: correctlyEscalated.length,
      missedEscalations: missedEscalations.length,
      missedIds: missedEscalations.map((r) => r.case.id),
      recall: shouldEscalate.length
        ? correctlyEscalated.length / shouldEscalate.length
        : null,
      precision: didEscalate.length
        ? correctlyEscalated.length / didEscalate.length
        : null,
    },
    calibration,
    byTag: group((r) => r.case.tags ?? []),
    byLanguage: group((r) => [r.case.language]),
    errors: results
      .filter((r) => r.error)
      .map((r) => ({ id: r.case.id, error: r.error })),
  };
}
