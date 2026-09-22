// Pembungkus baris perintah untuk seed. Yang mencetak dan membuka koneksi
// cuma berkas ini; seed.ts sendiri dipakai juga oleh tombol Reset Demo.
//
// Jalankan: npm run db:seed

import postgres from "postgres";
import { STUDIO_DEMO, seed } from "./seed.ts";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL belum diisi — lihat .env.example");

const sql = postgres(url, { max: 4 });

try {
  const r = await seed(sql);
  console.log(`\n  ${STUDIO_DEMO} — seed selesai\n`);
  console.log(`  member            ${r.member}`);
  console.log(`  sesi (4 minggu)   ${r.sesi}`);
  console.log(`  booking           ${r.booking}`);
  console.log(`  waitlist          ${r.waitlist}`);
  console.log(`  baris ledger      ${r.ledger}`);
  console.log(`  panel A1 ≤ 7 hari ${r.panel_a1} orang`);
  console.log(`  antrean berkredit ${r.antrean_berkredit}`);
  console.log(`  sesi penuh besok  ${r.sesi_penuh_besok?.toISOString() ?? "TIDAK ADA"}`);
  console.log(`  dlm jendela batal ${r.sesi_jendela_batal?.toISOString() ?? "TIDAK ADA"}`);
  console.log(`  admin demo        ${r.admin}\n`);
} catch (e) {
  console.error(`\n  ${(e as Error).message}\n`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
