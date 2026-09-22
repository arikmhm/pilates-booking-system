// Penjaga endpoint job terjadwal — 06-architecture.md keputusan 8.
//
// Job sengaja BUKAN fitur platform: empat endpoint HTTP biasa yang dipanggil
// Vercel Cron di demo dan `crontab` + `curl` di VPS klien. Kodenya sama, yang
// berbeda cuma satu berkas config. Itu syarat portabilitas di AGENTS.md.
//
// Header `Authorization: Bearer <CRON_SECRET>` dipilih karena dua-duanya bisa
// mengirimnya: Vercel Cron memasangnya sendiri, curl memakai `-H`.

import { timingSafeEqual } from "node:crypto";

/** Perbandingan yang waktunya tidak bergantung isi — ini batas kepercayaan. */
function sama(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  // timingSafeEqual melempar kalau panjangnya beda, jadi panjang dicek dulu.
  // Panjang secret bukan rahasia yang perlu dijaga; isinya iya.
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Kembalikan `null` kalau boleh lanjut, atau Response penolakan kalau tidak.
 *
 * CRON_SECRET kosong ditolak 500, bukan dibiarkan lewat. Endpoint ini menulis
 * ke database; "belum dikonfigurasi" tidak boleh berarti "terbuka".
 */
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
