import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { readFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";

/**
 * A local Postgres for development, served over a real TCP socket so the
 * application connects to it with the same `postgres.js` client and the same
 * `DATABASE_URL` it uses in production.
 *
 * This exists so the project can be run, seeded and demonstrated without
 * provisioning a hosted database. It is a development convenience only: it is
 * never imported by application code and never used in deployment, where
 * DATABASE_URL points at the managed Postgres instance.
 *
 *   npm run dev:db
 *   DATABASE_URL=postgres://postgres@127.0.0.1:5433/postgres npm run seed:demo
 *   DATABASE_URL=postgres://postgres@127.0.0.1:5433/postgres npm run dev
 *
 * IMPORTANT: this server accepts a SINGLE client connection at a time, because
 * PGlite is one in-process database rather than a pool. Run the seed script
 * before starting the dev server, not alongside it, or the second client is
 * dropped with ECONNRESET. lib/db.ts already pins the pool to one connection
 * for loopback URLs for the same reason. Hosted Postgres has no such limit.
 */
const PORT = Number(process.env.DEV_DB_PORT ?? 5433);
const DATA_DIR = process.env.DEV_DB_DIR ?? ".pglite";

await mkdir(DATA_DIR, { recursive: true });
const db = new PGlite(DATA_DIR);
await db.waitReady;

// Applying the shipped schema keeps this database identical to a migrated one.
await db.exec(await readFile(new URL("./schema.sql", import.meta.url), "utf8"));

const server = new PGLiteSocketServer({ db, port: PORT, host: "127.0.0.1" });
await server.start();

console.log(`Development database listening on 127.0.0.1:${PORT}`);
console.log(`DATABASE_URL=postgres://postgres@127.0.0.1:${PORT}/postgres`);
console.log("Schema applied. Press Ctrl+C to stop.");

const stop = async () => {
  await server.stop();
  await db.close();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
