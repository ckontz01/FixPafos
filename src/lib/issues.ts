export const PAFOS_CENTER: [number, number] = [32.4245, 34.772];
// Service area, not a claim about precise municipal boundaries.
export const PAFOS_BOUNDS = {
  west: 32.32,
  east: 32.53,
  south: 34.7,
  north: 34.88,
};

/**
 * Canonical category identifiers. These are stable, language-independent keys
 * stored in the database and sent to the model; the human-readable label for
 * each one lives in the translation dictionaries under `category.<id>`.
 * Only presentation constants that do not vary by language stay here.
 */
export const categories = {
  roads: { symbol: "R", color: "--category-roads" },
  sewage: { symbol: "S", color: "--category-sewage" },
  water: { symbol: "W", color: "--category-water" },
  waste: { symbol: "C", color: "--category-waste" },
  lighting: { symbol: "L", color: "--category-lighting" },
  parks: { symbol: "P", color: "--category-parks" },
  traffic: { symbol: "T", color: "--category-traffic" },
  other: { symbol: "O", color: "--category-other" },
} as const;
export type Category = keyof typeof categories;
export type ReportedCategory = Category | "unsure";
export const categoryIds = Object.keys(categories) as Category[];

export type Confidence = "high" | "medium" | "low";

/** Ordered from least to most urgent so comparisons and sorting are meaningful. */
export const severityLevels = ["low", "medium", "high", "critical"] as const;
export type Severity = (typeof severityLevels)[number];

/**
 * The factors a severity assessment may cite. Keeping them as a closed set of
 * identifiers (rather than free text) is what makes the estimate explainable
 * and translatable, and lets the evaluation harness score them.
 */
export const severityFactors = [
  "danger",
  "infrastructure",
  "accessibility",
  "traffic",
  "environment",
  "people",
  "escalation",
  "recurrence",
] as const;
export type SeverityFactor = (typeof severityFactors)[number];

/**
 * Suggested municipal response windows in hours. These are deterministic: the
 * model estimates severity, but the response window is a fixed policy mapping
 * so the same severity always yields the same suggested window. Working-day
 * figures are expressed in calendar hours for storage and arithmetic.
 */
export const SEVERITY_SLA_HOURS: Record<Severity, number> = {
  critical: 4,
  high: 48,
  medium: 240,
  low: 720,
};

export type SeverityAssessment = {
  level: Severity;
  confidence: Confidence;
  /** Closed-vocabulary reasons, rendered through `severity.factor.<id>`. */
  factors: SeverityFactor[];
  /** Short model-written explanation, stored so the estimate can be audited. */
  rationale: string;
  source: "deepseek" | "fallback" | "manual_review";
  /** True when the estimate is advisory-only and a person should confirm it. */
  needsReview: boolean;
  slaHours: number;
  assessedAt: number;
};

export const severityFor = (level: Severity) => SEVERITY_SLA_HOURS[level];

/** Default radius for treating two reports as possibly the same physical issue. */
export const DUPLICATE_RADIUS_METRES = Number(
  process.env.DUPLICATE_RADIUS_METRES ?? 100,
);

export type ClusterStatus = "suggested" | "confirmed" | "separated";

/**
 * A report's membership of a duplicate cluster. The underlying citizen report is
 * never destroyed or merged away: this only records that it appears to describe
 * the same physical issue as a primary report.
 */
export type ClusterLink = {
  clusterId: string;
  role: "primary" | "linked";
  status: ClusterStatus;
  confidence: Confidence;
  /** Combined 0–1 similarity score; see lib/duplicates.ts for the components. */
  score: number;
  distanceMetres: number;
  /** Why the match was suggested, shown to moderators and in the issue detail. */
  reason: string;
  source: "deepseek" | "lexical";
  decidedBy?: "auto" | "moderator";
  at: number;
};

export type IssueLocation = {
  longitude: number;
  latitude: number;
  label: string;
};

export type Assignment = {
  departmentId: string;
  confidence: Confidence;
  source: "deepseek" | "manual_review" | "fallback";
  category: Category;
};

/**
 * A machine translation of citizen text. The original is always preserved and
 * always authoritative; this exists so municipal staff can read a report
 * submitted in a language they do not speak.
 */
export type Translation = {
  /** BCP 47 language detected in the original text, or "und" when unknown. */
  detected: string;
  target: string;
  text: string;
  source: "deepseek";
  at: number;
};

export type Reply = {
  id: string;
  author: string;
  message: string;
  createdAt: number;
  verifiedDepartmentId?: string;
  kind?: "resolution";
};

export type Issue = {
  id: string;
  author: string;
  message: string;
  location: IssueLocation;
  category: Category;
  reportedCategory?: ReportedCategory;
  assignment: Assignment;
  severity?: SeverityAssessment;
  cluster?: ClusterLink;
  /** Reports in this cluster, including this one. Present only when clustered. */
  clusterSize?: number;
  translation?: Translation;
  createdAt: number;
  seconds: number;
  replies: Reply[];
  status?: "open" | "resolved";
  resolution?: { departmentId: string; at: number };
  resolvedAt?: number;
  photo?: { status: "pending" | "approved" | "rejected"; url?: string };
  /** Present only on seeded demonstration records, never on citizen reports. */
  demo?: true;
};

/**
 * Why a citizen flagged a report. A closed vocabulary keeps the reason
 * translatable and lets moderators triage by type instead of reading free text,
 * and avoids flags becoming another unmoderated text field.
 */
export const flagReasons = [
  "offensive",
  "spam",
  "personal",
  "wrong",
  "other",
] as const;
export type FlagReason = (typeof flagReasons)[number];
export const isFlagReason = (value: unknown): value is FlagReason =>
  typeof value === "string" && (flagReasons as readonly string[]).includes(value);

/**
 * Flags hide a report pending review once enough distinct people raise it; they
 * never delete it. Moderators restore or permanently hide from the queue.
 */
export const FLAG_HIDE_THRESHOLD = Number(process.env.FLAG_HIDE_THRESHOLD ?? 3);

export type FlaggedIssue = {
  issueId: string;
  flagCount: number;
  reasons: FlagReason[];
  hiddenAt?: number;
  reviewedAt?: number;
  reviewedBy?: string;
  outcome?: "restored" | "removed";
  issue: Issue;
};

export type QuarantineItem = {
  id: string;
  submissionType: "post" | "reply";
  parentPostId?: string;
  submission: Issue | Reply;
  blockedBy: string;
  category: string;
  status: "pending" | "published";
  reviewedAt?: number;
};

export function withinPafos(lng: number, lat: number) {
  return (
    Number.isFinite(lng) &&
    Number.isFinite(lat) &&
    lng >= PAFOS_BOUNDS.west &&
    lng <= PAFOS_BOUNDS.east &&
    lat >= PAFOS_BOUNDS.south &&
    lat <= PAFOS_BOUNDS.north
  );
}

/**
 * Great-circle distance in metres. Used by duplicate detection, so it is kept
 * deterministic and dependency-free rather than delegated to a geo library.
 */
export function distanceMetres(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
