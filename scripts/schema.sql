CREATE TABLE IF NOT EXISTS pafos_issues (
 id text PRIMARY KEY, data jsonb NOT NULL,
 created_at bigint NOT NULL,
 CHECK (data->'location' IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS pafos_replies (
 id text PRIMARY KEY, issue_id text NOT NULL REFERENCES pafos_issues(id) ON DELETE CASCADE,
 data jsonb NOT NULL, created_at bigint NOT NULL
);
CREATE TABLE IF NOT EXISTS pafos_votes (
 issue_id text NOT NULL REFERENCES pafos_issues(id) ON DELETE CASCADE,
 voter_id text NOT NULL, PRIMARY KEY(issue_id, voter_id)
);
CREATE TABLE IF NOT EXISTS pafos_quarantine (
 id text PRIMARY KEY, submission_type text NOT NULL CHECK(submission_type IN ('post','reply')),
 parent_post_id text, submission jsonb NOT NULL,
 blocked_by text NOT NULL, category text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','published')),
 created_at bigint NOT NULL, reviewed_at bigint
);
CREATE TABLE IF NOT EXISTS pafos_rate_limits (
 key text PRIMARY KEY, attempts bigint[] NOT NULL
);
CREATE INDEX IF NOT EXISTS pafos_issues_created ON pafos_issues(created_at DESC);
CREATE INDEX IF NOT EXISTS pafos_replies_issue ON pafos_replies(issue_id, created_at);
CREATE INDEX IF NOT EXISTS pafos_quarantine_pending ON pafos_quarantine(status, created_at DESC);

CREATE TABLE IF NOT EXISTS pafos_team_credentials (
 department_id text PRIMARY KEY, password_hash text NOT NULL
);
CREATE TABLE IF NOT EXISTS pafos_team_sessions (
 token_hash text PRIMARY KEY, department_id text NOT NULL REFERENCES pafos_team_credentials(department_id) ON DELETE CASCADE,
 expires_at bigint NOT NULL
);
CREATE TABLE IF NOT EXISTS pafos_photos (
 issue_id text PRIMARY KEY, blob_path text NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 created_at bigint NOT NULL, reviewed_at bigint
);
ALTER TABLE pafos_photos ADD COLUMN IF NOT EXISTS ai_review jsonb;
ALTER TABLE pafos_photos ADD COLUMN IF NOT EXISTS reviewed_by text;

-- ---------------------------------------------------------------------------
-- Analytics and scale: promote filterable fields out of JSONB.
--
-- These are GENERATED ALWAYS ... STORED columns rather than duplicated values
-- maintained by the application. The JSONB document stays the single source of
-- truth, the columns cannot drift out of sync with it, and no existing INSERT
-- or UPDATE needs to change. They exist so the board and the insights queries
-- can filter, group and index instead of scanning every document.
ALTER TABLE pafos_issues
  ADD COLUMN IF NOT EXISTS category text
    GENERATED ALWAYS AS (data->>'category') STORED,
  ADD COLUMN IF NOT EXISTS department_id text
    GENERATED ALWAYS AS (data->'assignment'->>'departmentId') STORED,
  ADD COLUMN IF NOT EXISTS status text
    GENERATED ALWAYS AS (COALESCE(data->>'status','open')) STORED,
  ADD COLUMN IF NOT EXISTS severity text
    GENERATED ALWAYS AS (data->'severity'->>'level') STORED,
  ADD COLUMN IF NOT EXISTS severity_confidence text
    GENERATED ALWAYS AS (data->'severity'->>'confidence') STORED,
  ADD COLUMN IF NOT EXISTS latitude double precision
    GENERATED ALWAYS AS ((data->'location'->>'latitude')::double precision) STORED,
  ADD COLUMN IF NOT EXISTS longitude double precision
    GENERATED ALWAYS AS ((data->'location'->>'longitude')::double precision) STORED,
  ADD COLUMN IF NOT EXISTS resolved_at bigint
    GENERATED ALWAYS AS ((data->'resolution'->>'at')::bigint) STORED,
  ADD COLUMN IF NOT EXISTS cluster_id text
    GENERATED ALWAYS AS (data->'cluster'->>'clusterId') STORED,
  ADD COLUMN IF NOT EXISTS cluster_role text
    GENERATED ALWAYS AS (data->'cluster'->>'role') STORED,
  ADD COLUMN IF NOT EXISTS cluster_status text
    GENERATED ALWAYS AS (data->'cluster'->>'status') STORED,
  ADD COLUMN IF NOT EXISTS report_language text
    GENERATED ALWAYS AS (data->'translation'->>'detected') STORED,
  ADD COLUMN IF NOT EXISTS is_demo boolean
    GENERATED ALWAYS AS ((data->>'demo') IS NOT NULL) STORED;

-- Moderation state is written by moderators, not derived from citizen data, so
-- these stay ordinary columns. Flagged reports are hidden, never deleted.
ALTER TABLE pafos_issues
  ADD COLUMN IF NOT EXISTS hidden_at bigint,
  ADD COLUMN IF NOT EXISTS hidden_reason text,
  ADD COLUMN IF NOT EXISTS reviewed_at bigint,
  ADD COLUMN IF NOT EXISTS reviewed_by text,
  ADD COLUMN IF NOT EXISTS review_outcome text
    CHECK (review_outcome IS NULL OR review_outcome IN ('restored','removed'));

-- Public board reads: visible reports, newest first.
CREATE INDEX IF NOT EXISTS pafos_issues_visible
  ON pafos_issues(created_at DESC) WHERE hidden_at IS NULL;
-- Insights group-bys.
CREATE INDEX IF NOT EXISTS pafos_issues_category ON pafos_issues(category, created_at DESC);
CREATE INDEX IF NOT EXISTS pafos_issues_department ON pafos_issues(department_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pafos_issues_status ON pafos_issues(status, created_at DESC);
CREATE INDEX IF NOT EXISTS pafos_issues_severity ON pafos_issues(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS pafos_issues_cluster ON pafos_issues(cluster_id) WHERE cluster_id IS NOT NULL;
-- Duplicate detection prefilters on a bounding box before any model call.
CREATE INDEX IF NOT EXISTS pafos_issues_geo ON pafos_issues(latitude, longitude);

-- One flag per person per report: flagging is a signal for review, not a vote
-- to delete, and repeat flags from one browser must not reach the threshold.
CREATE TABLE IF NOT EXISTS pafos_flags (
  issue_id text NOT NULL REFERENCES pafos_issues(id) ON DELETE CASCADE,
  voter_id text NOT NULL,
  reason text NOT NULL,
  created_at bigint NOT NULL,
  PRIMARY KEY (issue_id, voter_id)
);
CREATE INDEX IF NOT EXISTS pafos_flags_issue ON pafos_flags(issue_id);

-- Append-only record of clustering decisions, so a suggested link can be
-- explained and a moderator's separation is never silently re-applied.
CREATE TABLE IF NOT EXISTS pafos_cluster_events (
  id bigserial PRIMARY KEY,
  cluster_id text NOT NULL,
  issue_id text NOT NULL,
  action text NOT NULL CHECK (action IN ('suggested','confirmed','separated')),
  actor text NOT NULL,
  reason text,
  score double precision,
  distance_metres double precision,
  created_at bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS pafos_cluster_events_cluster ON pafos_cluster_events(cluster_id, created_at);
CREATE INDEX IF NOT EXISTS pafos_cluster_events_issue ON pafos_cluster_events(issue_id, created_at);
