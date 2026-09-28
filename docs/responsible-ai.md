# FixPafos responsible AI, privacy and security

This document records the safeguards actually implemented in this codebase, and
separates them from the questions that need a qualified legal or municipal
review. It deliberately does **not** claim compliance with the GDPR or the EU AI
Act. Compliance is a legal determination about a deployed system in a specific
organisational context; this is a student project, and the honest statement is
what was built and what remains open.

## Declaration of AI use in building this project

Development and documentation used AI assistance (Claude and OpenAI Codex).
The supplied FixPafos logo was AI-generated and is displayed without alteration. The platform calls DeepSeek models at runtime. The project team is responsible
for reviewing the final code, evaluation labels, and competition submission
materials before entry; AI-generated text should not be submitted unchecked.

## Where AI makes a decision, and what bounds it

| Decision | Automated? | Bound |
|---|---|---|
| Publish or block text | Yes, blocks | Fails closed on provider error; blocked items go to a human queue, never silently dropped |
| Publish a photo | Only auto-**approves** | Anything uncertain, irrelevant, unsafe or privacy-sensitive stays private for a human; timeouts and malformed output also fail to the queue |
| Which service is responsible | Suggestion only | Low confidence is forced to `review`; the department confirms; nothing is dispatched |
| Issue category | Yes, sets it | Rejected unless it is one of eight fixed identifiers |
| Severity | Advisory only | Must cite at least one factor from a closed list or it is rejected; the response window is a fixed policy mapping, not a model output |
| Duplicate link | Only when confident **and** close | Everything else is suggested and waits for a moderator, who can also separate a wrong link |

**No automated decision produces a legal or official effect.** The platform
suggests; the municipality decides. Every AI-derived value shown to a citizen is
labelled as an estimate, with its reasoning visible.

## Human oversight

- A moderation queue for blocked text, with release.
- A photo queue, where an auto-approval can still be overridden.
- A flag queue: reports are hidden pending review, never deleted by the public.
- A duplicate queue, showing both reports, the reason and the distance.
- Low confidence anywhere routes to human review rather than to a department.

## Transparency

- Reports classified automatically say so.
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
| Report text sent to the model provider is the public report itself | All model calls |

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
4. **Processor agreements.** Sending report text to a model provider is a
   processing activity requiring an appropriate agreement and a transfer
   assessment.
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
