import test from "node:test";
import assert from "node:assert/strict";
import { createTestDatabase, type TaggedSql } from "./helpers/pg";
import {
  findCandidates,
  deterministicScore,
  detectDuplicate,
  applyCluster,
  reviewClusterWith,
  clusterMembers,
  parseAdjudication,
} from "../src/lib/duplicates";
import { lexicalSimilarity, normalizeForComparison } from "../src/lib/text-similarity";
import type { Sql } from "../src/lib/db";
import { flagIssueWith } from "../src/lib/db";
import { FLAG_HIDE_THRESHOLD, type Issue } from "../src/lib/issues";
import { getDeepSeekClient } from "../src/lib/deepseek";

const asSql = (sql: TaggedSql) => sql as unknown as Sql;
const DAY = 86_400_000;
const T0 = Date.UTC(2026, 5, 1, 12);

let seq = 0;
function makeIssue(over: Partial<Issue> = {}): Issue {
  seq += 1;
  return {
    id: `dup-${String(seq).padStart(4, "0")}`,
    author: "Resident",
    message: "Large pothole on Apostolou Pavlou Avenue",
    location: { longitude: 32.4218, latitude: 34.7729, label: "Apostolou Pavlou" },
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
    ...over,
  };
}

async function insert(sql: TaggedSql, issue: Issue) {
  await sql`INSERT INTO pafos_issues(id,data,created_at)
            VALUES(${issue.id},${sql.json(issue)},${issue.createdAt})`;
  return issue;
}

/** Stub the adjudicating model with a fixed verdict. */
async function withVerdict(
  verdict: unknown,
  body: () => Promise<void>,
) {
  const before = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "test-key";
  const client = getDeepSeekClient()!;
  const original = client.messages.create;
  client.messages.create = (async () => {
    if (verdict instanceof Error) throw verdict;
    return {
      content: [{ type: "tool_use", name: "record_duplicate", input: verdict }],
    };
  }) as unknown as typeof original;
  try {
    await body();
  } finally {
    client.messages.create = original;
    if (before) process.env.DEEPSEEK_API_KEY = before;
    else delete process.env.DEEPSEEK_API_KEY;
  }
}

// ---------------------------------------------------------------- similarity
test("Greek and its Greeklish transliteration compare as the same report", () => {
  const greek = "Μεγάλη λακκούβα στη Λεωφόρο Αποστόλου Παύλου";
  const greeklish = "Megali lakkouva sti Leoforo Apostolou Pavlou";
  assert.deepEqual(
    normalizeForComparison(greek),
    normalizeForComparison(greeklish),
  );
  assert.equal(lexicalSimilarity(greek, greeklish), 1);
});

test("Russian folds to the same tokens as its transliteration", () => {
  assert.ok(
    lexicalSimilarity(
      "Большая яма на проспекте Апостолу Павлу",
      "Bolshaya yama na prospekte Apostolu Pavlu",
    ) > 0.9,
  );
});

test("unrelated reports in the same language score zero", () => {
  assert.equal(
    lexicalSimilarity("Μεγάλη λακκούβα στον δρόμο", "Σπασμένο φανάρι στην πλατεία"),
    0,
  );
});

test("genuinely different languages are beyond the lexical layer, by design", () => {
  // This is precisely why the model adjudicates: no character overlap exists
  // between "pothole" and "яма", so the deterministic layer cannot see it.
  assert.equal(
    lexicalSimilarity(
      "Большая яма на дороге",
      "Huge pothole in the road",
    ),
    0,
  );
});

// ---------------------------------------------------------------- candidates
test("candidates are limited to nearby, recent, visible reports", async () => {
  const { sql, close } = await createTestDatabase();
  try {
    const near = await insert(sql, makeIssue({ createdAt: T0 - DAY }));
    await insert(
      sql,
      makeIssue({
        // ~1.5 km away: same street name, different place.
        location: { longitude: 32.44, latitude: 34.785, label: "Elsewhere" },
        createdAt: T0 - DAY,
      }),
    );
    await insert(
      sql,
      makeIssue({ createdAt: T0 - 300 * DAY }),
    );
    const hidden = await insert(sql, makeIssue({ createdAt: T0 - DAY }));
    for (let i = 0; i < FLAG_HIDE_THRESHOLD; i += 1)
      await flagIssueWith(asSql(sql), hidden.id, `v${i}`, "spam");

    const subject = makeIssue({ createdAt: T0 });
    const candidates = await findCandidates(asSql(sql), subject);
    assert.deepEqual(
      candidates.map((c) => c.issue.id),
      [near.id],
      "only the nearby, recent, visible report qualifies",
    );
  } finally {
    await close();
  }
});

test("proximity dominates the deterministic score", async () => {
  const subject = makeIssue();
  const close1 = {
    issue: makeIssue(),
    distanceMetres: 5,
    lexical: 0.9,
  };
  const far = {
    issue: makeIssue(),
    distanceMetres: 95,
    lexical: 0.9,
  };
  assert.ok(
    deterministicScore(close1, subject) > deterministicScore(far, subject),
  );
  // Same wording but far away should not by itself clear the auto-link bar.
  assert.ok(deterministicScore(far, subject) < 0.7);
});

// ---------------------------------------------------------------- adjudication
test("the model may only point at a candidate it was shown", () => {
  const allowed = ["a", "b"];
  assert.equal(
    parseAdjudication(
      { duplicateOf: "c", confidence: "high", reason: "same" },
      allowed,
    ),
    null,
    "an unknown id must be rejected, not trusted",
  );
  assert.ok(
    parseAdjudication(
      { duplicateOf: "a", confidence: "high", reason: "same pothole" },
      allowed,
    ),
  );
  assert.equal(
    parseAdjudication({ duplicateOf: null, confidence: "nope", reason: "x" }, allowed),
    null,
  );
  assert.equal(
    parseAdjudication({ duplicateOf: null, confidence: "high", reason: "" }, allowed),
    null,
  );
});

// ---------------------------------------------------------------- end to end
test("a confident close match links automatically", async () => {
  const { sql, close } = await createTestDatabase();
  try {
    const original = await insert(sql, makeIssue({ createdAt: T0 - DAY }));
    const second = makeIssue({
      createdAt: T0,
      location: {
        longitude: 32.42185,
        latitude: 34.77295,
        label: "Apostolou Pavlou",
      },
    });
    await withVerdict(
      { duplicateOf: original.id, confidence: "high", reason: "Same pothole." },
      async () => {
        const decision = await detectDuplicate(asSql(sql), second);
        assert.ok(decision);
        assert.equal(decision!.primaryId, original.id);
        assert.equal(decision!.link.status, "confirmed");
        assert.equal(decision!.link.source, "deepseek");
        assert.ok(decision!.link.distanceMetres < 20);
      },
    );
  } finally {
    await close();
  }
});

test("a confident match that is far away still waits for a person", async () => {
  const { sql, close } = await createTestDatabase();
  try {
    const original = await insert(sql, makeIssue({ createdAt: T0 - DAY }));
    // ~90 m away: inside the radius, but not close enough to act unreviewed.
    const second = makeIssue({
      createdAt: T0,
      message: "Something is wrong here",
      location: { longitude: 32.4218, latitude: 34.77371, label: "Nearby" },
    });
    await withVerdict(
      { duplicateOf: original.id, confidence: "high", reason: "Looks the same." },
      async () => {
        const decision = await detectDuplicate(asSql(sql), second);
        assert.ok(decision);
        assert.equal(
          decision!.link.status,
          "suggested",
          "geometry and model confidence must agree before linking unreviewed",
        );
      },
    );
  } finally {
    await close();
  }
});

test("a new problem next to an old one is not a duplicate", async () => {
  const { sql, close } = await createTestDatabase();
  try {
    await insert(sql, makeIssue({ createdAt: T0 - DAY }));
    const different = makeIssue({
      createdAt: T0,
      category: "lighting",
      message: "The street light above the pothole is out",
    });
    await withVerdict(
      { duplicateOf: null, confidence: "high", reason: "Different defect." },
      async () => {
        assert.equal(await detectDuplicate(asSql(sql), different), null);
      },
    );
  } finally {
    await close();
  }
});

test("without the model, only a very strong signal raises a suggestion", async () => {
  const { sql, close } = await createTestDatabase();
  try {
    const original = await insert(sql, makeIssue({ createdAt: T0 - DAY }));
    const identical = makeIssue({
      createdAt: T0,
      location: { longitude: 32.4218, latitude: 34.7729, label: "Apostolou Pavlou" },
    });
    await withVerdict(new Error("provider down"), async () => {
      const decision = await detectDuplicate(asSql(sql), identical);
      assert.ok(decision, "an identical report at the same spot is worth review");
      assert.equal(decision!.link.status, "suggested");
      assert.equal(decision!.link.confidence, "low");
      assert.equal(decision!.link.source, "lexical");
      assert.equal(decision!.primaryId, original.id);
    });

    // Weak wording at distance produces nothing rather than a guess.
    const weak = makeIssue({
      createdAt: T0,
      message: "Something about the area",
      location: { longitude: 32.4218, latitude: 34.77371, label: "Nearby" },
    });
    await withVerdict(new Error("provider down"), async () => {
      assert.equal(await detectDuplicate(asSql(sql), weak), null);
    });
  } finally {
    await close();
  }
});

test("clustering preserves every underlying citizen report", async () => {
  const { sql, close } = await createTestDatabase();
  try {
    const original = await insert(sql, makeIssue({ createdAt: T0 - DAY }));
    const second = makeIssue({
      createdAt: T0,
      author: "Marina",
      message: "Huge pothole near the bus stop",
      location: { longitude: 32.42182, latitude: 34.77292, label: "Apostolou Pavlou" },
    });
    await withVerdict(
      { duplicateOf: original.id, confidence: "high", reason: "Same pothole." },
      async () => {
        const decision = (await detectDuplicate(asSql(sql), second))!;
        second.cluster = decision.link;
        await insert(sql, second);
        await applyCluster(asSql(sql), second, decision);

        const members = await clusterMembers(asSql(sql), decision.link.clusterId);
        assert.equal(members.length, 2);
        // Both authors and both texts survive; nothing was merged away.
        assert.deepEqual(
          members.map((m) => m.author).sort(),
          ["Marina", "Resident"],
        );
        const events = await sql`SELECT issue_id, action, actor FROM pafos_cluster_events ORDER BY id`;
        assert.equal(events.length, 2, "both sides of the link are recorded");
        assert.equal(events[0].actor, "auto");
      },
    );
  } finally {
    await close();
  }
});

test("a moderator can separate a wrong match and it is not re-suggested", async () => {
  const { sql, close } = await createTestDatabase();
  try {
    const original = await insert(sql, makeIssue({ createdAt: T0 - 2 * DAY }));
    const second = makeIssue({
      createdAt: T0 - DAY,
      location: { longitude: 32.42182, latitude: 34.77292, label: "Apostolou Pavlou" },
    });
    await withVerdict(
      { duplicateOf: original.id, confidence: "high", reason: "Same pothole." },
      async () => {
        const decision = (await detectDuplicate(asSql(sql), second))!;
        second.cluster = decision.link;
        await insert(sql, second);
        await applyCluster(asSql(sql), second, decision);

        assert.equal(
          await reviewClusterWith(asSql(sql), second.id, "separated", "mod-1"),
          true,
        );
        const members = await clusterMembers(asSql(sql), decision.link.clusterId);
        assert.deepEqual(
          members.map((m) => m.id),
          [original.id],
          "a separated report leaves the cluster but keeps its own row",
        );
        const [row] = await sql`SELECT data FROM pafos_issues WHERE id=${second.id}`;
        assert.ok(row, "separation must not delete the report");
        assert.equal((row.data as Issue).cluster?.decidedBy, "moderator");

        // A separated report is excluded from future candidate searches.
        const later = makeIssue({ createdAt: T0 });
        const candidates = await findCandidates(asSql(sql), later);
        assert.ok(
          !candidates.some((c) => c.issue.id === second.id),
          "the moderator's decision is not quietly undone",
        );
      },
    );
  } finally {
    await close();
  }
});
