import { defineConfig } from "drizzle-kit";

// drizzle-kit CLI tidak memuat .env.local seperti Next.js.
// process.loadEnvFile bawaan Node ≥ 20.12 — tanpa dependency dotenv.
try {
  process.loadEnvFile(".env.local");
} catch {
  // di CI dan produksi env sudah ada di environment
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
  casing: "snake_case",
});
