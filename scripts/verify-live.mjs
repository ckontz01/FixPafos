import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import postgres from "postgres";
import { mkdir } from "node:fs/promises";
const base = process.env.TEST_BASE_URL || "http://localhost:3107";
// These assertions match English accessible names, so the interface
// language is pinned explicitly instead of being negotiated per machine.
const withLang = (url) => url + (url.includes("?") ? "&" : "?") + "lang=en";
if (!/^https?:\/\/(localhost:3107|fixpafos[^/]*\.vercel\.app)$/.test(base))
  throw new Error("Only FixPafos test targets are permitted");
const sql = postgres(process.env.DATABASE_URL, { ssl: "verify-full", max: 1 });
const author = `QA-${Date.now()}`;
const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const visitor = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage(),
  other = await visitor.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
async function api(path, data) {
  const res = await fetch(base + path, {
    method: data ? "POST" : "GET",
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
  });
  return {
    status: res.status,
    data: res.status === 204 ? null : await res.json(),
  };
}
try {
  await mkdir("outputs", { recursive: true });
  assert.equal((await api("/api/health")).status, 200);
  await page.goto(withLang(base));
  await page
    .getByRole("button", { name: "Report an issue", exact: true })
    .waitFor();
  await page.locator(".maplibregl-canvas").waitFor();
  await page
    .getByRole("button", { name: "Report an issue", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Use map centre", exact: true })
    .click();
  await page
    .getByLabel("Street or nearby landmark")
    .fill("Pafos town centre · verification");
  await page.getByLabel("Your name or nickname", { exact: true }).fill(author);
  await page
    .getByLabel("What is happening?")
    .fill(
      "A large pothole on the public road beside the pavement needs repair. Verification report; this entry will be removed after testing.",
    );
  const published = page.waitForResponse(
    (r) => r.url().endsWith("/api/issues") && r.request().method() === "POST",
    { timeout: 90000 },
  );
  await page
    .getByRole("button", { name: "Publish report", exact: true })
    .click();
  const publication = await published,
    result = await publication.json();
  assert.equal(publication.status(), 201, JSON.stringify(result));
  const id = result.post.id;
  assert.equal(result.post.assignment.source, "deepseek");
  assert.equal(result.post.assignment.departmentId, "technical");
  await page
    .getByText("Suggested responsible service", { exact: true })
    .waitFor();
  await page.screenshot({ path: "outputs/desktop-report.png", fullPage: true });
  await other.goto(withLang(base));
  await other
    .getByRole("button", { name: /Roads & pavements: A large pothole/ })
    .first()
    .waitFor();
  assert.ok((await api("/api/issues")).data.posts.some((p) => p.id === id));
  assert.ok(
    await other
      .getByRole("button", { name: /Roads & pavements: A large pothole/ })
      .count(),
  );
  console.log(
    "PASS real browser report → DeepSeek moderation → Technical Services assignment → shared database → second visitor map pin",
  );
  const vote1 = await api(`/api/issues/${id}/second`, {
    voterId: "pafoslive-test-voter",
    seconded: true,
  });
  const vote2 = await api(`/api/issues/${id}/second`, {
    voterId: "pafoslive-test-voter",
    seconded: true,
  });
  assert.equal(vote1.data.seconds, 1);
  assert.equal(vote2.data.seconds, 1);
  assert.equal(
    (
      await api(`/api/issues/${id}/second`, {
        voterId: "pafoslive-test-voter",
        seconded: false,
      })
    ).data.seconds,
    0,
  );
  console.log("PASS shared, duplicate-safe support votes");
  const reply = await api(`/api/issues/${id}/replies`, {
    author,
    message: "The broken road surface is next to the pedestrian crossing.",
  });
  assert.equal(reply.status, 201, JSON.stringify(reply));
  const blocked = await api(`/api/issues/${id}/replies`, {
    author,
    message: "This fucking pothole.",
  });
  assert.equal(blocked.status, 422);
  const noAuth = await api("/api/moderation", {
    password: "wrong-test-password",
  });
  assert.equal(noAuth.status, 401);
  const quarantine = await api("/api/moderation", {
    password: process.env.FEEDBACK_ADMIN_PASSWORD,
  });
  assert.equal(quarantine.status, 200);
  const item = quarantine.data.items.find(
    (i) => i.submission.author === author,
  );
  assert.ok(item);
  const boardBefore = await api("/api/issues");
  assert.equal(
    boardBefore.data.posts.find((p) => p.id === id).replies.length,
    1,
  );
  const release = await api("/api/moderation", {
    password: process.env.FEEDBACK_ADMIN_PASSWORD,
    action: "publish",
    id: item.id,
  });
  assert.equal(release.data.status, "published");
  assert.equal(
    (await api("/api/issues")).data.posts.find((p) => p.id === id).replies
      .length,
    2,
  );
  console.log(
    "PASS moderated replies, private quarantine, rejected moderator login and authenticated publication",
  );
  const invalid = await api("/api/issues", {
    author,
    message: "Invalid location",
    category: "roads",
    location: { label: "Nicosia", longitude: 33.36, latitude: 35.17 },
  });
  assert.equal(invalid.status, 400);
  const crossOrigin = await fetch(base + "/api/issues", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://unrelated.example",
    },
    body: "{}",
  });
  assert.equal(crossOrigin.status, 403);
  for (const width of [320, 375, 414, 768]) {
    await other.setViewportSize({ width, height: 900 });
    await other.screenshot({
      path: `outputs/mobile-${width}.png`,
      fullPage: true,
    });
    assert.ok(
      await other.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Overflow at ${width}`,
    );
  }
  console.log(
    "PASS responsive viewports 320 / 375 / 414 / 768 without horizontal overflow",
  );
  await other.setViewportSize({ width: 1440, height: 1000 });
  await other.getByLabel("Filter issue type").selectOption("water");
  assert.equal(await other.locator(".issue-pin").count(), 0);
  await other.getByLabel("Filter issue type").selectOption("all");
  await other.getByLabel("Search reports").fill("impossible-search-phrase");
  assert.equal(await other.locator(".issue-pin").count(), 0);
  assert.deepEqual(errors, []);
  // Flagging requests review; it does not delete. One person cannot remove
  // another citizen's report, so a single flag must leave it published.
  const firstFlag = await api(`/api/issues/${id}/flag`, {
    reason: "spam",
    voterId: "verify-voter-one",
  });
  assert.ok([200, 201].includes(firstFlag.status), JSON.stringify(firstFlag));
  assert.equal(firstFlag.data.hidden, false);
  assert.ok(
    (await api("/api/issues")).data.posts.some((p) => p.id === id),
    "one flag must not withdraw a report",
  );

  // The same person flagging repeatedly must not reach the threshold alone.
  const repeat = await api(`/api/issues/${id}/flag`, {
    reason: "spam",
    voterId: "verify-voter-one",
  });
  assert.equal(repeat.data.flagCount, 1);
  assert.equal(repeat.data.alreadyFlagged, true);

  // Enough distinct people hides it for review; the report itself survives.
  let hidden = false;
  for (let i = 2; i <= 6 && !hidden; i += 1) {
    const flag = await api(`/api/issues/${id}/flag`, {
      reason: "offensive",
      voterId: `verify-voter-${i}`,
    });
    hidden = Boolean(flag.data.hidden);
  }
  assert.ok(hidden, "distinct flags should withdraw the report for review");
  assert.ok(!(await api("/api/issues")).data.posts.some((p) => p.id === id));
  const [retained] = await sql`SELECT hidden_at FROM pafos_issues WHERE id=${id}`;
  assert.ok(retained, "a flagged report must be hidden, never deleted");
  assert.ok(Number(retained.hidden_at) > 0);

  console.log(
    "PASS matching map/list filters, flag review without deletion, no browser runtime errors",
  );
} finally {
  await browser.close();
  await sql`DELETE FROM pafos_flags WHERE issue_id IN (SELECT id FROM pafos_issues WHERE data->>'author'=${author})`;
  await sql`DELETE FROM pafos_issues WHERE data->>'author'=${author}`;
  await sql`DELETE FROM pafos_quarantine WHERE submission->>'author'=${author}`;
  await sql.end();
  console.log("Temporary verification reports and quarantine entries removed.");
}
