import { execFileSync } from "node:child_process";

const autoMigrate = process.env.AUTO_MIGRATE === "true";
const databaseUrl =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.SUPABASE_DB_URL;

if (databaseUrl && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = databaseUrl;
}

if (autoMigrate) {
  if (!databaseUrl) {
    console.error("AUTO_MIGRATE=true but DATABASE_URL is missing.");
    process.exit(1);
  }
  console.log("AUTO_MIGRATE enabled: applying Drizzle schema to the configured database...");
  execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["drizzle-kit", "push", "--force"], {
    stdio: "inherit",
    env: process.env,
  });
} else {
  console.log("AUTO_MIGRATE is disabled; database schema will not be changed during build.");
}

execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["next", "build"], {
  stdio: "inherit",
  env: process.env,
});
