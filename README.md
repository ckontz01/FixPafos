# PafosLive

An independent, map-first community board for municipal issues in Pafos, Cyprus. Opens directly on Pafos with public report pins, category/search filters, support votes and moderated replies. No climate hazard layers, datasets or CYENS deployment configuration.

## Development

Requires Node.js 24. Run `npm ci`, configure `.env.local` using `.env.example`, run `npm run db:migrate` against the dedicated PafosLive database, then `npm run dev`. The local port is 3107. Run `npm test`, `npm run lint` and `npm run build` before deployment.

## Storage and deployment

Separate GitHub repository and Vercel project named `pafoslive`. A new Neon Postgres resource `pafoslive-db` is provisioned via Vercel Marketplace. Database migrations are explicit, not run during Vercel builds. Never connect this project to the CYENS database or repo. All tables use the `pafos_` prefix. Browser storage contains only a pseudonymous support-voter identifier; reports are stored on the shared server and visible without login. Clients refresh every 15 seconds and upon returning to the tab.

## Moderation

The original community board's multilingual profanity dictionary and filter are copied unchanged. DeepSeek moderation uses the same tool schema, categories, validation, timeout and retry policy; the prompt changes only the topic from climate impacts to municipal issues. Both reports and replies are moderated. Blocked content is privately quarantined. Provider outages fail closed with 503, and no unchecked content is published. Password-protected review is at `/moderation`. A fresh `FEEDBACK_ADMIN_PASSWORD` is required; there is no legacy/default password. Rate limits are persisted in Postgres for Vercel's distributed runtime: ten submissions/minute and five failed moderator logins/15 minutes.

The original public flag-and-remove behavior is intentionally retained: any visitor may flag and remove a published issue and its replies. The UI explicitly confirms this irreversible action. This is community moderation, not an authenticated government case-management system.

## Department assignment

DeepSeek selects from a fixed service directory, with validated output and a human-review route for uncertain cases. Assignment runs after moderation and before publication, including moderator releases. A failed assignment does not publish an unassigned report. The selected department is a suggestion, not a dispatch or confirmation that an authority accepted a case. Reports are never emailed or transmitted to a government service automatically.

Directory sources, checked 18 September 2026:

- [Pafos Municipality services](https://pafos.org.cy/en/contact/)
- [EOA Pafos sewerage and water complaints](https://eoap.org.cy/en/sewer-blockage-complaints/)

The reporting area is a rectangular Pafos-area extent (32.32–32.53 E, 34.70–34.88 N), not a precise municipal boundary. Users must place an explicit location. The classifier is instructed to request review for neighbouring jurisdictions and ambiguous responsibility.

## Isolation

Created from a small, read-only selection of moderation source files. No original Git history, remotes, workflows, data, SQLite files, logos or deployment files are carried over. The existing DeepSeek credential is configured server-side for the requested LLM integration; no CYENS deployment settings are changed. The generated moderator credential and baseline integrity record remain in ignored `*.private.*` files locally. Never commit `.env.local` or private files.

## Map

MapLibre renders standard OpenStreetMap tiles with visible attribution. Report text is rendered as React text or DOM `textContent`, never raw HTML. Pins and the board share the same filtered dataset. Reports at identical coordinates fan out in screen pixels for selection. Low-volume public OSM tiles are appropriate for initial use; provision a dedicated tile provider before heavy traffic, following [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/).
