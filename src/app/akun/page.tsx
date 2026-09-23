// Layar M3 Akun Saya — sisa kredit + tanggal hangus + hitung mundur ·
// booking aktif · riwayat kredit.

import Link from "next/link";
import { redirect } from "next/navigation";
import { pg } from "@/db";
import {
  antreanSaya,
  bookingSaya,
  paketMember,
  riwayatKredit,
  type BarisLedger,
} from "@/db/booking";
import { penggunaById } from "@/db/admin";
import { userSaatIni } from "@/lib/masuk";
import {
  hariPendekWib,
  hariWib,
  jamWib,
  selisihManusiawi,
} from "@/lib/waktu";
import { Angka, Chip, Kartu, Kerangka, Tombol } from "@/components/kerangka";
import { batalBooking, keluarWaitlist } from "./aksi";

export const dynamic = "force-dynamic";

const MENDESAK = 7 * 86_400_000;

function Ledger({ b }: { b: BarisLedger }) {
  const naik = b.delta > 0;
  return (
    <li className="flex items-baseline justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        {/* AGENTS.md — nilai `alasan` tampil apa adanya; hanya garis bawahnya
            diganti spasi. */}
        <p className="text-app-body first-letter:uppercase">
          {b.alasan.replace(/_/g, " ")}
        </p>
        <p className="truncate text-app-body-sm text-muted-foreground">
          {b.kelas && b.mulai_at
            ? `${b.kelas} · ${hariWib(b.mulai_at)} ${jamWib(b.mulai_at)}`
            : hariWib(b.created_at)}
          {b.catatan && ` · ${b.catatan}`}
        </p>
      </div>
      <span
        className={`shrink-0 text-app-section tabular-nums ${
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

  const [paket, booking, antre, riwayat, saya] = await Promise.all([
    paketMember(pg, user_id),
    bookingSaya(pg, user_id),
    antreanSaya(pg, user_id),
    riwayatKredit(pg, user_id),
    penggunaById(pg, user_id),
  ]);
  if (!saya) redirect("/masuk");

  // BR-1.7 — dijumlahkan dari buku besar, tidak ada kolom saldo.
  const aktif = paket.filter((p) => p.hangus_at > sekarang && p.sisa_kredit > 0);
  const sisa = aktif.reduce((t, p) => t + p.sisa_kredit, 0);
  // BR-1.5 — yang paling cepat hangus dipakai duluan, jadi itu yang ditonjolkan.
  const urut = [...aktif].sort(
    (a, b) => a.hangus_at.getTime() - b.hangus_at.getTime(),
  );
  const terdekat = urut[0];
  const mepet = terdekat && terdekat.hangus_at.getTime() - sekarang.getTime() < MENDESAK;

  return (
    <Kerangka
      nama={saya.nama}
      peran={saya.peran}
      aktif="/akun"
      judul="Akun Saya"
      kabar={kabar}
    >
      <Kartu>
        <Angka
          nilai={sisa}
          label="Sisa kredit"
          catatan={
            terdekat
              ? `Hangus ${hariWib(terdekat.hangus_at)} · ${selisihManusiawi(terdekat.hangus_at, sekarang)}`
              : "Kredit kamu habis atau sudah lewat masa berlaku."
          }
          warnaCatatan={mepet ? "text-warn-foreground" : "text-muted-foreground"}
        />

        {/* BR-1.2 — tiap paket punya tanggal hangusnya sendiri. */}
        {urut.length > 1 && (
          <ul className="mt-3 space-y-1 border-t border-border pt-3">
            {urut.map((p) => (
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
      </Kartu>

      {/* BR-4.7 — antrean sendiri, lengkap dengan jalan keluarnya. */}
      {antre.length > 0 && (
        <div className="mt-dekat">
          <Kartu
            judul="Daftar tunggu"
            catatan="Kredit belum dipotong. Kalau ada yang batal, kamu naik otomatis."
            padat
          >
            <ul className="divide-y divide-border">
              {antre.map((a) => (
                <li
                  key={a.entry_id}
                  className="flex items-center gap-4 px-4 py-4"
                >
                  <div className="w-14 shrink-0">
                    <p className="text-app-section tabular-nums">
                      {jamWib(a.mulai_at)}
                    </p>
                    <p className="text-app-label uppercase text-muted-foreground">
                      {hariPendekWib(a.mulai_at)}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-app-body">{a.kelas}</p>
                    <p className="truncate text-app-body-sm text-muted-foreground">
                      {a.coach ?? "—"}
                    </p>
                  </div>
                  <Chip
                    warna="bg-warn-surface text-warn-foreground"
                    anak={`Antrean ke-${a.posisi}`}
                  />
                  <form action={keluarWaitlist} className="shrink-0">
                    <input type="hidden" name="entry_id" value={a.entry_id} />
                    <Tombol gaya="halus" kecil anak="Keluar" />
                  </form>
                </li>
              ))}
            </ul>
          </Kartu>
        </div>
      )}

      <div className="mt-dekat">
        <Kartu judul="Kelas mendatang" padat>
          {booking.length === 0 ? (
            <p className="p-4 text-app-body-sm text-muted-foreground">
              Belum ada kelas yang dipesan.{" "}
              <Link href="/jadwal" className="underline underline-offset-4">
                Lihat jadwal
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {booking.map((b) => (
                <li key={b.id} className="flex items-center gap-4 px-4 py-4">
                  <div className="w-14 shrink-0">
                    <p className="text-app-section tabular-nums">
                      {jamWib(b.mulai_at)}
                    </p>
                    <p className="text-app-label uppercase text-muted-foreground">
                      {b.durasi_menit}m
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-app-body">{b.kelas}</p>
                    <p className="truncate text-app-body-sm text-muted-foreground">
                      {hariWib(b.mulai_at)} · {selisihManusiawi(b.mulai_at, sekarang)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Chip
                      warna="bg-ok-surface text-ok-foreground"
                      anak={`Tempat ${b.nomor_alat}`}
                    />
                    <form action={batalBooking}>
                      <input type="hidden" name="booking_id" value={b.id} />
                      <Tombol gaya="halus" kecil anak="Batal" />
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Kartu>
      </div>

      <div className="mt-dekat">
        <Kartu
          judul="Riwayat kredit"
          catatan="Sisa kredit = jumlah kolom kanan. Tidak ada angka saldo yang disimpan terpisah."
          padat
        >
          {riwayat.length === 0 ? (
            <p className="p-4 text-app-body-sm text-muted-foreground">
              Belum ada riwayat.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {riwayat.map((b) => (
                <Ledger key={b.id} b={b} />
              ))}
            </ul>
          )}
        </Kartu>
      </div>
    </Kerangka>
  );
}
