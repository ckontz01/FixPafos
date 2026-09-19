import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

/**
 * A postgres.js-shaped client backed by PGlite, so tests exercise the real SQL
 * this application ships rather than a mock of it.
 *
 * PGlite is Postgres compiled to WebAssembly: generated columns, transactions,
 * jsonb operators and constraints all behave as they do in production. It is a
 * devDependency and is never imported by application code.
 *
 * Only the surface `src/lib` actually uses is implemented: tagged-template
 * queries, `.json()`, `.begin()` and `.unsafe()`.
 */
export type TaggedSql = {
  (strings: TemplateStringsArray, ...values: unknown[]): Promise<
    Record<string, unknown>[]
  >;
  json: (value: unknown) => JsonParam;
  begin: <T>(fn: (tx: TaggedSql) => Promise<T>) => Promise<T>;
  unsafe: (text: string) => Promise<Record<string, unknown>[]>;
};

/** Marks a value that must be bound as jsonb rather than as text. */
class JsonParam {
  constructor(readonly value: unknown) {}
}

function build(db: PGlite): TaggedSql {
  const run = async (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<Record<string, unknown>[]> => {
    let text = "";
    const params: unknown[] = [];
    strings.forEach((part, index) => {
      text += part;
      if (index < values.length) {
        const value = values[index];
        params.push(value instanceof JsonParam ? JSON.stringify(value.value) : value);
        text += `$${params.length}`;
      }
    });
    const result = await db.query(text, params);
    return (result.rows ?? []) as Record<string, unknown>[];
  };

  const sql = run as TaggedSql;
  sql.json = (value: unknown) => new JsonParam(value);
  sql.unsafe = async (text: string) =>
    ((await db.exec(text)).at(-1)?.rows ?? []) as Record<string, unknown>[];
  // PGlite is single-connection, so a transaction is scoped rather than pooled.
  sql.begin = async <T>(fn: (tx: TaggedSql) => Promise<T>): Promise<T> => {
    await db.exec("BEGIN");
    try {
      const result = await fn(sql);
      await db.exec("COMMIT");
      return result;
    } catch (error) {
      await db.exec("ROLLBACK");
      throw error;
    }
  };
  return sql;
}

export type TestDatabase = {
  sql: TaggedSql;
  raw: PGlite;
  close: () => Promise<void>;
};

/** Fresh in-memory database with the shipped schema applied. */
export async function createTestDatabase(): Promise<TestDatabase> {
  const db = new PGlite();
  await db.exec(readFileSync("scripts/schema.sql", "utf8"));
  return { sql: build(db), raw: db, close: () => db.close() };
}
