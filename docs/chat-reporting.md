# Experimental reporting assistant

**Live:** https://fixpafos.vercel.app/report/chat

Choose **Report with AI** in the navigation or open the assistant from the
standard reporting form. The flow is available in Greek, English and Russian.

1. **Describe the problem.** Type a message or choose **Record voice**. DeepSeek
   asks short follow-up questions about what happened, when, and its impact.
   You can continue with the current draft without answering every question.
2. **Add a photo.** Choose **Open camera**, allow camera access, then **Take
   photo**. A rear-facing camera is preferred where available. You can also
   upload a JPEG, PNG or WebP up to 4 MB, replace the image, or skip the photo.
   Captured images are resized to at most 1600 pixels on their longest side.
3. **Choose the location.** Select **Use GPS** if you are at the issue, or
   **Choose on map** and tap the correct spot. Confirm the pin and enter a street
   or landmark. GPS accuracy is shown when available. Positions must be within
   the existing Pafos reporting area.
4. **Choose a public name.** A nickname is sufficient.
5. **Review and submit.** Correct the draft, name or landmark; change the photo
   or location if necessary. Only **Submit report** publishes or sends a report
   to moderation. A link opens the resulting report on the public map.

## Voice and permissions

Recording uses `getUserMedia` and `MediaRecorder`. Stop the recording to replay
it and edit its transcript before adding the text to your message. Recordings
stop after 90 seconds and media tracks are released when the control closes or
the page is left. Browser SpeechRecognition supplies the transcript; depending
on the browser, its speech service may process audio remotely. Automatic
transcription is not supported in every browser. If unavailable, replay the
recording and type the description, use keyboard dictation, or type directly.

DeepSeek receives only the text you choose to send; raw recordings are not
uploaded or stored by FixPafos. Camera, microphone and GPS permissions are
requested only after pressing the corresponding button. These features need
HTTPS (or localhost) and browser/device support. Denied permissions show an
explanation and an alternative way to proceed.

## AI and publication

The server endpoint `/api/report-chat` reuses `DEEPSEEK_API_KEY`,
`DEEPSEEK_BASE_URL` and `DEEPSEEK_MODEL` through the existing DeepSeek client.
It returns a validated follow-up and a draft of at most 500 characters. Requests
have bounded conversation size, same-origin protection, a provider timeout and
per-client minute/hour rate limits. No new provider, key or database is needed.

The assistant cannot access device permissions, invent a pin, authenticate a
department or publish a report. Images are attached locally during drafting;
the conversational model is not shown the image. The existing photo-review
model receives it after submission. The chat session and audio are held in page
memory, so leaving or reloading the page discards the unfinished conversation.
The assistant requires an internet connection and does not queue reports for
offline delivery. The standard form retains its existing offline queue.

Final submission uses the existing `/api/issues` endpoint with category
`unsure`. Text moderation, automatic classification, department assignment,
severity, duplicate detection and photo review remain unchanged. Safe photos
can be auto-approved; uncertain or unsuitable photos require moderator review.
Blocked text is quarantined, and service outages do not bypass moderation.
Reports are visible to everyone after publication. Suggested departments are
advisory and no authority is contacted automatically.

AI drafts can be wrong. Users see a labelled, editable draft and explicitly
confirm what will be public before submission.

## Verification

Run `npm test` for validation and model-output tests. With a local server on
port 3107, run `node scripts/verify-report-chat.mjs` for the browser journey.
`CHAT_VERIFY_URL` overrides the URL and `CHROME_PATH` overrides the installed
Chrome executable. The script uses simulated camera/microphone/GPS input,
intercepts report publication, and writes screenshots under
`outputs/chat-check/`. It does not publish test reports to the public map.
