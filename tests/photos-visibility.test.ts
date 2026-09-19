import test from "node:test";
import assert from "node:assert/strict";
import { publicPhotoPath } from "../src/lib/db";
import { createTestDatabase } from "./helpers/pg";

test("photo access follows report visibility and moderator decisions", async () => {
  const db = await createTestDatabase();
  try {
    await db.sql`INSERT INTO pafos_issues(id,data,created_at) VALUES('photo-report',${db.sql.json({ location: { latitude: 34.77, longitude: 32.42 } })},1)`;
    await db.sql`INSERT INTO pafos_photos(issue_id,blob_path,status,created_at) VALUES('photo-report','private/photo.jpg','approved',1)`;
    assert.equal(await publicPhotoPath("photo-report", db.sql), "private/photo.jpg");
    await db.sql`UPDATE pafos_issues SET hidden_at=1 WHERE id='photo-report'`;
    assert.equal(await publicPhotoPath("photo-report", db.sql), null);
    await db.sql`UPDATE pafos_issues SET hidden_at=NULL WHERE id='photo-report'`;
    assert.equal(await publicPhotoPath("photo-report", db.sql), "private/photo.jpg");
    await db.sql`UPDATE pafos_photos SET status='rejected' WHERE issue_id='photo-report'`;
    assert.equal(await publicPhotoPath("photo-report", db.sql), null);
    await db.sql`UPDATE pafos_photos SET status='approved' WHERE issue_id='photo-report'`;
    await db.sql`DELETE FROM pafos_issues WHERE id='photo-report'`;
    assert.equal(await publicPhotoPath("photo-report", db.sql), null);
  } finally { await db.close(); }
});
