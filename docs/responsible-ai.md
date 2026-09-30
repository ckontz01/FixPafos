# FixPafos responsible AI, privacy and security

This document records the safeguards actually implemented in this codebase, and
separates them from the questions that need a qualified legal or municipal
review. It deliberately does **not** claim compliance with the GDPR or the EU AI
Act. Compliance is a legal determination about a deployed system in a specific
organisational context; this is a student project, and the honest statement is
what was built and what remains open.

## How we used AI

We used AI assistance (Claude and OpenAI Codex) for development and
documentation. Our supplied FixPafos logo was AI-generated and is displayed
without alteration. At runtime, we use DeepSeek for experimental conversational
report drafting, text moderation, photo review, classification, routing,
severity and duplicate assessment. We are responsible for the final code,
evaluation labels and submission materials.

## Where AI makes a decision, and what bounds it

| Decision | Automated? | Bound |
|---|---|---|
| Ask follow-ups and prepare a report draft | Suggestion only, experimental | Text-only structured output; draft capped at 500 characters; citizen reviews and edits; only an explicit submission enters the publication pipeline |
| Publish or block text | Yes, blocks | Fails closed on provider error; blocked items go to a human queue, never silently dropped |
| Publish a photo | Only auto-**approves** | Anything uncertain, irrelevant, unsafe or privacy-sensitive stays private for a human; timeouts and malformed output also fail to the queue |
| Which service is responsible | Suggestion only | Low confidence is forced to `review`; the department confirms; nothing is dispatched |
| Issue category | Yes, sets it | Rejected unless it is one of eight fixed identifiers |
| Severity | Advisory only | Must cite at least one factor from a closed list or it is rejected; the response window is a fixed policy mapping, not a model output |
| Duplicate link | Only with high model confidence and a strong combined score | Eligible ambiguous matches wait for a moderator; independent reports stay separate and a moderator can undo a wrong link |

**No automated decision produces a legal or official effect.** The platform
suggests; the municipality decides. Every AI-derived value shown to a citizen is
labelled as an estimate, with its reasoning visible.

## Human oversight

- A moderation queue for blocked text, with release.
- A photo queue, where an auto-approval can still be overridden.
- A flag queue: reports are hidden pending review, never deleted by the public.
- A duplicate queue, showing both reports, the reason and the distance.
- Low-confidence responsibility and severity assessments are marked for human
  review.
- The chat assistant's draft is editable, and the citizen approves what will be
  public before submitting through the usual moderation pipeline.

## Transparency

- Reports classified automatically say so.
- The conversational assistant is labelled experimental and its description is
  labelled as an editable AI draft. It explains voice-transcription limits and
  that the conversation needs a connection and is discarded on reload.
- Severity shows its level, the factors behind it, the suggested window, and a
  statement that it is not a municipal decision.
- Clustered reports explain why they were linked and how far apart they are.
- A fallback classification is labelled as a fallback and never as a model
  result.
- The insights dashboard states that seeded demonstration data is demonstration
  data, and counts it separately.

## Data protection measures implemented

| Measure | Where |
|---|---|
| Photos re-encoded pixel-only, removing EXIF/GPS, filenames and active content | `lib/photos.ts` |
| Photo storage private; permission re-checked on every request; `no-store` | `api/photos/[id]` |
| No account, no email, no phone number collected | Report form |
| Support votes keyed by a pseudonymous browser-local identifier, not a person | `board.tsx`, `pafos_votes` |
| Locale cookie carries a display preference only | `proxy.ts` |
| Citizens warned in the form not to include personal details | `report.privacyNote` |
| Moderation blocks `personal_information` as a category | `lib/feedback-moderation.ts` |
| Vision review flags faces, plates and documents for human review | `lib/photo-review.ts` |
| Bulk export requires the moderation password | `api/export` |
| Final report/reply text and related context are sent to DeepSeek for moderation and assessment; the experimental chat also sends unpublished drafting text when the citizen sends a message | Existing model calls and `api/report-chat` |
| Raw chat recordings remain in page memory and are not uploaded by FixPafos; users review the browser-generated transcript before sending text | Chat voice control |
| Camera, microphone and GPS access require a button press; device access and publication are controlled by the UI, not by the model | Experimental chat controls |

The experimental assistant adds a private drafting stage before publication.
DeepSeek receives the text the citizen chooses to send, including messages that
may never become a public report. The conversation and unfinished draft are
held in page memory rather than a chat database, and are lost when the page is
reloaded or left. This describes FixPafos storage; it does not establish a model
provider's retention policy.

Voice recording uses browser `MediaRecorder` for playback and browser
`SpeechRecognition` for an editable transcript where supported. The browser's
speech service may process audio remotely. FixPafos does not upload the raw
recording to DeepSeek. The chat model receives sent text and does not see a
locally attached photo; the existing photo-review pipeline receives the photo
only after the citizen submits. The assistant cannot infer a GPS pin, operate
devices, authenticate a department or publish without the citizen's action.

The private competition submission includes temporary judge access credentials.
Those credentials will be rotated or replaced before any official production
deployment; department and moderator access must then be issued only to
authorized staff. The public repository and public manual do not contain
working passwords.

## Prompt injection

Report text is untrusted input. Every system prompt states this; every model
output is validated against a closed schema before use; the duplicate
adjudicator may only reference a candidate it was shown; and the evaluation
dataset contains explicit injection and adversarial-urgency cases so the
behaviour is measured rather than assumed.

## Measurement

Claims about accuracy are checkable: `evaluation/` holds 120 labelled cases and
a runner that executes the shipped classifier and reports accuracy, per-class
F1, a confusion matrix, calibration, missed escalations and critical
under-calls. No result is committed; a figure only exists if someone ran it.

That dataset evaluates report category, department and severity, not the
experimental assistant's follow-up questions or draft quality. Chat tests cover
request/output validation and provider failures; browser checks use simulated
camera, microphone and GPS input and intercept publication. A conversational
quality evaluation and broader testing on real devices remain separate work.

## Open items requiring qualified review

These are genuinely unresolved and should not be presented as solved:

1. **Controller and legal basis.** If the municipality deployed this, it would
   be the data controller and would need a lawful basis and a privacy notice.
2. **Retention.** There is currently no retention or deletion schedule. Reports
   persist indefinitely. A real deployment needs a defined period and a
   mechanism for a person to request removal of their own report.
3. **AI Act classification.** Whether a civic triage aid of this kind falls
   inside a regulated category, and what transparency obligations attach, is a
   legal question. The design keeps every decision advisory and human-reviewable
   specifically to stay away from consequential automated decision-making, but
   that is a design intent, not a legal conclusion.
4. **Processor agreements.** Sending reports and unpublished drafting messages
   to a model provider is a processing activity requiring an appropriate
   agreement and a transfer assessment. Browser speech-service processing also
   needs consideration for an official deployment.
5. **Public names.** Reports display the name a citizen chooses. Free-text
   pseudonyms are moderated, but a person may still identify themselves.
6. **Photographs of people.** Vision review flags visible personal information,
   but it is a model and will miss cases; the human queue is the real control.
7. **Accessibility conformance.** Semantic markup, keyboard focus, contrast,
   labels, a table view behind every chart and a text alternative to the map are
   implemented, but no formal WCAG 2.2 AA audit has been carried out.
8. **Bias.** Routing accuracy is measured by language, and the dataset covers
   Greek, Greeklish, English, Russian and mixed text. Systematic differences in
   who reports what, and whose reports get resolved, would need monitoring on
   real data.

## What the system will not do

- It will not email, dispatch or notify an authority automatically.
- It will not publish a report it could not moderate.
- It will not publish a photo it could not check.
- It will not delete a citizen's report on another citizen's say-so.
- It will not present a model estimate as a municipal decision.
