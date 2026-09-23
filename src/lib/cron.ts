// Penjaga endpoint job terjadwal — 06-architecture.md keputusan 8. Job BUKAN
// fitur platform: endpoint HTTP biasa, dipanggil Vercel Cron di demo dan
// crontab + curl di VPS. Header `Authorization: Bearer <CRON_SECRET>` karena
// dua-duanya bisa mengirimnya.

import { timingSafeEqual } from "node:crypto";

/** Perbandingan yang waktunya tidak bergantung isi — ini batas kepercayaan. */
function sama(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  // timingSafeEqual melempar kalau panjangnya beda; panjang bukan rahasia.
  return x.length === y.length && timingSafeEqual(x, y);
}

/** `null` kalau boleh lanjut, Response penolakan kalau tidak. CRON_SECRET
 *  kosong ditolak 500: endpoint ini menulis ke database, "belum dikonfigurasi"
 *  tidak boleh berarti "terbuka". */
export function pastikanCron(req: Request): Response | null {
  const rahasia = process.env.CRON_SECRET;
  if (!rahasia)
    return Response.json(
      { ok: false, pesan: "CRON_SECRET belum diisi — lihat .env.example" },
      { status: 500 },
    );

  const dikirim = req.headers.get("authorization") ?? "";
  if (!sama(dikirim, `Bearer ${rahasia}`))
    return Response.json({ ok: false, pesan: "Tidak berwenang." }, { status: 401 });

  return null;
}
