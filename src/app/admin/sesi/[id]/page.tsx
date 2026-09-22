// Layar A2 Detail sesi — 02-rules.md bagian 6.1. Tampilan laptop (DS-16).
// "Peserta · waitlist · centang kehadiran · tombol Batalkan Kelas"
//
// Di sinilah momen uang demo menit 4:15: "Coach sakit." → satu klik →
// 8 kredit kembali, 11 pesan terkirim.

import Link from "next/link";
import { notFound } from "next/navigation";
import { pg } from "@/db";
import { antreanLengkap, detailSesi, pesertaSesi, type Peserta } from "@/db/admin";
import { calonPeserta } from "@/db/kelola";
import { pastikanAdmin } from "@/lib/masuk";
import { hariWib, jamWib } from "@/lib/waktu";
import { tautanWa } from "@/lib/wa";
import { Chip, Kartu, Kerangka, Tombol } from "@/components/kerangka";
import { Kembali } from "@/components/kembali";
import {
  batalkanBookingMember,
  bookingAtasNama,
  batalkanKelas,
  hadir,
  koreksiHadir,
} from "../../aksi";

export const dynamic = "force-dynamic";

const CHIP: Record<Peserta["status"], [string, string]> = {
  attended: ["bg-ok-surface text-ok-foreground", "Hadir"],
  confirmed: ["bg-neutral-surface text-neutral-foreground", "Terdaftar"],
  no_show: ["bg-danger-surface text-danger-foreground", "Tidak hadir"],
  cancelled: ["bg-neutral-surface text-neutral-foreground", "Dibatalkan"],
};

const ANTRE: Record<string, string> = {
  waiting: "Menunggu",
  promoted: "Naik",
  expired: "Hangus",
  left: "Keluar",
};

export default async function A2({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kabar?: string }>;
}) {
  const pengguna = await pastikanAdmin();
  const { id } = await params;
  const { kabar } = await searchParams;

  const sesi = await detailSesi(pg, id);
  if (!sesi) notFound();

  const sekarang = new Date();
  const [peserta, antrean, calon] = await Promise.all([
    pesertaSesi(pg, id),
    antreanLengkap(pg, id),
    calonPeserta(pg, { session_id: id, sekarang }),
  ]);

  const aktif = peserta.filter((p) => p.status !== "cancelled");
  const lewat = sesi.mulai_at < sekarang;
  const batal = sesi.status === "cancelled";

  return (
    <Kerangka
      nama={pengguna.nama}
      peran={pengguna.peran}
      aktif="/admin"
      jejak={[{ label: `${sesi.kelas} · ${jamWib(sesi.mulai_at)}` }]}
      kabar={kabar}
    >
      <Kembali cadangan="/admin" />

      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-app-title">
            {sesi.kelas} · {jamWib(sesi.mulai_at)}
          </h1>
          <p className="text-app-body-sm text-muted-foreground">
            {hariWib(sesi.mulai_at)} · {sesi.coach ?? "tanpa coach"} ·{" "}
            {aktif.length}/{sesi.kapasitas} kursi
          </p>
        </div>
        {batal && (
          <Chip
            warna="bg-danger-surface text-danger-foreground"
            anak={`Dibatalkan — ${sesi.alasan_batal}`}
          />
        )}
      </div>

      <div className="mt-sedang grid items-start gap-sedang lg:grid-cols-[3fr_2fr]">
        <Kartu judul="Peserta" padat>
          <ul className="divide-y divide-border">
            {peserta.map((p) => {
              const [warna, teks] = CHIP[p.status];
              return (
                <li key={p.booking_id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-6 shrink-0 text-app-body tabular-nums text-muted-foreground">
                    {p.nomor_alat}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/member/${p.user_id}`}
                      className="text-app-body underline underline-offset-4"
                    >
                      {p.nama}
                    </Link>
                    <p className="truncate text-app-body-sm text-muted-foreground">
                      {p.telepon}
                      {/* Penanda BR-3.5: orang ini baru dapat kursi dari
                          antrean, aturan hangusnya berbeda. */}
                      {p.sumber === "waitlist" && " · naik dari daftar tunggu"}
                    </p>
                  </div>

                  {/* DS-14 — chip statusnya tetap ada; form koreksi berdiri
                      di sebelahnya, tidak menggantikannya. */}
                  <Chip warna={warna} anak={teks} />

                  {/* BR-6.4 — koreksi no-show. Alasan wajib: kredit yang sudah
                      hangus dikembalikan, jadi harus bisa dipertanggungjawabkan. */}
                  {p.status === "no_show" && (
                    <form
                      action={koreksiHadir}
                      className="flex shrink-0 items-center gap-2"
                    >
                      <input type="hidden" name="booking_id" value={p.booking_id} />
                      <input type="hidden" name="session_id" value={sesi.id} />
                      <input
                        name="catatan"
                        required
                        minLength={3}
                        placeholder="Alasan koreksi"
                        className="h-11 w-36 rounded-sm border border-border px-3 text-app-body-sm focus:border-foreground"
                      />
                      <Tombol gaya="halus" kecil anak="Koreksi" />
                    </form>
                  )}

                  {/* BR-6.1 — centang hadir. */}
                  {p.status === "confirmed" && !batal && (
                    <form action={hadir} className="shrink-0">
                      <input type="hidden" name="booking_id" value={p.booking_id} />
                      <input type="hidden" name="session_id" value={sesi.id} />
                      <Tombol kecil anak="Hadir" />
                    </form>
                  )}

                  {/* UC-A06 — member telepon minta dibatalkan. Aturan
                      kreditnya sama persis dengan kalau dia membatalkan
                      sendiri: lewat batas waktu tetap hangus (BR-3.2). */}
                  {p.status === "confirmed" && !batal && !lewat && (
                    <form action={batalkanBookingMember} className="shrink-0">
                      <input type="hidden" name="booking_id" value={p.booking_id} />
                      <input type="hidden" name="session_id" value={sesi.id} />
                      <Tombol gaya="halus" kecil anak="Batalkan" />
                    </form>
                  )}
                </li>
              );
            })}
            {peserta.length === 0 && (
              <li className="px-4 py-3 text-app-body-sm text-muted-foreground">
                Belum ada yang mendaftar.
              </li>
            )}

            {/* UC-A05 — member telepon, meja depan yang mendaftarkan.
                Daftar pilihan sudah disaring ke yang punya kredit hidup, tapi
                kelayakan sesungguhnya tetap diputuskan bolehBooking(): jenis
                kelas yang tidak tercakup paketnya (BR-1.4) dan bentrok jam
                (BR-2.5) baru ketahuan saat tombolnya ditekan. */}
            {!batal && !lewat && aktif.length < sesi.kapasitas && (
              <li className="bg-muted px-4 py-3">
                <form
                  action={bookingAtasNama}
                  className="flex flex-wrap items-center gap-3"
                >
                  <input type="hidden" name="session_id" value={sesi.id} />
                  <label
                    className="text-app-label uppercase text-muted-foreground"
                    htmlFor="user_id"
                  >
                    Daftarkan member
                  </label>
                  <select
                    id="user_id"
                    name="user_id"
                    required
                    className="h-11 min-w-56 flex-1 rounded-sm border border-border bg-background px-3 text-app-body-sm"
                  >
                    <option value="">Pilih nama…</option>
                    {calon.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nama} · {c.sisa_kredit} kredit
                      </option>
                    ))}
                  </select>
                  <Tombol kecil anak="Daftarkan" />
                </form>
              </li>
            )}
          </ul>
        </Kartu>

        <div className="space-y-sedang">
          <Kartu judul="Daftar tunggu" padat>
            {antrean.length === 0 ? (
              <p className="p-4 text-app-body-sm text-muted-foreground">
                Tidak ada yang mengantre.
              </p>
            ) : (
              <ol className="divide-y divide-border">
                {antrean.map((a, i) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-app-body">
                        <span className="tabular-nums text-muted-foreground">
                          {i + 1}.
                        </span>{" "}
                        {a.nama}
                      </p>
                      <p className="text-app-body-sm text-muted-foreground">
                        {ANTRE[a.status] ?? a.status} · {jamWib(a.created_at)}
                      </p>
                    </div>
                    <a
                      href={tautanWa(
                        a.telepon,
                        `Halo ${a.nama}, ada kabar soal kelas ${sesi.kelas}.`,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 shrink-0 items-center rounded-sm border border-border px-3 text-app-label uppercase hover:border-foreground"
                    >
                      WA
                    </a>
                  </li>
                ))}
              </ol>
            )}
          </Kartu>

          {!batal && !lewat && (
            <Kartu
              judul="Batalkan kelas"
              catatan="Semua kredit kembali penuh, tanpa melihat jam. Paket yang hampir hangus ikut diperpanjang."
              warna="bg-danger-surface border-danger-foreground/25"
            >
              <form action={batalkanKelas} className="space-y-3">
                <input type="hidden" name="session_id" value={sesi.id} />
                <input
                  name="alasan"
                  required
                  minLength={3}
                  placeholder="Alasan — mis. coach sakit"
                  className="h-11 w-full rounded-sm border border-danger-foreground/30 bg-background px-3 text-app-body focus:border-danger-foreground"
                />
                {sesi.coach && (
                  <label className="flex items-center gap-2 text-app-body-sm text-danger-foreground">
                    <input type="checkbox" name="massal" value="ya" className="size-4" />
                    {/* BR-5.4 — "coach sakit" membatalkan satu hari penuh. */}
                    Batalkan semua kelas {sesi.coach} hari ini
                  </label>
                )}
                <Tombol gaya="bahaya" penuh anak="Batalkan Kelas" />
              </form>
            </Kartu>
          )}
        </div>
      </div>
    </Kerangka>
  );
}
