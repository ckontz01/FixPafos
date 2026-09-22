# PafosLive

A map-first civic reporting platform for Pafos, Cyprus. Citizens report everyday
municipal problems in **Greek, English or Russian**; the platform moderates the
submission, classifies it, suggests the responsible service, estimates how
urgent it is, detects when several people are reporting the same physical issue,
and publishes it to a shared public map. Municipal staff reply with a verified
badge, mark issues resolved, and read an operational dashboard.

It is an independent community platform. It suggests a responsible service; it
does not dispatch work and never transmits anything to an authority
automatically.

- **Architecture and report lifecycle:** [`docs/architecture.md`](docs/architecture.md)
- **Responsible AI, privacy and security:** [`docs/responsible-ai.md`](docs/responsible-ai.md)
- **AI evaluation:** [`evaluation/README.md`](evaluation/README.md)
- **Interface design system:** [`design.md`](design.md)

## Running it

Requires Node.js 24.

```bash
npm ci

# Option A: a local database, no hosted instance needed.
npm run dev:db                      # starts Postgres (PGlite) on 127.0.0.1:5433
cp .env.example .env.local          # set DATABASE_URL to the printed value
npm run seed:demo                   # realistic Pafos sample data
npm run dev                         # http://localhost:3107

# Option B: a provisioned Postgres.
npm run db:migrate
npm run dev
```

The development database serves **one connection at a time**, so run the seed
before starting the dev server rather than alongside it.

Before deploying: `npm test`, `npm run lint`, `npm run build`.

### Environment

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `DEEPSEEK_API_KEY` | yes | Moderation, classification, vision, duplicate adjudication |
| `FEEDBACK_ADMIN_PASSWORD` | yes | Moderation queues and export |
| `BLOB_READ_WRITE_TOKEN` | for photos | Private Vercel Blob store |
| `DEMO_MODE` | no | Demonstration only; see below |
| `DUPLICATE_RADIUS_METRES` | no | Default 100 |
| `DUPLICATE_WINDOW_DAYS` | no | Default 120 |
| `FLAG_HIDE_THRESHOLD` | no | Distinct flags before a report is hidden; default 3 |

## What the AI does

Six model-assisted steps, each with validated output and a human route:

1. **Moderation** of report and reply text, in any language. Fails closed.
2. **Photo review**, comparing the image against the report. Only clearly
   relevant, safe images auto-approve; everything else waits for a person.
3. **Routing** to one of eight services from a fixed directory.
4. **Category** classification, including when the reporter says "I am not sure".
5. **Severity triage** — advisory only, must cite a reason from a closed list,
   with a suggested response window that is fixed policy rather than a model
   output.
6. **Duplicate detection**, so forty reports of one pothole become one case with
   forty supporters instead of forty cases.

Duplicate detection is the part worth understanding. Citizens report the same
pothole in Greek, Greeklish, English and Russian, and a keyword match fails
immediately on that input. It runs three stages, cheapest first:

1. a deterministic SQL prefilter on a bounding box, recency and visibility;
2. a lexical layer that folds Greek, Greeklish and Cyrillic into one comparable
   form — Greek text and its Greeklish transliteration normalise to identical
   tokens and score **1.0**;
3. model adjudication over the handful that survive, which is the only stage
   that can tell a Russian and an English report describe one pothole. Those
   score **0.0** lexically, which is exactly why the layer exists.

Nothing is merged away: a linked report keeps its own row, author and text, and
a moderator can separate a wrong match.

## Proving it works

`evaluation/` holds 120 labelled Pafos reports and a runner that executes the
shipped classifier and scores it.

```bash
npm run evaluate                    # the shipped configuration
npm run evaluate -- --compare       # compare prompt/model configurations
npm run evaluate -- --limit 20      # a subset while iterating
```

The dataset covers Greek, Greeklish, English, Russian and mixed text, plus the
inputs that break naive classifiers: vague reports, hints the reporter got
wrong, private property, neighbouring municipalities, emergencies that must not
be queued as ordinary reports, adversarial urgency words and prompt-injection
attempts. Twenty-seven percent of cases are labelled as requiring a human.

Beyond accuracy it reports three things averages hide: **critical under-calls**,
**missed escalations**, and **calibration** — whether low confidence really does
mark the harder cases. The scoring functions are unit-tested against
hand-computed values, the runner exits non-zero without an API key, and no
results are committed, so a figure only exists if someone ran it.

## Insights

`/insights` turns the board into something a municipality can act on: volumes,
resolution rate, median and average resolution time, breakdowns by category,
department, status and severity, a time series, geographic hotspots, recurring
locations, duplicate cluster sizes, per-department response performance and
seasonal pattern — each filterable.

Every figure is computed from stored reports. An empty period reports "no data"
rather than a fabricated zero, hidden reports are excluded so a withdrawn report
cannot inflate the figures, and seeded demonstration rows are counted separately
so the page says plainly when it is showing sample data.

Chart colour was produced by a palette validator rather than chosen by eye; the
validated tokens and their scores are recorded in `src/app/design.css`.

## Accessibility and offline use

Analytics aggregates are read in one database round trip and one consistent
snapshot, without caching report totals. Navigation streams the page header and
loading state immediately; filters respond optimistically while fresh results
load. Map markers are reused across refreshes and selection changes, and the
map canvas is capped at a 2x pixel ratio on dense mobile screens.

- Greek, English and Russian throughout, Greek first.
- **Dictation** in the reader's own language, so a report can be spoken rather
  than typed on a phone outdoors. The transcript is always reviewable and
  editable; it is never submitted automatically.
- **Offline reporting**: a failed submission is kept on the device, clearly
  marked *not submitted yet*, and sent when a connection returns. It only leaves
  the queue once the server has accepted it.
- Installable as a PWA. The service worker caches only the application shell and
  deliberately never caches API responses, so the board is never stale.
- Skip link, semantic markup, visible focus, a table view behind every chart,
  and status never carried by colour alone.

## Moderation and safety

- Text and photos are moderated before publication, failing closed.
- **Flagging requests review; it does not delete.** One flag per person per
  report. Reaching the threshold hides the report pending review; a moderator
  restores it or confirms removal, and the row survives either way.
- Department replies are authorised per request: only the assigned department
  can post a verified update or resolve an issue.
- Photos are re-encoded pixel-only, removing EXIF and GPS, and stored privately.
- Rate limits are Postgres-backed so they hold across serverless instances.

`DEMO_MODE=true` allows a deterministic keyword classifier to stand in when the
model provider is unreachable, so a live demonstration survives a bad
connection. Its output is stamped as a fallback, is always marked for human
review, and is never presented as a model decision. Leave it unset in
production, where an unavailable model correctly fails closed.

## Municipal export

Authorised staff can export a filtered CSV or a per-department digest. Both are
files a person downloads, reads and forwards — nothing is emailed or dispatched
by the platform, so no external communication happens without human approval.
CSV cells neutralise leading `=`, `+` and `@` so report text cannot become a
spreadsheet formula.

## Verification scripts

```bash
node --env-file=.env.local scripts/verify-live.mjs
node --env-file=.env.local scripts/verify-team-photos.mjs
```

These drive real browsers against a running deployment, exercising uploads,
moderation, team authorization, verified replies and resolution. They create and
remove only uniquely named fixtures. Set `TEST_BASE_URL` to target a deployment.

## Attribution

MapLibre renders OpenStreetMap tiles with visible attribution; the low-volume
public tile service is appropriate for initial use, and a dedicated provider
should be configured before heavy traffic. Official authority logos identify
each service and do not imply endorsement or partnership; sources are recorded
in `public/authorities/SOURCES.md`.
