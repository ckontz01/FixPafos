import { randomBytes } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/team";
import { departments } from "../src/lib/departments";
async function main() {
  const sql = db();
  await mkdir("docs", { recursive: true });
  try {
    let added = 0;
    for (const [id, department] of Object.entries(departments)) {
      if (
        (
          await sql`SELECT 1 FROM pafos_team_credentials WHERE department_id=${id}`
        ).length
      )
        continue;
      const password = randomBytes(24).toString("base64url");
      // Save locally before inserting, so a failed run cannot lose a credential.
      await appendFile(
        "docs/team-access.private.txt",
        `${department.name}\nDepartment ID: ${id}\nPassword: ${password}\n\n`,
      );
      await sql`INSERT INTO pafos_team_credentials(department_id,password_hash) VALUES(${id},${await hashPassword(password)}) ON CONFLICT DO NOTHING`;
      added++;
    }
    console.log(
      `Provisioned ${added} departments. Passwords are in docs/team-access.private.txt; distribute only to authorized representatives.`,
    );
  } finally {
    await sql.end();
  }
}
void main();
