import { Pool, type QueryResult } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL env var is required");
  }
  return new Pool({ connectionString });
}

const pool = globalThis.__pgPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalThis.__pgPool = pool;
}

export const db = {
  query<T = unknown>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    return pool.query<T>(text, params);
  },
  async execute<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
    const res = await pool.query<T>(text, params);
    return res.rows;
  },
};

export type DbClient = typeof db;
