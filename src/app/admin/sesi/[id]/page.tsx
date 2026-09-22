// Layar A2 Detail sesi — 02-rules.md bagian 6.1. Tampilan laptop (DS-16).
// "Peserta · waitlist · centang kehadiran · tombol Batalkan Kelas"
//
// Di sinilah momen uang demo menit 4:15: "Coach sakit." → satu klik →
// 8 kredit kembali, 11 pesan terkirim.

import Link from "next/link";
import { notFound } from "next/navigation";
import { pg } from "@/db";
import {
  antreanLengkap,
  detailSesi,
  pesertaSesi,
  type Peserta,
} from "@/db/admin";
import { pastikanAdmin } from "@/lib/masuk";
import { hariWib, jamWib } from "@/lib/waktu";
import { tautanWa } from "@/lib/wa";
import { batalkanKelas, hadir, koreksiHadir } from "../../aksi";

export const dynamic = "force-dynamic";

const CHIP: Record<Peserta["status"], [string, string]> = {
  attended: ["bg-ok-surface text-ok-foreground", "Hadir"],
  confirmed: ["bg-neutral-surface text-neutral-foreground", "Terdaftar"],
  no_show: ["bg-danger-surface text-danger-foreground", "Tidak hadir"],
  cancelled: ["bg-neutral-surface text-neutral-foreground", "Dibatalkan"],
};

export default async function A2({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kabar?: string }>;
}) {
  await pastikanAdmin();
  const { id } = await params;
  const { kabar } = await searchParams;

  const sesi = await detailSesi(pg, id);
  if (!sesi) notFound();

  const [peserta, antrean] = await Promise.all([
    pesertaSesi(pg, id),
    antreanLengkap(pg, id),
  ]);

  const aktif = peserta.filter((p) => p.status !== "cancelled");
  const lewat = sesi.mulai_at < new Date();
  const batal = sesi.status === "cancelled";

  return (
    <main className="mx-auto w-full max-w-[1200px] px-gutter py-sm">
      <Link href="/admin" className="inline-flex min-h-11 items-center text-app-body-sm">
        ← Dashboard
      </Link>

      <header className="mt-2 flex flex-wrap items-baseline justify-between gap-4">
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
          <span className="rounded-full bg-danger-surface px-3 py-1 text-app-label text-danger-foreground">
            Dibatalkan — {sesi.alasan_batal}
          </span>
        )}
      </header>

      {kabar && (
        <p className="mt-sm rounded-md bg-muted p-4 text-app-body-sm">{kabar}</p>
      )}

      <div className="mt-md grid gap-md lg:grid-cols-[3fr_2fr]">
        <section>
          <h2 className="text-app-section">Peserta</h2>
          <ul className="mt-3 divide-y divide-border rounded-md border border-border">
            {peserta.map((p) => {
              const [warna, teks] = CHIP[p.status];
              return (
                <li key={p.booking_id} className="flex flex-wrap items-center gap-3 p-4">
                  <span className="w-8 text-app-body tabular-nums text-muted-foreground">
                    {p.nomor_alat}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/member/${p.user_id}`}
                      className="text-app-body underline"
                    >
                      {p.nama}
                    </Link>
                    <p className="text-app-body-sm text-muted-foreground">
                      {p.telepon}
                      {/* Penanda BR-3.5: orang ini baru dapat kursi dari
                          antrean, aturan hangusnya berbeda. */}
                      {p.sumber === "waitlist" && " · naik dari daftar tunggu"}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-app-label ${warna}`}>
                    {teks}
                  </span>

                  {/* BR-6.1 — centang hadir. Aktif sejak kelas berjalan. */}
                  {p.status === "confirmed" && !batal && (
                    <form action={hadir}>
                      <input type="hidden" name="booking_id" value={p.booking_id} />
                      <input type="hidden" name="session_id" value={sesi.id} />
                      <button
                        type="submit"
                        className="inline-flex min-h-11 items-center rounded-sm bg-primary px-4 text-app-label font-medium uppercase text-primary-foreground"
                      >
                        Hadir
                      </button>
                    </form>
                  )}

                  {/* BR-6.4 — koreksi no-show. Alasan wajib: kredit yang
                      sudah hangus dikembalikan, jadi harus bisa dipertanggungjawabkan. */}
                  {p.status === "no_show" && (
                    <form action={koreksiHadir} className="flex items-center gap-2">
                      <input type="hidden" name="booking_id" value={p.booking_id} />
                      <input type="hidden" name="session_id" value={sesi.id} />
                      <input
                        name="catatan"
                        required
                        minLength={3}
                        placeholder="Alasan koreksi"
                        className="h-11 w-40 rounded-sm border border-border px-3 text-app-body-sm"
                      />
                      <button
                        type="submit"
                        className="inline-flex min-h-11 items-center rounded-sm border border-foreground px-4 text-app-label font-medium uppercase"
                      >
                        Koreksi
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
            {peserta.length === 0 && (
              <li className="p-4 text-app-body-sm text-muted-foreground">
                Belum ada yang mendaftar.
              </li>
            )}
          </ul>
        </section>

        <div className="space-y-md">
          <section className="rounded-md border border-border p-4">
            <h2 className="text-app-section">Daftar tunggu</h2>
            <ol className="mt-3 divide-y divide-border">
              {antrean.map((a, i) => (
                <li key={a.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="text-app-body">
                      <span className="tabular-nums text-muted-foreground">
                        {i + 1}.
                      </span>{" "}
                      {a.nama}
                    </p>
                    <p className="text-app-body-sm text-muted-foreground">
                      {a.status === "waiting" ? "Menunggu" : a.status} ·{" "}
                      {jamWib(a.created_at)}
                    </p>
                  </div>
                  <a
                    href={tautanWa(a.telepon, `Halo ${a.nama}, ada kabar soal kelas ${sesi.kelas}.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center text-app-body-sm underline"
                  >
                    WA
                  </a>
                </li>
              ))}
            </ol>
            {antrean.length === 0 && (
              <p className="mt-2 text-app-body-sm text-muted-foreground">
                Tidak ada yang mengantre.
              </p>
            )}
          </section>

          {!batal && !lewat && (
            <section className="rounded-md border border-danger-foreground/30 bg-danger-surface p-4">
              <h2 className="text-app-section text-danger-foreground">
                Batalkan kelas
              </h2>
              <p className="text-app-body-sm text-danger-foreground">
                Semua kredit kembali penuh, tanpa melihat jam. Paket yang hampir
                hangus ikut diperpanjang.
              </p>
              <form action={batalkanKelas} className="mt-3 space-y-3">
                <input type="hidden" name="session_id" value={sesi.id} />
                <input
                  name="alasan"
                  required
                  minLength={3}
                  placeholder="Alasan — mis. coach sakit"
                  className="h-11 w-full rounded-sm border border-border bg-background px-3 text-app-body"
                />
                {sesi.coach && (
                  <label className="flex items-center gap-2 text-app-body-sm">
                    <input
                      type="checkbox"
                      name="massal"
                      value="ya"
                      className="size-4"
                    />
                    {/* BR-5.4 — "coach sakit" membatalkan satu hari penuh,
                        bukan satu kelas. */}
                    Batalkan semua kelas {sesi.coach} hari ini
                  </label>
                )}
                <button
                  type="submit"
                  className="h-12 w-full rounded-sm bg-danger-surface text-app-label font-medium uppercase text-danger-foreground ring-1 ring-danger-foreground/40"
                >
                  Batalkan Kelas
                </button>
              </form>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
