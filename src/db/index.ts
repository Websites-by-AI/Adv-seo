import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const detectedDatabaseUrl =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.SUPABASE_DB_URL;

export const databaseConfigured = Boolean(detectedDatabaseUrl);
export const databaseVariableName = process.env.DATABASE_URL
  ? "DATABASE_URL"
  : process.env.POSTGRES_URL
    ? "POSTGRES_URL"
    : process.env.SUPABASE_DB_URL
      ? "SUPABASE_DB_URL"
      : null;

const connectionString =
  detectedDatabaseUrl ??
  "postgresql://build_only:build_only@127.0.0.1:5432/build_only";

const globalForDb = globalThis as typeof globalThis & {
  __advSeoPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__advSeoPostgresqlPool ??
  new Pool({ connectionString, connectionTimeoutMillis: 5000 });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__advSeoPostgresqlPool = pool;
}

export const db = drizzle(pool);
