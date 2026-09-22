// Generate sesi — BR-7.1 · Alur 7.3
//
// TIDAK terdaftar di vercel.json: penerbitan jadwal dipicu tombol di layar
// Aturan Jadwal, bukan tiap malam sendiri. Endpoint-nya sengaja dibiarkan
// hidup — klien yang ingin kembali ke otomatis cukup menambah satu baris
// crontab atau satu entri crons, tanpa menyentuh kode:
//   curl -sS -H "Authorization: Bearer \$CRON_SECRET" \$APP_URL/api/cron/generate-sesi

import { pg } from "@/db";
import { generateSesi } from "@/db/job";
import { pastikanCron } from "@/lib/cron";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const tolak = pastikanCron(req);
  if (tolak) return tolak;

  const hasil = await generateSesi(pg, new Date());
  return Response.json({ ok: true, ...hasil });
}
