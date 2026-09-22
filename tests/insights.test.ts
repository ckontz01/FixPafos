import test from "node:test";
import assert from "node:assert/strict";
import { createTestDatabase, type TaggedSql } from "./helpers/pg";
import { getInsightsWith } from "../src/lib/insights";
import { flagIssueWith, type Sql } from "../src/lib/db";
import {
  FLAG_HIDE_THRESHOLD,
  type Issue,
  type Severity,
} from "../src/lib/issues";

const asSql = (sql: TaggedSql) => sql as unknown as Sql;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
// A fixed origin keeps day bucketing and seasonal grouping deterministic.
const T0 = Date.UTC(2026, 0, 15, 12, 0, 0);

let seq = 0;
function makeIssue(
  overrides: Partial<Issue> & { createdAt?: number } = {},
): Issue {
  seq += 1;
  return {
    id: `i-${String(seq).padStart(4, "0")}`,
    author: "Resident",
    message: "Broken pavement",
    location: { longitude: 32.42, latitude: 34.77, label: "Apostolou Pavlou" },
    category: "roads",
    assignment: {
      departmentId: "technical",
      confidence: "high",
      source: "deepseek",
      category: "roads",
    },
    createdAt: T0,
    seconds: 0,
    replies: [],
    ...overrides,
  };
}

async function insert(sql: TaggedSql, issue: Issue) {
  await sql`INSERT INTO pafos_issues(id,data,created_at)
            VALUES(${issue.id},${sql.json(issue)},${issue.createdAt})`;
  return issue;
}

/** A resolved report whose resolution is `hours` after it was created. */
function resolved(hours: number, overrides: Partial<Issue> = {}) {
  const createdAt = (overrides.createdAt as number) ?? T0;
  return makeIssue({
    ...overrides,
    createdAt,
    status: "resolved",
    resolution: { departmentId: "technical", at: createdAt + hours * HOUR },
  });
}

test("totals, resolution rate and durations come from stored rows", async () => {
  const { sql, close } = await createTestDatabase();
  try {
    await insert(sql, makeIssue());
    await insert(sql, makeIssue());
    await insert(sql, resolved(10));
    await insert(sql, resolved(20));
    await insert(sql, resolved(60));

    let queryCount = 0;
    const counted = Object.assign(
      (strings: TemplateStringsArray, ...values: unknown[]) => {
        queryCount += 1;
        return sql(strings, ...values);
      },
      { json: sql.json, begin: sql.begin },
    );
    const insights = await getInsightsWith(counted);
    assert.equal(
      queryCount,
      1,
      "analytics must not regress to a network-query waterfall",
    );
    assert.equal(insights.totals.total, 5);
    assert.equal(insights.totals.open, 2);
    assert.equal(insights.totals.resolved, 3);
    assert.equal(insights.totals.resolutionRate, 3 / 5);
    assert.equal(insights.resolution.medianHours, 20);
    assert.equal(insights.resolution.averageHours, 30);
  } finally {
    await close();
  }
});

test("an empty result reports null rather than a fabricated zero rate", async () => {
  const { sql, close } = await createTestDatabase();
  try {
    const insights = await getInsightsWith(asSql(sql));
    assert.equal(insights.totals.total, 0);
    assert.equal(insights.totals.resolutionRate, null);
    assert.equal(insights.resolution.medianHours, null);
    assert.equal(insights.resolution.averageHours, null);
    assert.equal(insights.hasAnyData, false);
    assert.deepEqual(insights.byCategory, []);
  } finally {
    await close();
  }
});

test("hidden reports are excluded from every operational figure", async () => {
  const { sql, close } = await createTestDatabase();
  try {
    const visible = await insert(sql, makeIssue());
    const flagged = await insert(sql, makeIssue({ category: "waste" }));
    for (let i = 0; i < FLAG_HIDE_THRESHOLD; i += 1)
      await flagIssueWith(asSql(sql), flagged.id, `voter-${i}`, "spam");

    const insights = await getInsightsWith(asSql(sql));
    assert.equal(
      insights.totals.total,
      1,
      "a withdrawn report must not inflate totals",
    );
    assert.deepEqual(
      insights.byCategory.map((c) => c.key),
      ["roads"],
    );
    assert.ok(insights.hasAnyData);
    assert.equal(visible.category, "roads");
  } finally {
    await close();
  }
});

test("breakdowns group by category, department, status and severity", async () => {
  const { sql, close } = await createTestDatabase();
  try {
    const severities: Severity[] = ["low", "high", "high"];
    for (const level of severities)
      await insert(
        sql,
        makeIssue({
          severity: {
            level,
            confidence: "medium",
            factors: [],
            rationale: "",
            source: "deepseek",
            needsReview: false,
            slaHours: 1,
            assessedAt: 1,
          },
        }),
      );
    await insert(
      sql,
      makeIssue({
        category: "waste",
        assignment: {
          departmentId: "cleaning",
          confidence: "high",
          source: "deepseek",
          category: "waste",
        },
      }),
    );

    const insights = await getInsightsWith(asSql(sql));
    assert.deepEqual(insights.byCategory, [
      { key: "roads", count: 3 },
      { key: "waste", count: 1 },
    ]);
    assert.deepEqual(insights.byDepartment, [
      { key: "technical", count: 3 },
      { key: "cleaning", count: 1 },
    ]);
    assert.deepEqual(insights.byStatus, [{ key: "open", count: 4 }]);
    assert.deepEqual(insights.bySeverity, [
      { key: "high", count: 2 },
      { key: "low", count: 1 },
    ]);
  } finally {
    await close();
  }
});

test("a date range narrows every series", async () => {
  const { sql, close } = await createTestDatabase();
  try {
    await insert(sql, makeIssue({ createdAt: T0 - 40 * DAY }));
    await insert(sql, makeIssue({ createdAt: T0 - 2 * DAY }));
    await insert(sql, makeIssue({ createdAt: T0 }));

    const recent = await getInsightsWith(asSql(sql), { from: T0 - 7 * DAY });
    assert.equal(recent.totals.total, 2);
    assert.equal(recent.overTime.length, 2);

    const window = await getInsightsWith(asSql(sql), {
      from: T0 - 7 * DAY,
      to: T0 - DAY,
    });
    assert.equal(window.totals.total, 1);
  } finally {
    await close();
  }
});

test("the time series buckets by day and counts resolutions separately", async () => {
  const { sql, close } = await createTestDatabase();
  try {
    await insert(sql, makeIssue({ createdAt: T0 }));
    await insert(sql, makeIssue({ createdAt: T0 + HOUR }));
    await insert(sql, resolved(5, { createdAt: T0 + DAY }));

    const insights = await getInsightsWith(asSql(sql));
    assert.equal(insights.overTime.length, 2);
    assert.deepEqual(insights.overTime[0], {
      day: "2026-01-15",
      opened: 2,
      resolved: 0,
    });
    assert.deepEqual(insights.overTime[1], {
      day: "2026-01-16",
      opened: 1,
      resolved: 1,
    });
  } finally {
    await close();
  }
});

test("hotspots aggregate nearby coordinates and recurring locations repeat", async () => {
  const { sql, close } = await createTestDatabase();
  try {
    // Three reports within metres of each other, one further away.
    for (const lat of [34.7701, 34.77012, 34.77008])
      await insert(
        sql,
        makeIssue({
          location: {
            longitude: 32.42,
            latitude: lat,
            label: "Kennedy Square",
          },
        }),
      );
    await insert(
      sql,
      makeIssue({
        location: { longitude: 32.46, latitude: 34.79, label: "Elsewhere" },
      }),
    );

    const insights = await getInsightsWith(asSql(sql));
    assert.equal(insights.hotspots[0].count, 3);
    assert.equal(insights.hotspots[0].label, "Kennedy Square");
    // Only locations reported more than once count as recurring.
    assert.deepEqual(
      insights.recurring.map((r) => [r.label, r.count]),
      [["Kennedy Square", 3]],
    );
  } finally {
    await close();
  }
});

test("department performance reports median resolution per department", async () => {
  const { sql, close } = await createTestDatabase();
  try {
    await insert(sql, resolved(10));
    await insert(sql, resolved(30));
    await insert(sql, makeIssue());
    await insert(
      sql,
      makeIssue({
        assignment: {
          departmentId: "cleaning",
          confidence: "high",
          source: "deepseek",
          category: "waste",
        },
      }),
    );

    const insights = await getInsightsWith(asSql(sql));
    const technical = insights.departments.find(
      (d) => d.departmentId === "technical",
    );
    assert.equal(technical?.total, 3);
    assert.equal(technical?.resolved, 2);
    assert.equal(technical?.medianHours, 20);
    const cleaning = insights.departments.find(
      (d) => d.departmentId === "cleaning",
    );
    assert.equal(cleaning?.total, 1);
    assert.equal(
      cleaning?.medianHours,
      null,
      "a department with nothing resolved has no median, not zero",
    );
  } finally {
    await close();
  }
});

test("demonstration rows are counted separately from citizen reports", async () => {
  const { sql, close } = await createTestDatabase();
  try {
    await insert(sql, makeIssue({ demo: true }));
    await insert(sql, makeIssue({ demo: true }));
    let insights = await getInsightsWith(asSql(sql));
    assert.equal(insights.totals.demo, 2);
    assert.equal(insights.totals.demoOnly, true);

    await insert(sql, makeIssue());
    insights = await getInsightsWith(asSql(sql));
    assert.equal(insights.totals.demo, 2);
    assert.equal(
      insights.totals.demoOnly,
      false,
      "mixed data must not be labelled as demonstration-only",
    );
  } finally {
    await close();
  }
});

test("duplicate clusters are summarised by size", async () => {
  const { sql, close } = await createTestDatabase();
  try {
    const link = (clusterId: string, role: "primary" | "linked") => ({
      clusterId,
      role,
      status: "confirmed" as const,
      confidence: "high" as const,
      score: 0.9,
      distanceMetres: 12,
      reason: "same pothole",
      source: "deepseek" as const,
      at: T0,
    });
    await insert(sql, makeIssue({ cluster: link("c1", "primary") }));
    await insert(sql, makeIssue({ cluster: link("c1", "linked") }));
    await insert(sql, makeIssue({ cluster: link("c1", "linked") }));
    await insert(sql, makeIssue({ cluster: link("c2", "primary") }));

    const insights = await getInsightsWith(asSql(sql));
    // A cluster of one is not a duplicate, so it is not reported as one.
    assert.deepEqual(insights.clusters, [{ clusterId: "c1", size: 3 }]);
  } finally {
    await close();
  }
});
