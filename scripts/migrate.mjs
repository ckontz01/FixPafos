import postgres from "postgres";
import { readFile } from "node:fs/promises";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");
const sql = postgres(process.env.DATABASE_URL, { ssl: "verify-full", max: 1 });
try {
  await sql.unsafe(
    await readFile(new URL("./schema.sql", import.meta.url), "utf8"),
  );
  console.log("FixPafos schema ready. No source application database used.");
} finally {
  await sql.end();
}
