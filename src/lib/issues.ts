export const PAFOS_CENTER: [number, number] = [32.4245, 34.772];
// Service area, not a claim about precise municipal boundaries.
export const PAFOS_BOUNDS = {
  west: 32.32,
  east: 32.53,
  south: 34.7,
  north: 34.88,
};
export const categories = {
  roads: { label: "Roads & pavements", symbol: "R", color: "--category-roads" },
  sewage: {
    label: "Sewage & drainage",
    symbol: "S",
    color: "--category-sewage",
  },
  water: { label: "Water supply", symbol: "W", color: "--category-water" },
  waste: { label: "Waste & cleaning", symbol: "C", color: "--category-waste" },
  lighting: {
    label: "Street lighting",
    symbol: "L",
    color: "--category-lighting",
  },
  parks: {
    label: "Parks & green spaces",
    symbol: "P",
    color: "--category-parks",
  },
  traffic: {
    label: "Traffic & parking",
    symbol: "T",
    color: "--category-traffic",
  },
  other: { label: "Other local issue", symbol: "O", color: "--category-other" },
} as const;
export type Category = keyof typeof categories;
export type IssueLocation = {
  longitude: number;
  latitude: number;
  label: string;
};
export type Assignment = {
  departmentId: string;
  confidence: "high" | "medium" | "low";
  source: "deepseek" | "manual_review";
  category: Category;
};
export type Reply = {
  id: string;
  author: string;
  message: string;
  createdAt: number;
};
export type Issue = {
  id: string;
  author: string;
  message: string;
  location: IssueLocation;
  category: Category;
  assignment: Assignment;
  createdAt: number;
  seconds: number;
  replies: Reply[];
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
export function timeAgo(time: number) {
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return new Date(time).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}
