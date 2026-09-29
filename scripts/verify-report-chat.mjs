import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";

// Browser permissions use Chromium's fake devices. Publication is intercepted,
// so this check never adds a public report or uploads a photo to hosted storage.
const base = process.env.CHAT_VERIFY_URL ?? "http://localhost:3107";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH ??
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: [
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
  ],
});
await mkdir("outputs/chat-check", { recursive: true });
const errors = [];
let submissions = 0,
  submitted;
async function context(locale = "en", width = 1280) {
  const ctx = await browser.newContext({
    viewport: { width, height: 960 },
    locale,
    geolocation: { latitude: 34.772, longitude: 32.4245, accuracy: 12 },
    permissions: ["geolocation", "camera", "microphone"],
    serviceWorkers: "block",
  });
  await ctx.addCookies([{ name: "pafos-locale", value: locale, url: base }]);
  await ctx.route("**/api/issues", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    submissions++;
    const form = await new Response(route.request().postDataBuffer(), {
      headers: { "content-type": route.request().headers()["content-type"] },
    }).formData();
    submitted = {
      report: JSON.parse(form.get("report")),
      photo: form.get("photo"),
    };
    await route.fulfill({
      status: 201,
      json: { post: { id: "browser-check-only" } },
    });
  });
  await ctx.route("**/api/report-chat", async (route) => {
    const input = route.request().postDataJSON();
    const ready = input.messages.length >= 3;
    await route.fulfill({
      json: {
        reply: ready
          ? "Your description is ready. Let’s add a photo next."
          : "When did you notice the damage, and who is affected?",
        summary:
          "A broken pavement blocks wheelchair access. It was noticed yesterday and affects pedestrians.",
        ready,
      },
    });
  });
  const page = await ctx.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().includes("Failed to load resource")
    )
      errors.push(message.text());
  });
  return { ctx, page };
}
async function overflow(page) {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "page must not overflow horizontally",
  );
}
try {
  const { ctx, page } = await context();
  await page.addInitScript(() => {
    class Speech {
      start() {
        this.timer = setTimeout(
          () =>
            this.onresult?.({
              results: [
                {
                  0: {
                    transcript: "A broken pavement blocks wheelchair access.",
                  },
                  isFinal: true,
                },
              ],
            }),
          150,
        );
      }
      stop() {
        clearTimeout(this.timer);
        this.onend?.();
      }
      abort() {
        clearTimeout(this.timer);
      }
    }
    window.SpeechRecognition = Speech;
    window.__media = [];
    const original = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await original(constraints);
      window.__media.push(stream);
      return stream;
    };
  });
  await page.goto(`${base}/report/chat`);
  await page
    .getByRole("heading", { name: "Let’s report it, together." })
    .waitFor();
  await page.screenshot({ caret: "initial",
    path: "outputs/chat-check/desktop-start.png",
    fullPage: true,
  });
  assert.equal(
    await page
      .getByRole("button", { name: "Open camera", exact: true })
      .count(),
    0,
  );
  await page.getByRole("button", { name: "Record voice", exact: true }).click();
  await page.waitForFunction(() =>
    document
      .querySelector(".chat-voice textarea")
      ?.value.includes("wheelchair"),
  );
  await page.waitForTimeout(1100);
  await page
    .getByRole("button", { name: "Stop recording", exact: true })
    .click();
  await page.locator("audio").waitFor();
  await page
    .getByRole("button", { name: "Use this text", exact: true })
    .click();
  assert.match(
    await page.getByLabel("Your message", { exact: true }).inputValue(),
    /wheelchair/,
  );
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await page
    .getByText("When did you notice the damage, and who is affected?", {
      exact: true,
    })
    .waitFor();
  await page
    .getByLabel("Your message", { exact: true })
    .fill("Yesterday. It blocks the pavement for pedestrians and wheelchairs.");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await page.getByRole("button", { name: "Open camera", exact: true }).click();
  await page.getByRole("button", { name: "Take photo", exact: true }).click();
  await page
    .getByRole("button", { name: "Use this photo", exact: true })
    .click();
  await page.getByRole("button", { name: "Use GPS", exact: true }).click();
  await page.getByText(/Selected coordinates: 34.77200, 32.42450/).waitFor();
  assert.equal(
    submissions,
    0,
    "no report is sent before explicit final submission",
  );
  await page
    .getByLabel("Street or nearby landmark", { exact: true })
    .fill("Pafos town centre");
  await page
    .getByRole("button", { name: "Use map centre", exact: true })
    .waitFor();
  await page.waitForFunction(
    () => !document.querySelector(".chat-location-map .map-notice"),
  );
  await page.screenshot({ caret: "initial",
    path: "outputs/chat-check/location.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Confirm this location", exact: true })
    .click();
  await page
    .getByLabel("Public display name", { exact: true })
    .fill("Resident");
  await page
    .getByRole("button", { name: "Review my report", exact: true })
    .click();
  await page
    .getByLabel("Report description", { exact: true })
    .fill(
      "A broken pavement blocks wheelchair access near the town centre. Seen yesterday.",
    );
  await page.screenshot({ caret: "initial",
    path: "outputs/chat-check/review.png",
    fullPage: true,
  });
  for (const width of [320, 375, 414, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await overflow(page);
  }
  await page.setViewportSize({ width: 375, height: 900 });
  await page.screenshot({ caret: "initial",
    path: "outputs/chat-check/mobile-review.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Submit report", exact: true })
    .click();
  await page
    .getByRole("link", { name: "View my report", exact: true })
    .waitFor();
  assert.equal(submissions, 1);
  assert.equal(submitted.report.category, "unsure");
  assert.equal(submitted.report.location.longitude, 32.4245);
  assert.equal(submitted.report.author, "Resident");
  assert.match(submitted.report.message, /Seen yesterday/);
  assert.equal(submitted.photo.type, "image/jpeg");
  assert.ok(submitted.photo.size > 100);
  assert.ok(
    await page.evaluate(() =>
      window.__media.every((stream) =>
        stream.getTracks().every((track) => track.readyState === "ended"),
      ),
    ),
    "all media tracks released",
  );
  await ctx.close();

  const failure = await context();
  await failure.page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException("Denied", "NotAllowedError");
    };
    navigator.geolocation.getCurrentPosition = (_ok, fail) => fail({ code: 1 });
  });
  await failure.ctx.route("**/api/report-chat", (route) =>
    route.fulfill({ status: 503, json: { code: "error.unavailable" } }),
  );
  await failure.page.goto(`${base}/report/chat`);
  await failure.page
    .getByRole("button", { name: "Record voice", exact: true })
    .click();
  await failure.page.getByText(/The microphone could not start/).waitFor();
  await failure.page
    .getByLabel("Your message", { exact: true })
    .fill("A damaged park bench needs repair.");
  await failure.page
    .getByRole("button", { name: "Send message", exact: true })
    .click();
  await failure.page
    .getByRole("button", { name: "Try again", exact: true })
    .waitFor();
  await failure.page
    .getByRole("button", { name: "Continue with my own words", exact: true })
    .click();
  await failure.page
    .getByRole("button", { name: "Open camera", exact: true })
    .click();
  await failure.page.getByText(/The camera could not open/).waitFor();
  await failure.page
    .getByRole("button", { name: "Continue without a photo", exact: true })
    .click();
  await failure.page
    .getByRole("button", { name: "Use GPS", exact: true })
    .click();
  await failure.page.getByText(/Location could not be found/).waitFor();
  assert.ok(
    await failure.page
      .getByRole("button", { name: "Confirm this location", exact: true })
      .isDisabled(),
  );
  await failure.page
    .getByRole("button", { name: "Use map centre", exact: true })
    .click();
  await failure.page
    .getByLabel("Street or nearby landmark", { exact: true })
    .fill("Pafos park");
  await failure.page
    .getByRole("button", { name: "Confirm this location", exact: true })
    .click();
  await failure.page
    .getByLabel("Public display name", { exact: true })
    .fill("Resident");
  await failure.page
    .getByRole("button", { name: "Review my report", exact: true })
    .click();
  await failure.ctx.route("**/api/issues", (route) =>
    route.fulfill({ status: 422, json: { code: "error.moderationBlocked" } }),
  );
  await failure.page
    .getByRole("button", { name: "Submit report", exact: true })
    .click();
  await failure.page
    .getByRole("heading", {
      name: "Your report was saved for moderator review and has not been published.",
    })
    .waitFor();
  assert.equal(
    await failure.page.getByRole("link", { name: "View my report" }).count(),
    0,
  );
  await failure.ctx.close();

  for (const locale of ["el", "ru"]) {
    const mobile = await context(locale, 375);
    await mobile.page.goto(`${base}/report/chat`);
    await mobile.page.locator(".chat-composer textarea").waitFor();
    await overflow(mobile.page);
    await mobile.page.screenshot({ caret: "initial",
      path: `outputs/chat-check/${locale}-mobile.png`,
      fullPage: true,
    });
    await mobile.page.goto(base);
    await mobile.page.locator('a[href="/report/chat"]').first().waitFor();
    await overflow(mobile.page);
    await mobile.ctx.close();
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: voice recording/playback/transcript, camera capture, GPS and map fallback, AI follow-up/failure, review/edit, multipart submission, quarantine, media cleanup, 4 mobile widths and 3 languages.",
  );
} finally {
  await browser.close();
}
