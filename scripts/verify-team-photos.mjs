import { chromium } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import postgres from "postgres";
import sharp from "sharp";
import { del } from "@vercel/blob";
const base = process.env.TEST_BASE_URL || "http://localhost:3107";
// These assertions match English accessible names, so the interface
// language is pinned explicitly instead of being negotiated per machine.
const withLang = (url) => url + (url.includes("?") ? "&" : "?") + "lang=en";
if (!/^https?:\/\/(localhost:3107|pafoslive[^/]*\.vercel\.app)$/.test(base))
  throw new Error("PafosLive only");
const credentials = await readFile("docs/team-access.private.txt", "utf8");
const passwordFor = (id) =>
  credentials.match(
    new RegExp(`Department ID: ${id}\\r?\\nPassword: ([^\\r\\n]+)`),
  )[1];
const sql = postgres(process.env.DATABASE_URL, { ssl: "verify-full", max: 1 });
const author = `QA-photo-${Date.now()}`;
const browser = await chromium.launch({
  channel: "msedge",
  headless: true,
  args: ["--enable-unsafe-swiftshader"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1050 },
});
const visitor = await browser.newContext({
  viewport: { width: 375, height: 850 },
});
const wrongTeam = await browser.newContext();
const page = await context.newPage(),
  other = await visitor.newPage();
page.setDefaultTimeout(20000);
other.setDefaultTimeout(20000);
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
let issueId;
async function api(ctx, path, data) {
  const res = data
    ? await ctx.request.post(base + path, { data })
    : await ctx.request.get(base + path);
  return { status: res.status(), data: await res.json() };
}
try {
  await mkdir("outputs", { recursive: true });
  await sharp({
    create: { width: 800, height: 600, channels: 3, background: "#8b9293" },
  })
    .jpeg()
    .toFile("outputs/qa-photo.jpg");
  await page.goto(withLang(base));
  await page
    .getByRole("button", { name: "Report an issue", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Use map centre", exact: true })
    .click();
  await page.getByLabel("Street or nearby landmark").fill(author);
  await page.getByLabel("Your name or nickname", { exact: true }).fill(author);
  await page
    .getByLabel("What is happening?")
    .fill(
      "A pothole on a municipal road needs repair. Temporary verification report, removed after testing.",
    );
  await page
    .getByLabel("Photo (optional)")
    .setInputFiles("outputs/qa-photo.jpg");
  await page.getByAltText("Selected photo preview").waitFor();
  const response = page.waitForResponse(
    (r) => r.url().endsWith("/api/issues") && r.request().method() === "POST",
    { timeout: 150000 },
  );
  await page
    .getByRole("button", { name: "Publish report", exact: true })
    .click();
  const publication = await response,
    result = await publication.json();
  assert.equal(publication.status(), 201, JSON.stringify(result));
  issueId = result.post.id;
  assert.equal(result.post.assignment.departmentId, "technical");
  assert.equal(result.post.photo.status, "pending");
  assert.equal(
    (await visitor.request.get(`${base}/api/photos/${issueId}`)).status(),
    404,
  );
  const [stored] =
    await sql`SELECT blob_path,ai_review FROM pafos_photos WHERE issue_id=${issueId}`;
  assert.ok(stored.blob_path);
  assert.equal(stored.ai_review.source, "deepseek");
  assert.equal(stored.ai_review.autoApproved, false);
  console.log(
    "PASS browser upload → DeepSeek routing and vision → unclear photo stays private for moderation",
  );
  assert.equal(
    (
      await api(visitor, `/api/issues/${issueId}/team`, {
        action: "resolve",
        message: "Fixed",
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await api(wrongTeam, "/api/team/session", {
        departmentId: "water",
        password: passwordFor("water"),
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await api(wrongTeam, `/api/issues/${issueId}/team`, {
        action: "reply",
        message: "Fixed",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await api(wrongTeam, `/api/issues/${issueId}/team`, {
        action: "resolve",
        message: "Fixed",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await api(visitor, "/api/team/session", {
        departmentId: "technical",
        password: "incorrect-password",
      })
    ).status,
    401,
  );
  const forged = await api(visitor, `/api/issues/${issueId}/replies`, {
    author,
    message: "Thanks for reporting this pothole.",
    verifiedDepartmentId: "technical",
    kind: "resolution",
  });
  assert.equal(forged.status, 201);
  assert.equal(forged.data.reply.verifiedDepartmentId, undefined);
  console.log(
    "PASS anonymous/wrong-team resolution denied; public replies cannot forge badges",
  );
  await page.locator(".team-panel summary").click();
  await page
    .getByLabel("Department password", { exact: true })
    .fill(passwordFor("technical"));
  await page.getByRole("button", { name: "Verify team", exact: true }).click();
  await page
    .getByText("Department password verified", { exact: true })
    .waitFor();
  const cookie = (await context.cookies()).find((c) => c.name === "pafos-team");
  assert.ok(cookie.httpOnly);
  assert.equal(cookie.sameSite, "Strict");
  const blocked = await api(context, `/api/issues/${issueId}/team`, {
    action: "resolve",
    message: "fuck this",
  });
  assert.equal(blocked.status, 422);
  assert.notEqual(
    (await api(visitor, "/api/issues")).data.posts.find((p) => p.id === issueId)
      .status,
    "resolved",
  );
  await page
    .getByLabel("Official update")
    .fill("Our technical team has scheduled the road repair for inspection.");
  const replied = page.waitForResponse(
    (r) => r.url().endsWith(`/${issueId}/team`),
    { timeout: 60000 },
  );
  await page
    .getByRole("button", { name: "Post verified reply", exact: true })
    .click();
  assert.equal((await replied).status(), 201);
  await page
    .getByRole("status")
    .filter({ hasText: "Verified reply published" })
    .waitFor();
  await page
    .getByLabel("Official update")
    .fill(
      "Our team repaired the pothole and checked the road surface. This issue is resolved.",
    );
  const resolved = page.waitForResponse(
    (r) => r.url().endsWith(`/${issueId}/team`),
    { timeout: 60000 },
  );
  await page
    .getByRole("button", { name: "Mark resolved", exact: true })
    .click();
  assert.equal((await resolved).status(), 201);
  console.log(
    "PASS team reply moderation; resolution and verified reply saved together",
  );
  await other.goto(withLang(`${base}/?issue=${issueId}`));
  await other.locator(".status-badge.resolved").waitFor();
  await other.locator(".issue-pin.resolved").filter({ hasText: author }).waitFor();
  assert.ok(
    await other.getByText("Verified team · Resolved", { exact: true }).count(),
  );
  // An image cannot be exposed by an unauthenticated moderation call.
  assert.equal(
    (
      await api(visitor, "/api/moderation/photos", {
        action: "approve",
        id: issueId,
        password: "wrong",
      })
    ).status,
    401,
  );
  await page.goto(withLang(base + "/moderation"));
  await page
    .getByLabel("Moderation password")
    .fill(process.env.FEEDBACK_ADMIN_PASSWORD);
  await page
    .getByRole("button", { name: "Open quarantine", exact: true })
    .click();
  const card = page
    .locator(".photo-review .quarantine-item")
    .filter({ hasText: author });
  await card.getByRole("button", { name: "View private photo" }).click();
  await card.getByAltText("Photo awaiting moderation").waitFor();
  await card
    .getByRole("button", { name: "Approve photo", exact: true })
    .click();
  await card.getByText("Photo · approved", { exact: true }).waitFor();
  await other.reload();
  const photo = other.getByAltText(`Reported issue at ${author}`);
  await photo.waitFor();
  await photo.evaluate((img) => img.decode());
  const visible = await visitor.request.get(`${base}/api/photos/${issueId}`);
  assert.equal(visible.status(), 200);
  assert.match(visible.headers()["content-type"], /image\/jpeg/);
  await other.screenshot({
    path: "outputs/mobile-resolved-photo.png",
    fullPage: true,
  });
  for (const width of [320, 375, 768, 1440]) {
    await other.setViewportSize({ width, height: 1000 });
    assert.equal(
      await other.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
  }
  await other.screenshot({
    path: "outputs/desktop-resolved-photo.png",
    fullPage: true,
  });
  console.log(
    "PASS moderator private preview → approval → photo visible to another visitor; resolved map badge; no overflow at four widths",
  );
  await card.getByRole("button", { name: "Reject photo", exact: true }).click();
  await card.getByText("Photo · rejected", { exact: true }).waitFor();
  assert.equal(
    (await visitor.request.get(`${base}/api/photos/${issueId}`)).status(),
    404,
  );
  const expiredHash = createHash("sha256").update(cookie.value).digest("hex");
  await sql`UPDATE pafos_team_sessions SET expires_at=0 WHERE token_hash=${expiredHash}`;
  assert.equal(
    (
      await api(context, `/api/issues/${issueId}/team`, {
        action: "reply",
        message: "Update",
      })
    ).status,
    401,
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS rejected photos become private; expired sessions denied; no browser runtime errors",
  );
} catch (error) {
  await page.screenshot({
    path: "outputs/team-flow-failure.png",
    fullPage: true,
  });
  console.log(
    "Browser validation:",
    await page
      .locator("input,textarea,select")
      .evaluateAll((elements) =>
        elements
          .filter((el) => el.willValidate && !el.validity.valid)
          .map((el) => ({ type: el.type, reason: el.validationMessage })),
      ),
  );
  throw error;
} finally {
  const photos =
    await sql`SELECT blob_path FROM pafos_photos WHERE issue_id IN (SELECT id FROM pafos_issues WHERE data->>'author'=${author})`;
  for (const photo of photos) await del(photo.blob_path);
  await sql`DELETE FROM pafos_photos WHERE issue_id IN (SELECT id FROM pafos_issues WHERE data->>'author'=${author})`;
  await sql`DELETE FROM pafos_quarantine WHERE submission->>'author'=${author} OR parent_post_id IN (SELECT id FROM pafos_issues WHERE data->>'author'=${author})`;
  await sql`DELETE FROM pafos_issues WHERE data->>'author'=${author}`;
  for (const ctx of [context, wrongTeam])
    for (const cookie of await ctx.cookies())
      if (cookie.name === "pafos-team") {
        const hash = createHash("sha256").update(cookie.value).digest("hex");
        await sql`DELETE FROM pafos_team_sessions WHERE token_hash=${hash}`;
      }
  await sql.end();
  await browser.close();
  console.log("Removed this run’s QA reports, photos and sessions only.");
}
