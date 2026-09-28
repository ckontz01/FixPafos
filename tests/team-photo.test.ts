import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import {
  checkPassword,
  hashPassword,
  sessionToken,
  isDepartment,
  sessionCookie,
} from "../src/lib/team";
import { normalizePhoto, reportInput } from "../src/lib/photos";
import { parseIssue, parseReply } from "../src/lib/validation";
test("department credentials are salted and sessions use protected cookies", async () => {
  const a = await hashPassword("test-password"),
    b = await hashPassword("test-password");
  assert.notEqual(a, b);
  assert.equal(await checkPassword("test-password", a), true);
  assert.equal(await checkPassword("wrong", a), false);
  assert.equal(await checkPassword("x".repeat(257), a), false);
  assert.equal(isDepartment("__proto__"), false);
  const request = new Request("https://fixpafos.vercel.app", {
    headers: { cookie: `other=x; pafos-team=${"a".repeat(64)}` },
  });
  assert.equal(sessionToken(request), "a".repeat(64));
  assert.match(
    sessionCookie(request, "x"),
    /HttpOnly; SameSite=Strict; Max-Age=28800; Secure/,
  );
});
test("public inputs cannot forge verified badges or resolution", () => {
  const reply = parseReply({
    author: "Citizen",
    message: "Fixed",
    verifiedDepartmentId: "technical",
    kind: "resolution",
  });
  assert.equal(reply?.verifiedDepartmentId, undefined);
  assert.equal(reply?.kind, undefined);
  const issue = parseIssue({
    author: "Citizen",
    message: "Road issue",
    category: "roads",
    location: { longitude: 32.42, latitude: 34.77, label: "Road" },
    status: "resolved",
    photo: { url: "https://evil.test" },
  });
  assert.equal(issue?.status, undefined);
  assert.equal(issue?.photo, undefined);
});
test("photos reject active content and strip metadata while resizing", async () => {
  await assert.rejects(
    normalizePhoto(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',
      ),
    ),
  );
  await assert.rejects(normalizePhoto(Buffer.from("not an image")));
  await assert.rejects(normalizePhoto(Buffer.alloc(4 * 1024 * 1024 + 1)));
  const original = await sharp({
    create: { width: 2000, height: 1500, channels: 3, background: "#777" },
  })
    .jpeg()
    .withExif({ IFD0: { Artist: "Sensitive name" } })
    .toBuffer();
  const output = await normalizePhoto(original),
    metadata = await sharp(output).metadata();
  assert.equal(metadata.format, "jpeg");
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.exif, undefined);
});
test("multipart preserves report data and checks real image bytes", async () => {
  const form = new FormData();
  form.append("report", JSON.stringify({ author: "Citizen" }));
  form.append("photo", new Blob(["fake"], { type: "image/jpeg" }), "photo.jpg");
  await assert.rejects(
    reportInput(
      new Request("http://localhost", { method: "POST", body: form }),
    ),
    /valid JPEG/,
  );
});
