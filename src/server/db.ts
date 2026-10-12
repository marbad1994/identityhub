import pg from "pg";
import { requireEnv } from "./env";

const globalRef = globalThis as typeof globalThis & { __ihubPool__?: pg.Pool };

function pool(): pg.Pool {
  globalRef.__ihubPool__ ??= new pg.Pool({ connectionString: requireEnv("DATABASE_URL"), max: 10 });
  return globalRef.__ihubPool__;
}

export type Queryable = {
  query<T extends pg.QueryResultRow = Record<string, unknown>>(text: string, params?: unknown[]): Promise<pg.QueryResult<T>>;
};

/** Run one parameterized statement and return its rows. */
export async function rows<T extends pg.QueryResultRow = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
  client: Queryable = pool(),
): Promise<T[]> {
  return (await client.query<T>(text, params)).rows;
}

export async function one<T extends pg.QueryResultRow = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
  client: Queryable = pool(),
): Promise<T | undefined> {
  return (await rows<T>(text, params, client))[0];
}

/** Run `work` in a single transaction. */
export async function tx<T>(work: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
