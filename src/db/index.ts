import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/env";
import * as schema from "./schema";

// Next.js dev me-reload modul tiap berkas berubah. Tanpa cache global,
// koneksi menumpuk sampai Postgres menolak yang baru.
const global_ = globalThis as unknown as { _pg?: ReturnType<typeof postgres> };
const client = global_._pg ?? postgres(env.DATABASE_URL);
if (process.env.NODE_ENV !== "production") global_._pg = client;

// casing sama dengan drizzle.config.ts supaya nama kolom runtime dan migrasi tidak melenceng
export const db = drizzle(client, { schema, casing: "snake_case" });

// Klien mentah untuk query atomik dan agregat ledger — AGENTS.md.
// Fungsi yang memakainya menerima klien sebagai argumen supaya test bisa
// menyuntikkan koneksi lokalnya sendiri.
export const pg = client;
