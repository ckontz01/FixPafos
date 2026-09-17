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
