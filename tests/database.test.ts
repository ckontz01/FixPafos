import test from "node:test";
import assert from "node:assert/strict";
import { createTestDatabase, type TaggedSql } from "./helpers/pg";
import {
  listIssuesWith,
  flagIssueWith,
  listFlaggedWith,
  reviewFlaggedWith,
  type Sql,
} from "../src/lib/db";
import { FLAG_HIDE_THRESHOLD, type Issue } from "../src/lib/issues";

const asSql = (sql: TaggedSql) => sql as unknown as Sql;

let seq = 0;
function makeIssue(overrides: Partial<Issue> = {}): Issue {
  seq += 1;
  return {
    id: `issue-${String(seq).padStart(4, "0")}`,
    author: "Resident",
    message: "The pavement is broken.",
    location: { longitude: 32.42, latitude: 34.77, label: "Apostolou Pavlou" },
    category: "roads",
    assignment: {
      departmentId: "technical",
      confidence: "high",
      source: "deepseek",
      category: "roads",
    },
    createdAt: 1_000_000 + seq,
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

test("generated columns stay derived from the stored document", async () => {
  const { sql, close } = await createTestDatabase();
  try {
    const issue = await insert(
      sql,
      makeIssue({
        category: "water",
        status: "resolved",
        resolution: { departmentId: "water", at: 5_000 },
        severity: {
          level: "critical",
          confidence: "high",
          factors: ["danger"],
          rationale: "Burst main",
          source: "deepseek",
          needsReview: false,
          slaHours: 4,
          assessedAt: 1,
        },
        assignment: {
          departmentId: "water",
          confidence: "high",
          source: "deepseek",
          category: "water",
        },
      }),
    );
    const [row] =
      await sql`SELECT category,department_id,status,severity,latitude,longitude,resolved_at,is_demo
                FROM pafos_issues WHERE id=${issue.id}`;
    assert.equal(row.category, "water");
    assert.equal(row.department_id, "water");
    assert.equal(row.status, "resolved");
    assert.equal(row.severity, "critical");
    assert.equal(Number(row.latitude), 34.77);
    assert.equal(Number(row.resolved_at), 5000);
    assert.equal(row.is_demo, false);

    // Updating the document must move the columns with it; they cannot drift.
    const updated = { ...issue, category: "roads", status: "open" };
    await sql`UPDATE pafos_issues SET data=${sql.json(updated)} WHERE id=${issue.id}`;
    const [after] =
      await sql`SELECT category,status FROM pafos_issues WHERE id=${issue.id}`;
    assert.equal(after.category, "roads");
    assert.equal(after.status, "open");
  } finally {
    await close();
  }
});

test("a missing status still reads as open rather than null", async () => {
  const { sql, close } = await createTestDatabase();
  try {
    const issue = await insert(sql, makeIssue());
    const [row] =
      await sql`SELECT status FROM pafos_issues WHERE id=${issue.id}`;
    assert.equal(row.status, "open");
  } finally {
    await close();
  }
});

test("listing pages by cursor without repeating or dropping reports", async () => {
  const { sql, close } = await createTestDatabase();
  try {
    for (let i = 0; i < 12; i += 1) await insert(sql, makeIssue());

    const seen: string[] = [];
    let cursor = undefined as undefined | { createdAt: number; id: string };
    for (let page = 0; page < 10; page += 1) {
      const result = await listIssuesWith(asSql(sql), { limit: 5, cursor });
      seen.push(...result.posts.map((p) => p.id));
      if (!result.nextCursor) break;
      cursor = result.nextCursor;
    }
    assert.equal(seen.length, 12, "every report should be returned exactly once");
    assert.equal(new Set(seen).size, 12, "pages must not overlap");
    // Newest first.
    assert.deepEqual([...seen].sort().reverse(), seen);
  } finally {
    await close();
  }
});

test("page size is clamped so a client cannot request the whole table", async () => {
  const { sql, close } = await createTestDatabase();
  try {
    for (let i = 0; i < 5; i += 1) await insert(sql, makeIssue());
    const huge = await listIssuesWith(asSql(sql), { limit: 100_000 });
    assert.equal(huge.posts.length, 5);
    const zero = await listIssuesWith(asSql(sql), { limit: 0 });
    assert.equal(zero.posts.length, 1, "a zero limit falls back to one row");
  } finally {
    await close();
  }
});

test("filters narrow the board server-side", async () => {
  const { sql, close } = await createTestDatabase();
  try {
    await insert(sql, makeIssue({ category: "roads" }));
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
    await insert(sql, makeIssue({ category: "roads", status: "resolved" }));

    assert.equal(
      (await listIssuesWith(asSql(sql), { category: "roads" })).posts.length,
      2,
    );
    assert.equal(
      (await listIssuesWith(asSql(sql), { status: "resolved" })).posts.length,
      1,
    );
    assert.equal(
      (await listIssuesWith(asSql(sql), { departmentId: "cleaning" })).posts
        .length,
      1,
    );
    assert.equal(
      (await listIssuesWith(asSql(sql), { search: "pavement" })).posts.length,
      3,
    );
    assert.equal(
      (await listIssuesWith(asSql(sql), { search: "nothing-matches" })).posts
        .length,
      0,
    );
  } finally {
    await close();
  }
});

test("a viewport filter returns only reports inside the box", async () => {
  const { sql, close } = await createTestDatabase();
  try {
    await insert(
      sql,
      makeIssue({
        location: { longitude: 32.42, latitude: 34.77, label: "centre" },
      }),
    );
    await insert(
      sql,
      makeIssue({
        location: { longitude: 32.52, latitude: 34.87, label: "far corner" },
      }),
    );
    const inside = await listIssuesWith(asSql(sql), {
      bounds: { west: 32.4, south: 34.75, east: 32.45, north: 34.8 },
    });
    assert.equal(inside.posts.length, 1);
    assert.equal(inside.posts[0].location.label, "centre");
  } finally {
    await close();
  }
});

test("vote counts and the viewer's own vote come back with each page", async () => {
  const { sql, close } = await createTestDatabase();
  try {
    const issue = await insert(sql, makeIssue());
    await sql`INSERT INTO pafos_votes(issue_id,voter_id) VALUES(${issue.id},'voter-one')`;
    await sql`INSERT INTO pafos_votes(issue_id,voter_id) VALUES(${issue.id},'voter-two')`;

    const mine = await listIssuesWith(asSql(sql), { voterId: "voter-one" });
    assert.equal(mine.posts[0].seconds, 2);
    assert.deepEqual(mine.seconded, [issue.id]);

    const other = await listIssuesWith(asSql(sql), { voterId: "voter-three" });
    assert.equal(other.posts[0].seconds, 2);
    assert.deepEqual(other.seconded, [], "another visitor has not voted");
  } finally {
    await close();
  }
});

test("replies are attached in chronological order", async () => {
  const { sql, close } = await createTestDatabase();
  try {
    const issue = await insert(sql, makeIssue());
    for (const [id, at] of [
      ["r2", 200],
      ["r1", 100],
    ] as const) {
      const reply = { id, author: "A", message: id, createdAt: at };
      await sql`INSERT INTO pafos_replies(id,issue_id,data,created_at)
                VALUES(${id},${issue.id},${sql.json(reply)},${at})`;
    }
    const result = await listIssuesWith(asSql(sql), {});
    assert.deepEqual(
      result.posts[0].replies.map((r) => r.id),
      ["r1", "r2"],
    );
  } finally {
    await close();
  }
});

test("a single person's repeated flags never hide a report", async () => {
  const { sql, close } = await createTestDatabase();
  try {
    const issue = await insert(sql, makeIssue());
    let last;
    for (let i = 0; i < FLAG_HIDE_THRESHOLD + 3; i += 1)
      last = await flagIssueWith(asSql(sql), issue.id, "same-voter", "spam");

    assert.equal(last!.flagCount, 1, "repeat flags from one person count once");
    assert.equal(last!.hidden, false);
    assert.equal(last!.alreadyFlagged, true);
    assert.equal(
      (await listIssuesWith(asSql(sql), {})).posts.length,
      1,
      "the report stays public",
    );
  } finally {
    await close();
  }
});

test("distinct flags hide a report for review without deleting it", async () => {
  const { sql, close } = await createTestDatabase();
  try {
    const issue = await insert(sql, makeIssue());
    let result;
    for (let i = 0; i < FLAG_HIDE_THRESHOLD; i += 1)
      result = await flagIssueWith(asSql(sql), issue.id, `voter-${i}`, "offensive");

    assert.equal(result!.hidden, true);
    assert.equal(result!.flagCount, FLAG_HIDE_THRESHOLD);

    // Hidden from the public board...
    assert.equal((await listIssuesWith(asSql(sql), {})).posts.length, 0);
    // ...but the row, its text and its author are all still there.
    const [row] = await sql`SELECT data, hidden_at, hidden_reason
                            FROM pafos_issues WHERE id=${issue.id}`;
    assert.ok(row, "the report must not be deleted");
    assert.equal((row.data as Issue).message, "The pavement is broken.");
    assert.ok(Number(row.hidden_at) > 0);
    assert.equal(row.hidden_reason, "flagged");
    // And a moderator can still see it.
    assert.equal(
      (await listIssuesWith(asSql(sql), { includeHidden: true })).posts.length,
      1,
    );
  } finally {
    await close();
  }
});

test("moderators see flag counts and reasons, and can restore or remove", async () => {
  const { sql, close } = await createTestDatabase();
  try {
    const issue = await insert(sql, makeIssue());
    await flagIssueWith(asSql(sql), issue.id, "voter-a", "spam");
    await flagIssueWith(asSql(sql), issue.id, "voter-b", "offensive");

    const queue = await listFlaggedWith(asSql(sql));
    assert.equal(queue.length, 1);
    assert.equal(queue[0].flagCount, 2);
    assert.deepEqual([...queue[0].reasons].sort(), ["offensive", "spam"]);

    // Restoring clears the flags so the same reports cannot re-hide it.
    await flagIssueWith(asSql(sql), issue.id, "voter-c", "spam");
    await reviewFlaggedWith(asSql(sql), issue.id, "restored", "moderator-1");
    const [restored] = await sql`SELECT hidden_at, review_outcome, reviewed_by
                                 FROM pafos_issues WHERE id=${issue.id}`;
    assert.equal(restored.hidden_at, null);
    assert.equal(restored.review_outcome, "restored");
    assert.equal(restored.reviewed_by, "moderator-1");
    assert.equal((await listIssuesWith(asSql(sql), {})).posts.length, 1);
    assert.equal((await listFlaggedWith(asSql(sql))).length, 0);

    // Removing keeps the row for audit rather than deleting it.
    await flagIssueWith(asSql(sql), issue.id, "voter-d", "offensive");
    await reviewFlaggedWith(asSql(sql), issue.id, "removed", "moderator-2");
    const [removed] = await sql`SELECT data, hidden_at, review_outcome
                                FROM pafos_issues WHERE id=${issue.id}`;
    assert.ok(removed, "removal must not delete the row");
    assert.ok(Number(removed.hidden_at) > 0);
    assert.equal(removed.review_outcome, "removed");
    assert.equal((await listIssuesWith(asSql(sql), {})).posts.length, 0);
  } finally {
    await close();
  }
});

test("flagging an unknown report does not create one", async () => {
  const { sql, close } = await createTestDatabase();
  try {
    const result = await flagIssueWith(asSql(sql), "missing-id", "voter", "spam");
    assert.equal(result.flagCount, 0);
    assert.equal(result.hidden, false);
    assert.equal((await sql`SELECT * FROM pafos_flags`).length, 0);
  } finally {
    await close();
  }
});
