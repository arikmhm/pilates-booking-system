// Layar A1 Dashboard hari ini — 02-rules.md bagian 6.1. Tampilan laptop (DS-16).
// "Sesi hari ini + okupansi · panel kredit hangus ≤ 7 hari · kartu setelan"
//
// Panel kredit hangus BUKAN laporan. Itu daftar orang yang harus di-chat hari
// ini, lengkap dengan tombolnya. Kalimat menit 2:15: "5 orang habis minggu
// ini. Sistemnya yang cari, bukan Kakak."

import Link from "next/link";
import { redirect } from "next/navigation";
import { pg } from "@/db";
import {
  BATAS_SETELAN,
  kreditMauHangus,
  penggunaById,
  sesiHariIni,
  setelanLengkap,
  type SesiHariIni,
} from "@/db/admin";
import { userSaatIni } from "@/lib/masuk";
import { hariWib, jamWib, selisihManusiawi } from "@/lib/waktu";
import { tautanWa } from "@/lib/wa";
import { ubahSetelan } from "./aksi";

export const dynamic = "force-dynamic";

const LABEL_SETELAN: Record<string, string> = {
  cancel_window_hours: "Batas pembatalan (jam)",
  booking_opens_days: "Booking dibuka (hari)",
  waitlist_max: "Maksimal daftar tunggu",
};

function Okupansi({ s }: { s: SesiHariIni }) {
  const batal = s.status === "cancelled";
  const penuh = s.terisi >= s.kapasitas;
  const warna = batal
    ? "bg-danger-surface text-danger-foreground"
    : penuh
      ? "bg-neutral-surface text-neutral-foreground"
      : "bg-ok-surface text-ok-foreground";
  const teks = batal
    ? "Dibatalkan"
    : penuh
      ? `Penuh${s.antre ? ` · ${s.antre} antre` : ""}`
      : `${s.kapasitas - s.terisi} kursi`;

  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-3 pr-4 text-app-body tabular-nums">{jamWib(s.mulai_at)}</td>
      <td className="py-3 pr-4 text-app-body">{s.kelas}</td>
      <td className="py-3 pr-4 text-app-body text-muted-foreground">
        {s.coach ?? "—"}
      </td>
      <td className="py-3 pr-4 text-app-body tabular-nums">
        {s.terisi}/{s.kapasitas}
      </td>
      <td className="py-3">
        <span className={`rounded-full px-3 py-1 text-app-label ${warna}`}>{teks}</span>
      </td>
    </tr>
  );
}

export default async function A1({
  searchParams,
}: {
  searchParams: Promise<{ kabar?: string }>;
}) {
  const user_id = await userSaatIni();
  if (!user_id) redirect("/masuk");

  const pengguna = await penggunaById(pg, user_id);
  if (!pengguna) redirect("/masuk");
  // BR-9.1 — member tidak punya akses layar admin.
  if (pengguna.peran === "member" || pengguna.peran === "coach") redirect("/jadwal");

  const { kabar } = await searchParams;
  const sekarang = new Date();

  const [sesi, hangus, setelan] = await Promise.all([
    sesiHariIni(pg),
    kreditMauHangus(pg),
    setelanLengkap(pg),
  ]);

  const terisi = sesi.reduce((t, s) => t + s.terisi, 0);
  const kursi = sesi.reduce((t, s) => t + s.kapasitas, 0);

  return (
    <main className="mx-auto w-full max-w-[1200px] px-gutter py-sm">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-app-title">{setelan.nama}</h1>
          <p className="text-app-body-sm text-muted-foreground">
            {hariWib(sekarang)} · {pengguna.nama}
          </p>
        </div>
        <Link href="/masuk" className="inline-flex min-h-11 items-center text-app-body-sm">
          Ganti pengguna
        </Link>
      </header>

      {kabar && (
        <p className="mt-sm rounded-md bg-muted p-4 text-app-body-sm">{kabar}</p>
      )}

      <div className="mt-sm grid gap-4 sm:grid-cols-3">
        {[
          [sesi.length, "kelas hari ini"],
          [`${terisi}/${kursi}`, "kursi terisi"],
          [hangus.length, "kredit hangus ≤ 7 hari"],
        ].map(([angka, label]) => (
          <div key={String(label)} className="rounded-md border border-border p-4">
            <p className="text-app-number tabular-nums">{angka}</p>
            <p className="text-app-body-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div className="mt-md grid gap-md lg:grid-cols-[3fr_2fr]">
        <section>
          <h2 className="text-app-section">Kelas hari ini</h2>
          {sesi.length === 0 ? (
            <p className="mt-2 text-app-body-sm text-muted-foreground">
              Tidak ada kelas terjadwal hari ini.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[32rem]">
                <thead>
                  <tr className="border-b border-border text-left">
                    {["Jam", "Kelas", "Coach", "Isi", "Status"].map((h) => (
                      <th
                        key={h}
                        className="px-0 py-3 pr-4 text-app-label uppercase text-muted-foreground first:pl-4 last:pr-4"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="[&_td:first-child]:pl-4 [&_td:last-child]:pr-4">
                  {sesi.map((s) => (
                    <Okupansi key={s.id} s={s} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="space-y-md">
          {/* Satu-satunya blok berwarna di halaman — DS, supaya mata langsung
              ke sini. Ini yang ditunjuk saat presentasi. */}
          <section className="rounded-md bg-warn-surface p-4">
            <h2 className="text-app-section">Kredit hangus ≤ 7 hari</h2>
            <p className="text-app-body-sm text-warn-foreground">
              {hangus.length} orang. Sistem yang mencari, bukan kamu.
            </p>
            <ul className="mt-3 divide-y divide-border-warm">
              {hangus.map((o) => (
                <li
                  key={o.user_id + o.hangus_at.toISOString()}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div>
                    <p className="text-app-body">{o.nama}</p>
                    <p className="text-app-body-sm text-warn-foreground">
                      {o.sisa} kredit · hangus {selisihManusiawi(o.hangus_at, sekarang)}
                    </p>
                  </div>
                  <a
                    href={tautanWa(
                      o.telepon,
                      `Halo ${o.nama}, sisa ${o.sisa} kredit pilates kamu hangus ${hariWib(
                        o.hangus_at,
                      )}. Masih sempat dipakai — mau dibookingkan kelas minggu ini?`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 shrink-0 items-center rounded-sm bg-primary px-4 text-app-label font-medium uppercase text-primary-foreground"
                  >
                    Chat WA
                  </a>
                </li>
              ))}
            </ul>
            {hangus.length === 0 && (
              <p className="mt-3 text-app-body-sm text-warn-foreground">
                Tidak ada yang mendesak minggu ini.
              </p>
            )}
          </section>

          <section className="rounded-md border border-border p-4">
            <h2 className="text-app-section">Setelan aturan</h2>
            <p className="text-app-body-sm text-muted-foreground">
              Ini aturan studio kamu, bukan aturan sistem. Ubah kapan saja.
            </p>
            <form action={ubahSetelan} className="mt-3 space-y-3">
              {(Object.keys(BATAS_SETELAN) as (keyof typeof BATAS_SETELAN)[]).map(
                (kunci) => (
                  <label key={kunci} className="flex items-center justify-between gap-4">
                    <span className="text-app-body">{LABEL_SETELAN[kunci]}</span>
                    <input
                      type="number"
                      name={kunci}
                      defaultValue={setelan[kunci]}
                      min={BATAS_SETELAN[kunci][0]}
                      max={BATAS_SETELAN[kunci][1]}
                      className="h-11 w-24 rounded-sm border border-border px-3 text-app-body tabular-nums"
                    />
                  </label>
                ),
              )}
              <button
                type="submit"
                className="h-12 w-full rounded-sm border border-foreground text-app-label font-medium uppercase"
              >
                Simpan
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
