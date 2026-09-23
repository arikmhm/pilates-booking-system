// Penjaga database test — dipakai SEMUA test integrasi. Test memakai
// TEST_DATABASE_URL dan MENOLAK jalan kalau host-nya bukan lokal: sejak
// `neon link` menimpa DATABASE_URL, `npm test` bisa mengosongkan db sungguhan.

import postgres from "postgres";

export function dbUji(): string {
  const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL belum diisi — lihat .env.example");
  const host = new URL(url).hostname;
  if (host !== "localhost" && host !== "127.0.0.1") {
    throw new Error(
      `Test menolak jalan: TEST_DATABASE_URL menunjuk ${host}, bukan localhost. ` +
        "Test ini TRUNCATE semua tabel. Jalankan `npm run db:up` lalu arahkan " +
        "TEST_DATABASE_URL ke Postgres lokal.",
    );
  }
  return url;
}

/** Urutannya mengikuti arah foreign key; `cascade` menutup sisanya. */
export const TABEL = [
  "credit_ledger",
  "waitlist_entries",
  "notifications",
  "bookings",
  "member_packages",
  "package_class_types",
  "packages",
  "sessions",
  "schedule_rules",
  "class_types",
  "users",
  "studios",
];

export const bersihkan = (sql: postgres.Sql) =>
  sql.unsafe(`truncate ${TABEL.join(", ")} cascade`);
