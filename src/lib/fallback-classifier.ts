import { normalizeForComparison } from "./text-similarity";
import {
  SEVERITY_SLA_HOURS,
  type Assignment,
  type Category,
  type Issue,
  type Severity,
  type SeverityAssessment,
  type SeverityFactor,
} from "./issues";

/**
 * Deterministic keyword classifier used only when the model provider is
 * unavailable AND demonstration mode is explicitly enabled.
 *
 * This exists so a demonstration survives a hotel connection or a provider
 * outage. It is emphatically NOT a silent substitute for the model:
 *
 *  - every result is stamped `source: "fallback"`, never `"deepseek"`, so the
 *    interface can say which produced it and the evaluation never mistakes one
 *    for the other;
 *  - confidence is capped at medium and severity is always marked as needing
 *    human review, because a keyword match is not a judgement;
 *  - it is off unless `DEMO_MODE=true`. In production the absence of the model
 *    still fails closed and the report is not published, which is the correct
 *    behaviour for a real municipal service.
 *
 * Keywords are matched against the same normalised form used for duplicate
 * detection, so Greek, Greeklish, English and transliterated Russian all hit
 * the same tokens.
 */

export const DEMO_MODE = process.env.DEMO_MODE === "true";

/** Token stems per category, in the normalised (folded-to-Latin) form. */
const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  roads: [
    "lakkouv", "pothole", "yam", "asfalt", "asphalt", "pezodromio", "pavement",
    "trotuar", "dromo", "road", "doroga", "plitk", "manhole", "frear",
  ],
  sewage: [
    "apochetev", "sewer", "sewage", "kanaliz", "lymat", "drain",
    "stok", "livnev", "ombri", "freat",
  ],
  water: [
    "nero", "nerou", "water", "vod", "solin", "pipe", "trub", "diarro", "leak",
    "utechk", "ydrefs", "vrisi", "piesi", "pressure",
  ],
  waste: [
    "skoupidi", "rubbish", "garbage", "musor", "trash", "kado", "bin", "bak",
    "litter", "dump", "mpaza", "svalk", "anakykl", "recycl",
  ],
  lighting: [
    "fanari", "lamp", "light", "fonar", "osvesch", "fotism", "svet", "streetlight",
  ],
  parks: [
    "parko", "park", "dentr", "tree", "derev", "xorta", "vegetat", "zarosl",
    "kounia", "swing", "playground", "paidiki", "ploshchadk", "prasin", "green",
  ],
  traffic: [
    "stathmev", "parking", "parkov", "kykloforia", "traffic", "dvizh", "pinakida",
    "sign", "znak", "diavas", "crossing", "perehod", "diagrammis", "marking",
  ],
  other: [],
};

const DEPARTMENT_FOR: Record<Category, string> = {
  roads: "technical",
  sewage: "sewerage",
  water: "water",
  waste: "cleaning",
  lighting: "technical",
  parks: "green",
  traffic: "traffic",
  other: "review",
};

/**
 * Words that indicate danger, in the same normalised form.
 *
 * Single stems only: matching runs per token, so a multi-word phrase could
 * never match. This is why the list cannot express "burst pipe" as a phrase and
 * relies on the individual words instead -- a known coarseness of the fallback,
 * and one more reason its output always goes to human review.
 */
const SEVERITY_KEYWORDS: { level: Severity; factor: SeverityFactor; words: string[] }[] = [
  {
    level: "critical",
    factor: "danger",
    words: [
      "fotia", "fire", "pozhar", "aeri", "gas", "revma", "electric", "elektr",
      "katarrefs", "collaps", "obrush", "traumat", "injur", "ranen",
      "burst", "proryv",
    ],
  },
  {
    level: "high",
    factor: "danger",
    words: [
      "epikindyn", "danger", "opasn", "asfale", "unsafe", "pesei", "fall", "upast",
      "paidi", "child", "rebenk", "sxolei", "school", "shkol",
    ],
  },
  {
    level: "high",
    factor: "accessibility",
    words: ["karotsak", "wheelchair", "kolyask", "anapir", "disab", "prosvasim"],
  },
];

function scoreCategory(tokens: string[]): Category | null {
  let best: { category: Category; hits: number } | null = null;
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS) as [
    Category,
    string[],
  ][]) {
    const hits = keywords.reduce(
      (count, keyword) =>
        count + (tokens.some((token) => token.includes(keyword)) ? 1 : 0),
      0,
    );
    if (hits > 0 && (!best || hits > best.hits)) best = { category, hits };
  }
  return best?.category ?? null;
}

/**
 * Classify without a model. Returns null when demonstration mode is off, so the
 * production path keeps failing closed rather than quietly degrading.
 */
export function fallbackClassify(
  issue: Issue,
): { assignment: Assignment; severity: SeverityAssessment } | null {
  if (!DEMO_MODE) return null;

  const tokens = normalizeForComparison(
    `${issue.message} ${issue.location.label}`,
  );
  const matched = scoreCategory(tokens);
  // A reporter's own category is used only when keywords find nothing.
  const hinted =
    issue.reportedCategory && issue.reportedCategory !== "unsure"
      ? (issue.reportedCategory as Category)
      : null;
  const category = matched ?? hinted ?? "other";

  let level: Severity = "medium";
  const factors: SeverityFactor[] = ["infrastructure"];
  for (const rule of SEVERITY_KEYWORDS) {
    if (rule.words.some((word) => tokens.some((token) => token.includes(word)))) {
      level = rule.level;
      if (!factors.includes(rule.factor)) factors.unshift(rule.factor);
      if (level === "critical") break;
    }
  }

  return {
    assignment: {
      departmentId: matched ? DEPARTMENT_FOR[category] : "review",
      category,
      // Never "high": a keyword match is a guess, not a judgement.
      confidence: matched ? "medium" : "low",
      source: "fallback",
    },
    severity: {
      level,
      confidence: "low",
      factors,
      rationale:
        "Keyword fallback used because the model service was unavailable. Not a model assessment.",
      source: "fallback",
      // Always true: a deterministic keyword result is advisory at best.
      needsReview: true,
      slaHours: SEVERITY_SLA_HOURS[level],
      assessedAt: Date.now(),
    },
  };
}
