// Kalender mingguan — tampilan utama layar M1 di layar lebar.
//
// Hari jadi kolom, jam jadi baris, sesi jadi kartu di dalam petak jam × hari.
// Yang dibaca dari bentuk ini dan tidak bisa dibaca dari daftar: jam sibuk
// terlihat sebagai baris yang menebal dan hari yang kosong sebagai kolom yang
// melompong — berdampingan, dalam satu tatapan.
//
// Komponen server murni — semua perpindahan minggu lewat tautan, tidak ada
// state klien.
//
// DS-52 — tinggi baris mengikuti isinya, bukan durasinya. Versi sebelumnya
// menggambar tiap blok `position:absolute` setinggi durasinya di atas sumbu
// 72px/jam, dan membayar tiga hal: jam kosong tetap memakan tinggi penuh, dua
// sesi berbarengan harus dibagi jadi lajur selebar separuh kolom, dan blok 50
// menit cuma punya 60px untuk empat baris teks. Sekarang jam yang tidak ada
// kelasnya tidak digambar sama sekali, sesi berbarengan ditumpuk di petak yang
// sama, dan tiap kartu setinggi yang ia butuhkan. Yang hilang — jeda antar
// kelas yang dulu terbaca dari ruang kosong — diganti durasi yang ditulis apa
// adanya di tiap kartu.
//
// DS-40 — kalender menggulung sendiri MENDATAR saja; tegaknya digambar utuh.

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
  /** Warna latar + garis blok, dari palet status 07-design.md bagian 7. */
  warna: string;
  /** Baris terakhir di dalam blok: ajakan, status, atau alasan tolak. */
  catatan: string;
  /** Dibungkus form (booking) atau tautan (staf). Null = blok mati. */
  bungkus?: (anak: React.ReactNode) => React.ReactNode;
  /**
   * Tombol aksi eksplisit — hanya dipakai rupa daftar (DS-51). Kartu kalender
   * tetap satu target sentuh utuh (DS-32): di kolom selebar 92px, tombol di
   * dalam kartu berarti dua target bersarang yang keduanya terlalu kecil.
   */
  tombol?: React.ReactNode;
};

/**
 * Sembilan kolom: lajur jam, tujuh hari, lajur tombol kanan. Dua lajur tepi
 * itu yang menampung tombol geser minggu di baris kepala — DS-51 menuntut
 * tombolnya menyatu dengan kalendernya, bukan berdiri sebagai baris sendiri
 * di atasnya yang mengulang ketujuh tanggal yang sama.
 */
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
      // DS-11 — 44px, sama seperti tombol lain. Lajur tepinya selebar itu.
      className="inline-flex size-11 items-center justify-center justify-self-center rounded-full border border-border transition-colors hover:border-foreground"
    >
      {anak}
    </Link>
  );
}

/**
 * Baris kepala minggu — nama hari di atas nomor tanggal, tombol minggu di dua
 * lajur tepinya.
 *
 * Dipakai dua kali: sebagai kepala kalender (`tautan` kosong — di sana harinya
 * cuma keterangan kolom, dan pemilih tanggalnya sudah ada di bilah kendali)
 * dan sebagai pemilih hari di rupa daftar (`tautan` terisi, karena di sana
 * cuma satu hari yang digambar).
 */
export function KepalaMinggu({
  hari,
  ditandai,
  hariIni,
  mundur,
  maju,
  tautan,
}: {
  hari: Date[];
  /** Indeks 0–6 hari yang sedang dipilih. */
  ditandai: number;
  /** Indeks hari ini, atau −1 kalau minggu ini bukan minggunya. */
  hariIni: number;
  mundur: string;
  maju: string;
  /** Kalau ada, tiap hari jadi tautan. Kalau tidak, harinya keterangan saja. */
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
        // Hari ini dapat latar tipis sepanjang kolomnya, terpisah dari
        // lingkaran `primary` yang menandai hari yang sedang DIPILIH. Dua
        // pertanyaan berbeda — "sekarang di mana" dan "yang saya buka mana" —
        // dan di hari biasa keduanya memang jatuh di kolom yang sama.
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

/** Satu sesi sebagai kartu di dalam petaknya. Tingginya mengikuti isinya. */
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
        {/* Durasi ditulis apa adanya sejak tinggi kartu berhenti mewakilinya. */}
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
  /** Tujuh hari minggu yang sedang dibuka, Senin lebih dulu. */
  hari: Date[];
  baris: BarisJadwal[];
  isi: (b: BarisJadwal) => IsiBlok;
  ditandai: number;
  hariIni: number;
  mundur: string;
  maju: string;
  /**
   * Tanpa tepi sendiri — dipakai saat kalender duduk di dalam kotak jadwal
   * bersama bilah kendali (DS-57). `overflow-x-auto` tetap di sini, BUKAN
   * naik ke kotak pembungkusnya: leluhur ber-overflow membuat bilah di
   * atasnya berhenti menempel.
   */
  polos?: boolean;
}) {
  // Petak jam × hari. Jam yang tidak punya satu pun kelas tidak pernah jadi
  // baris — jeda siang 11.00–15.00 di studio ini lima baris kosong yang
  // mendorong kelas sore keluar layar.
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
      {/* 46rem = 7 kolom hari @ ~85px + dua lajur tepi. Di bawah itu barulah
          muncul gulung mendatar, dan ia berhenti di tepi kotak ini (DS-40). */}
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
            {/* Label jam duduk DI DALAM barisnya, rata atas — bukan di tengah
                garis pemisah. Angka yang membelah garis tidak jelas milik
                baris yang mana (DS-52). */}
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
