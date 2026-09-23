// Kalender mingguan layar M1 — hari jadi kolom, jam jadi baris. Komponen server
// murni. DS-52 — tinggi baris mengikuti ISINYA, bukan durasinya: jam tanpa kelas
// tidak digambar dan sesi berbarengan ditumpuk di petak yang sama.

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  kunciHariWib,
  menitHariWib,
  namaHariWib,
  nomorHariWib,
} from "@/lib/waktu";
import type { BarisJadwal } from "@/db/booking";

export type IsiBlok = {
  warna: string;
  catatan: string;
  /** Null = blok mati. */
  bungkus?: (anak: React.ReactNode) => React.ReactNode;
  /** Tombol aksi eksplisit — hanya rupa daftar (DS-51); kartu kalender tetap
   *  satu target sentuh utuh (DS-32). */
  tombol?: React.ReactNode;
};

/** Sembilan kolom: lajur jam, tujuh hari, lajur tombol kanan — tombol geser
 *  minggu duduk di dua lajur tepi itu (DS-51). */
const KOLOM =
  "grid grid-cols-[2.75rem_repeat(7,minmax(0,1fr))_2.75rem]";

function Geser({
  href,
  anak,
  label,
}: {
  href: string;
  anak: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="inline-flex size-11 items-center justify-center justify-self-center rounded-full border border-border transition-colors hover:border-foreground"
    >
      {anak}
    </Link>
  );
}

/** Baris kepala minggu. Dipakai dua kali: kepala kalender (`tautan` kosong) dan
 *  pemilih hari di rupa daftar (`tautan` terisi). */
export function KepalaMinggu({
  hari,
  ditandai,
  hariIni,
  mundur,
  maju,
  tautan,
}: {
  hari: Date[];
  ditandai: number;
  /** Indeks hari ini, atau −1 kalau minggu ini bukan minggunya. */
  hariIni: number;
  mundur: string;
  maju: string;
  tautan?: (i: number) => string;
}) {
  return (
    <div className={`${KOLOM} items-center bg-background`}>
      <Geser
        href={mundur}
        anak={<ChevronLeft className="size-4" />}
        label="Minggu sebelumnya"
      />

      {hari.map((h, i) => {
        const pilih = i === ditandai;
        const dalam = (
          <>
            <span className="text-app-label uppercase text-muted-foreground">
              {namaHariWib(h)}
            </span>
            <span
              className={`mt-0.5 inline-flex size-7 items-center justify-center rounded-full text-app-body tabular-nums ${
                pilih ? "bg-primary text-primary-foreground" : ""
              }`}
            >
              {nomorHariWib(h)}
            </span>
          </>
        );
        // Latar tipis = hari ini; lingkaran `primary` = hari yang DIPILIH.
        const gaya = `flex flex-col items-center py-1.5 ${
          i === hariIni ? "bg-muted" : ""
        }`;

        return tautan ? (
          <Link
            key={kunciHariWib(h)}
            href={tautan(i)}
            aria-current={pilih ? "date" : undefined}
            className={`${gaya} transition-colors hover:bg-muted`}
          >
            {dalam}
          </Link>
        ) : (
          <div
            key={kunciHariWib(h)}
            aria-current={pilih ? "date" : undefined}
            className={gaya}
          >
            {dalam}
          </div>
        );
      })}

      <Geser
        href={maju}
        anak={<ChevronRight className="size-4" />}
        label="Minggu berikutnya"
      />
    </div>
  );
}

function KartuSesi({
  b,
  isi,
}: {
  b: BarisJadwal;
  isi: (b: BarisJadwal) => IsiBlok;
}) {
  const { warna, catatan, bungkus } = isi(b);
  const mulai = menitHariWib(b.mulai_at);
  const dalam = (
    <div
      className={`flex w-full flex-col gap-0.5 rounded-sm border px-2 py-1.5 text-left ${warna}`}
    >
      <p className="text-app-label tabular-nums">
        {String(Math.floor(mulai / 60)).padStart(2, "0")}.
        {String(mulai % 60).padStart(2, "0")}
        <span className="opacity-60"> · {b.durasi_menit}m</span>
      </p>
      <p className="truncate text-app-body-sm font-medium">{b.kelas}</p>
      <p className="truncate text-app-label opacity-70">{b.coach ?? "—"}</p>
      <p className="truncate text-app-label">{catatan}</p>
    </div>
  );
  return bungkus ? bungkus(dalam) : dalam;
}

export function Kalender({
  hari,
  baris,
  isi,
  ditandai,
  hariIni,
  mundur,
  maju,
  polos,
}: {
  hari: Date[];
  baris: BarisJadwal[];
  isi: (b: BarisJadwal) => IsiBlok;
  ditandai: number;
  hariIni: number;
  mundur: string;
  maju: string;
  /**
   * Tanpa tepi sendiri — kalender duduk di dalam kotak jadwal (DS-57).
   * `overflow-x-auto` WAJIB tetap di sini: leluhur ber-overflow melepas
   * `sticky` bilah kendali di atasnya.
   */
  polos?: boolean;
}) {
  // Jam tanpa kelas tidak pernah jadi baris.
  const petak = new Map<string, BarisJadwal[]>();
  const jamAda = new Set<number>();
  for (const b of baris) {
    const j = Math.floor(menitHariWib(b.mulai_at) / 60);
    const kunci = `${j}|${kunciHariWib(b.mulai_at)}`;
    petak.set(kunci, [...(petak.get(kunci) ?? []), b]);
    jamAda.add(j);
  }
  const jam = [...jamAda].sort((a, b) => a - b);

  return (
    <div
      className={`overflow-x-auto ${
        polos ? "" : "rounded-md border border-border bg-background"
      }`}
    >
      <div className="min-w-[46rem]">
        <KepalaMinggu
          hari={hari}
          ditandai={ditandai}
          hariIni={hariIni}
          mundur={mundur}
          maju={maju}
        />

        {jam.map((j) => (
          <div key={j} className={`${KOLOM} border-t border-border`}>
            <div className="py-2 pr-1.5 text-right text-app-label tabular-nums text-muted-foreground">
              {String(j).padStart(2, "0")}.00
            </div>

            {hari.map((h, i) => (
              <div
                key={kunciHariWib(h)}
                className={`flex flex-col gap-1 border-l border-border p-1 ${
                  i === hariIni ? "bg-muted" : ""
                }`}
              >
                {(petak.get(`${j}|${kunciHariWib(h)}`) ?? []).map((b) => (
                  <KartuSesi key={b.id} b={b} isi={isi} />
                ))}
              </div>
            ))}

            <div className="border-l border-border" />
          </div>
        ))}
      </div>
    </div>
  );
}
