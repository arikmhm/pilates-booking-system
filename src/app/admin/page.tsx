// Layar A1 Dashboard hari ini — 02-rules.md bagian 6.1. Tampilan laptop (DS-16).
// "Sesi hari ini + okupansi · panel kredit hangus ≤ 7 hari · kartu setelan"
//
// Panel kredit hangus BUKAN laporan. Itu daftar orang yang harus di-chat hari
// ini, lengkap dengan tombolnya. Kalimat menit 2:15: "5 orang habis minggu
// ini. Sistemnya yang cari, bukan Kakak."

import Link from "next/link";
import { pg } from "@/db";
import {
  BATAS_SETELAN,
  kreditMauHangus,
  sesiHariIni,
  setelanLengkap,
  type SesiHariIni,
} from "@/db/admin";
import { STUDIO_DEMO } from "@/db/seed";
import { pastikanAdmin } from "@/lib/masuk";
import { hariWib, jamWib, selisihManusiawi } from "@/lib/waktu";
import { tautanWa } from "@/lib/wa";
import { Angka, Chip, Kartu, Kerangka, Tombol } from "@/components/kerangka";
import { resetDemo, ubahSetelan } from "./aksi";

export const dynamic = "force-dynamic";

const LABEL_SETELAN: Record<string, string> = {
  cancel_window_hours: "Batas pembatalan (jam)",
  booking_opens_days: "Booking dibuka (hari)",
  waitlist_max: "Maksimal daftar tunggu",
};

function chipSesi(s: SesiHariIni): [string, string] {
  if (s.status === "cancelled")
    return ["bg-danger-surface text-danger-foreground", "Dibatalkan"];
  if (s.terisi >= s.kapasitas)
    return [
      "bg-neutral-surface text-neutral-foreground",
      s.antre ? `Penuh · ${s.antre} antre` : "Penuh",
    ];
  return ["bg-ok-surface text-ok-foreground", `${s.kapasitas - s.terisi} kursi`];
}

export default async function A1({
  searchParams,
}: {
  searchParams: Promise<{ kabar?: string; hari?: string }>;
}) {
  const pengguna = await pastikanAdmin();
  const { kabar, hari } = await searchParams;
  const sekarang = new Date();
  // Sesi penuh + daftar tunggu yang dipakai skenario B ada BESOK pagi
  // (02-rules.md 6.2). Tanpa pengalih ini presenter tidak punya jalan ke A2
  // sesi itu di tengah demo.
  const owner = pengguna.peran === "owner";
  const geser = hari === "besok" ? 1 : 0;
  const tanggal = new Date(sekarang.getTime() + geser * 86_400_000);

  const [sesi, hangus, setelan] = await Promise.all([
    sesiHariIni(pg, geser),
    kreditMauHangus(pg),
    setelanLengkap(pg),
  ]);

  const terisi = sesi.reduce((t, s) => t + s.terisi, 0);
  const kursi = sesi.reduce((t, s) => t + s.kapasitas, 0);

  return (
    <Kerangka
      nama={pengguna.nama}
      peran={pengguna.peran}
      aktif="/admin"
      kabar={kabar}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-app-title">{setelan.nama}</h1>
          <p className="text-app-body-sm text-muted-foreground">
            {hariWib(tanggal)}
          </p>
        </div>
        <nav className="flex gap-2">
          {[
            ["/admin", "Hari ini", 0],
            ["/admin?hari=besok", "Besok", 1],
          ].map(([href, label, g]) => (
            <Link
              key={String(label)}
              href={String(href)}
              className={`inline-flex min-h-11 items-center rounded-sm border px-4 text-app-label uppercase transition-colors ${
                g === geser
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background hover:border-foreground"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-dekat grid gap-4 sm:grid-cols-3">
        <Kartu>
          <Angka nilai={sesi.length} label={geser ? "Kelas besok" : "Kelas hari ini"} />
        </Kartu>
        <Kartu>
          <Angka nilai={`${terisi}/${kursi}`} label="Kursi terisi" />
        </Kartu>
        <Kartu>
          <Angka nilai={hangus.length} label="Kredit hangus ≤ 7 hari" />
        </Kartu>
      </div>

      <div className="mt-sedang grid items-start gap-sedang lg:grid-cols-[3fr_2fr]">
        <Kartu judul={geser ? "Kelas besok" : "Kelas hari ini"} padat>
          {sesi.length === 0 ? (
            <p className="p-4 text-app-body-sm text-muted-foreground">
              Tidak ada kelas terjadwal.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {sesi.map((s) => {
                const [warna, teks] = chipSesi(s);
                return (
                  <li key={s.id}>
                    <Link
                      href={`/admin/sesi/${s.id}`}
                      className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-muted"
                    >
                      <span className="w-14 shrink-0 text-app-section tabular-nums">
                        {jamWib(s.mulai_at)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-app-body">{s.kelas}</span>
                        <span className="block truncate text-app-body-sm text-muted-foreground">
                          {s.coach ?? "—"}
                        </span>
                      </span>
                      <span className="w-14 shrink-0 text-right text-app-body tabular-nums">
                        {s.terisi}/{s.kapasitas}
                      </span>
                      <span className="w-28 shrink-0 text-right">
                        <Chip warna={warna} anak={teks} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Kartu>

        <div className="space-y-sedang">
          {/* Satu-satunya blok berwarna di halaman — DS, supaya mata langsung
              ke sini. Ini yang ditunjuk saat presentasi. */}
          <Kartu
            judul="Kredit hangus ≤ 7 hari"
            catatan={`${hangus.length} orang. Sistem yang mencari, bukan kamu.`}
            warna="bg-warn-surface border-border-warm"
            padat
          >
            {hangus.length === 0 ? (
              <p className="p-4 text-app-body-sm text-warn-foreground">
                Tidak ada yang mendesak minggu ini.
              </p>
            ) : (
              <ul className="divide-y divide-border-warm">
                {hangus.map((o) => (
                  <li
                    key={o.user_id + o.hangus_at.toISOString()}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/admin/member/${o.user_id}`}
                        className="text-app-body underline underline-offset-4"
                      >
                        {o.nama}
                      </Link>
                      <p className="text-app-body-sm text-warn-foreground">
                        {o.sisa} kredit · {selisihManusiawi(o.hangus_at, sekarang)}
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
                      className="inline-flex min-h-11 shrink-0 items-center rounded-sm bg-primary px-4 text-app-label font-medium uppercase text-primary-foreground transition hover:brightness-95"
                    >
                      Chat WA
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Kartu>

          {/* Kewenangan owner (02-rules.md bagian 5): ini syarat studio
              untuk semua member sekaligus, bukan tugas harian meja depan.
              Penjaga sebenarnya ada di server action — yang ini cuma
              menghindari tombol yang pasti ditolak. */}
          {owner ? (
            <Kartu
              judul="Setelan aturan"
              catatan="Ini aturan studio kamu, bukan aturan sistem. Ubah kapan saja."
            >
              <form action={ubahSetelan} className="space-y-3">
                {(Object.keys(BATAS_SETELAN) as (keyof typeof BATAS_SETELAN)[]).map(
                  (kunci) => (
                    <label
                      key={kunci}
                      className="flex items-center justify-between gap-4"
                    >
                      <span className="text-app-body">{LABEL_SETELAN[kunci]}</span>
                      <input
                        type="number"
                        name={kunci}
                        defaultValue={setelan[kunci]}
                        min={BATAS_SETELAN[kunci][0]}
                        max={BATAS_SETELAN[kunci][1]}
                        className="h-11 w-24 rounded-sm border border-border px-3 text-app-body tabular-nums focus:border-foreground"
                      />
                    </label>
                  ),
                )}
                <Tombol gaya="garis" penuh anak="Simpan" />
              </form>
            </Kartu>
          ) : (
            <Kartu judul="Setelan aturan">
              <p className="text-app-body-sm text-muted-foreground">
                Batas pembatalan, jendela booking, dan maksimal daftar tunggu
                hanya bisa diubah pemilik studio.
              </p>
            </Kartu>
          )}

          {/* Hanya muncul di database demo. Penjaga sebenarnya ada di seed()
              yang menolak jalan kalau studionya bukan studio demo — ini cuma
              supaya tombolnya tidak menggoda di instance klien. */}
          {setelan.nama === STUDIO_DEMO && (
            <Kartu
              judul="Reset demo"
              catatan="Kembalikan semua data ke keadaan awal. Tanggal dihitung ulang dari hari ini, dan kamu tetap login."
            >
              <form action={resetDemo}>
                <Tombol gaya="halus" penuh anak="Reset Demo" />
              </form>
            </Kartu>
          )}
        </div>
      </div>
    </Kerangka>
  );
}
