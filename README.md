# PafosLive

An independent, map-first community board for municipal issues in Pafos, Cyprus. Opens directly on Pafos with public report pins, category/search filters, support votes and moderated replies. No climate hazard layers, datasets or CYENS deployment configuration.

## Development

Requires Node.js 24. Run `npm ci`, configure `.env.local` using `.env.example`, run `npm run db:migrate` against the dedicated PafosLive database, then `npm run dev`. The local port is 3107. Run `npm test`, `npm run lint` and `npm run build` before deployment.

## Storage and deployment

Separate GitHub repository and Vercel project named `pafoslive`. A new Neon Postgres resource `pafoslive-db` is provisioned via Vercel Marketplace. Database migrations are explicit, not run during Vercel builds. Never connect this project to the CYENS database or repo. All tables use the `pafos_` prefix. Browser storage contains only a pseudonymous support-voter identifier; reports are stored on the shared server and visible without login. Clients refresh every 15 seconds and upon returning to the tab.

## Moderation

The original community board's multilingual profanity dictionary and filter are copied unchanged. DeepSeek moderation uses the same tool schema, categories, validation, timeout and retry policy; the prompt changes only the topic from climate impacts to municipal issues. Both reports and replies are moderated. Blocked content is privately quarantined. Provider outages fail closed with 503, and no unchecked content is published. Password-protected review is at `/moderation`. A fresh `FEEDBACK_ADMIN_PASSWORD` is required; there is no legacy/default password. Rate limits are persisted in Postgres for Vercel's distributed runtime: ten submissions/minute and five failed moderator logins/15 minutes.

The original public flag-and-remove behavior is intentionally retained: any visitor may flag and remove a published issue and its replies. The UI explicitly confirms this irreversible action. This is community moderation, not an authenticated government case-management system.

## Team replies and resolution

Each directory department has a separate password. Run `node --env-file=.env.local --import tsx scripts/provision-teams.ts` after migration to provision missing departments. This writes passwords only to ignored `docs/team-access.private.txt`; distribute them privately to authorized representatives. Existing credentials are never overwritten by this script. The badge confirms use of the department's platform credential, not independent verification of government employment.

Passwords are stored as salted scrypt hashes. Verification creates a random, database-backed eight-hour session in an HttpOnly, SameSite=Strict cookie (Secure over HTTPS). Five login attempts per IP per 15 minutes are allowed. Only the department assigned to a report can post verified updates or resolve it. Resolution requires an update and saves the status and verified reply atomically. Ordinary replies cannot set verified metadata. All reply text uses the existing moderation pipeline; a blocked resolution update does not change the issue status. Resolved reports stay visible to everyone, with check-mark pins and an optional status filter.

To revoke team access, delete that department's rows from `pafos_team_sessions`. To rotate its password, replace its scrypt hash and revoke its sessions; keep replacement plaintext only in the ignored access file.

## Photos

One optional JPEG, PNG or WebP photo can accompany a report (4 MB, 25 megapixels maximum). The server decodes and re-encodes the image, removes metadata including GPS, and resizes it to at most 1600 pixels. Original filenames and bytes are not retained. The dedicated **private** Vercel Blob store `pafoslive-photos` is connected using `BLOB_READ_WRITE_TOKEN`. Never switch it to public access.

Photos start in manual review at `/moderation`. A moderator must view and approve the photo before it can appear publicly. Text moderation is unchanged and independent: both the report and photo must be approved for the image to be served. Rejecting a photo or removing its report makes the public photo endpoint return 404. The endpoint checks database permissions on every request and sends no-store responses. Private moderator previews use authenticated POST requests, with no passwords in URLs. Rejected images remain private for review.

`node --env-file=.env.local scripts/verify-team-photos.mjs` exercises uploads, moderation, team authorization, verified replies and resolution through real browsers and APIs. It creates and removes only uniquely named QA fixtures. Set `TEST_BASE_URL=https://pafoslive.vercel.app` to verify this project's deployment.

## Assignment details

The report form offers **I am not sure**. This is stored as the original reported category and sent to DeepSeek as no category hint, including when a quarantined report is later approved. DeepSeek must return a real category before publication. Cards and issue details label DeepSeek-classified reports **Auto-classified by DeepSeek**; filters and map pins use the resulting category.

DeepSeek selects from a fixed service directory, with validated output and a human-review route for uncertain cases. Assignment runs after moderation and before publication, including moderator releases. A failed assignment does not publish an unassigned report. The selected department is a suggestion, not a dispatch or confirmation that an authority accepted a case. Reports are never emailed or transmitted to a government service automatically.

Directory sources, checked 18 September 2026:

- [Pafos Municipality services](https://pafos.org.cy/en/contact/)
- [EOA Pafos sewerage and water complaints](https://eoap.org.cy/en/sewer-blockage-complaints/)

The reporting area is a rectangular Pafos-area extent (32.32–32.53 E, 34.70–34.88 N), not a precise municipal boundary. Users must place an explicit location. The classifier is instructed to request review for neighbouring jurisdictions and ambiguous responsibility.

## Isolation

Created from a small, read-only selection of moderation source files. No original Git history, remotes, workflows, data, SQLite files, logos or deployment files are carried over. The existing DeepSeek credential is configured server-side for the requested LLM integration; no CYENS deployment settings are changed. The generated moderator credential and baseline integrity record remain in ignored `*.private.*` files locally. Never commit `.env.local` or private files.

## Map

The interface design is documented in `design.md`, with shared visual styles in `src/app/design.css`. The Local services directory, report cards, assignment panel and verified replies show official parent-authority logos. The eight services share two authority identities: Pafos Municipality and EOA Pafos. Original asset URLs and provenance are recorded in `public/authorities/SOURCES.md`; these marks identify the authorities and do not imply endorsement.

MapLibre renders standard OpenStreetMap tiles with visible attribution. Report text is rendered as React text or DOM `textContent`, never raw HTML. Pins and the board share the same filtered dataset. Reports at identical coordinates fan out in screen pixels for selection. Low-volume public OSM tiles are appropriate for initial use; provision a dedicated tile provider before heavy traffic, following [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/).
