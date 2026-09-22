// Layar M3 Akun Saya — 02-rules.md bagian 6.1. Tampilan HP (DS-16).
// "Sisa kredit + tanggal hangus + hitung mundur · booking aktif · riwayat kredit"
//
// Jantung skenario A. Kalimat yang harus bisa diucapkan sambil menunjuk layar:
// "sisa 6 sesi, hangus 14 Nov, 24 hari lagi — tidak perlu tanya admin."

import Link from "next/link";
import { redirect } from "next/navigation";
import { pg } from "@/db";
import {
  bookingSaya,
  paketMember,
  riwayatKredit,
  type BarisLedger,
} from "@/db/booking";
import { userSaatIni } from "@/lib/masuk";
import { hariWib, jamWib, selisihManusiawi } from "@/lib/waktu";
import { batalBooking } from "./aksi";

export const dynamic = "force-dynamic";

/** DS — tanggal hangus hanya menguning saat ≤ 7 hari; di luar itu tenang. */
const MENDESAK_HARI = 7;

function warnaHangus(hangus_at: Date, sekarang: Date) {
  const hari = (hangus_at.getTime() - sekarang.getTime()) / 86_400_000;
  return hari <= MENDESAK_HARI ? "text-warn-foreground" : "text-muted-foreground";
}

function Ledger({ b }: { b: BarisLedger }) {
  const naik = b.delta > 0;
  return (
    <li className="flex items-baseline justify-between gap-4 py-3">
      <div>
        {/* AGENTS.md — nilai `alasan` tampil apa adanya dalam Bahasa Indonesia.
            Hanya garis bawahnya diganti spasi; katanya tidak diterjemahkan. */}
        <p className="text-app-body first-letter:uppercase">
          {b.alasan.replace(/_/g, " ")}
        </p>
        <p className="text-app-body-sm text-muted-foreground">
          {b.kelas && b.mulai_at
            ? `${b.kelas} · ${hariWib(b.mulai_at)} ${jamWib(b.mulai_at)}`
            : hariWib(b.created_at)}
          {b.catatan && ` · ${b.catatan}`}
        </p>
      </div>
      <span
        className={`text-app-section tabular-nums ${
          naik ? "text-ok-foreground" : "text-muted-foreground"
        }`}
      >
        {naik ? "+" : ""}
        {b.delta}
      </span>
    </li>
  );
}

export default async function M3({
  searchParams,
}: {
  searchParams: Promise<{ kabar?: string }>;
}) {
  const user_id = await userSaatIni();
  if (!user_id) redirect("/masuk");

  const { kabar } = await searchParams;
  const sekarang = new Date();

  const [paket, booking, riwayat, [saya]] = await Promise.all([
    paketMember(pg, user_id),
    bookingSaya(pg, user_id),
    riwayatKredit(pg, user_id),
    pg<{ nama: string }[]>`select nama from users where id = ${user_id}`,
  ]);

  // BR-1.7 — dijumlahkan dari buku besar. Tidak ada kolom saldo di mana pun.
  const aktif = paket.filter((p) => p.hangus_at > sekarang && p.sisa_kredit > 0);
  const sisa = aktif.reduce((t, p) => t + p.sisa_kredit, 0);
  // BR-1.5 — yang paling cepat hangus dipakai duluan, jadi itu yang ditonjolkan.
  const terdekat = [...aktif].sort(
    (a, b) => a.hangus_at.getTime() - b.hangus_at.getTime(),
  )[0];

  // Cookie demo bisa menunjuk user yang sudah hilang (mis. setelah re-seed).
  // Layar kosong tanpa penjelasan lebih membingungkan daripada disuruh masuk.
  if (!saya) redirect("/masuk");

  return (
    <main className="mx-auto w-full max-w-md px-gutter py-sm">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-app-title">Akun Saya</h1>
          <p className="text-app-body-sm text-muted-foreground">{saya.nama}</p>
        </div>
        <Link href="/jadwal" className="inline-flex min-h-11 items-center text-app-body-sm">
          Jadwal
        </Link>
      </header>

      {kabar && (
        <p className="mt-sm rounded-md bg-muted p-4 text-app-body-sm">{kabar}</p>
      )}

      {/* Kartu ini yang ditunjuk saat presentasi menit 0:45 */}
      <section className="mt-sm rounded-md border border-border p-4">
        <p className="text-app-label uppercase text-muted-foreground">Sisa kredit</p>
        <p className="text-app-number tabular-nums">{sisa}</p>
        {terdekat ? (
          <p className={`text-app-body-sm ${warnaHangus(terdekat.hangus_at, sekarang)}`}>
            Hangus {hariWib(terdekat.hangus_at)} ·{" "}
            {selisihManusiawi(terdekat.hangus_at, sekarang)}
          </p>
        ) : (
          <p className="text-app-body-sm text-muted-foreground">
            Kredit kamu habis atau sudah lewat masa berlaku.
          </p>
        )}

        {/* BR-1.2 — tiap paket punya tanggal hangusnya sendiri. Kalau cuma satu,
            barisnya sudah tertulis di atas. */}
        {aktif.length > 1 && (
          <ul className="mt-3 space-y-1 border-t border-border pt-3">
            {aktif
              .sort((a, b) => a.hangus_at.getTime() - b.hangus_at.getTime())
              .map((p) => (
                <li
                  key={p.id}
                  className="flex justify-between text-app-body-sm text-muted-foreground"
                >
                  <span>Hangus {hariWib(p.hangus_at)}</span>
                  <span className="tabular-nums">{p.sisa_kredit} kredit</span>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="mt-md">
        <h2 className="text-app-section">Kelas mendatang</h2>
        {booking.length === 0 ? (
          <p className="mt-2 text-app-body-sm text-muted-foreground">
            Belum ada kelas yang dipesan.{" "}
            <Link href="/jadwal" className="underline">
              Lihat jadwal
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {booking.map((b) => (
              <li key={b.id} className="rounded-md border border-border p-4">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-app-section tabular-nums">
                    {jamWib(b.mulai_at)}
                  </span>
                  <span className="rounded-full bg-ok-surface px-3 py-1 text-app-label text-ok-foreground">
                    Alat {b.nomor_alat}
                  </span>
                </div>
                <p className="mt-1 text-app-body">
                  {b.kelas}
                  {b.coach && (
                    <span className="text-muted-foreground"> · {b.coach}</span>
                  )}
                </p>
                <p className="text-app-body-sm text-muted-foreground">
                  {hariWib(b.mulai_at)} · {selisihManusiawi(b.mulai_at, sekarang)}
                </p>
                <form action={batalBooking} className="mt-3">
                  <input type="hidden" name="booking_id" value={b.id} />
                  <button
                    type="submit"
                    className="h-12 w-full rounded-sm border border-foreground text-app-label font-medium uppercase"
                  >
                    Batalkan
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-md">
        <h2 className="text-app-section">Riwayat kredit</h2>
        {/* DS — daftar sederhana, tanpa tabel bergaris. */}
        <ul className="mt-1 divide-y divide-border">
          {riwayat.map((b) => (
            <Ledger key={b.id} b={b} />
          ))}
        </ul>
        {riwayat.length === 0 && (
          <p className="mt-2 text-app-body-sm text-muted-foreground">
            Belum ada riwayat.
          </p>
        )}
      </section>
    </main>
  );
}
