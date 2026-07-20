import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      process.env.POSTGRES_URL ??
      process.env.SUPABASE_DB_URL ??
      "postgresql://build_only:build_only@127.0.0.1:5432/build_only",
  },
  verbose: true,
  strict: true,
});
