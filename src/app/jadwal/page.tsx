// Layar M1 Jadwal — 02-rules.md bagian 6.1.
//
// Satu halaman, empat peran. Member melihat tombol booking, staf melihat
// tautan ke detail sesi, coach hanya melihat, dan **tamu** — pengunjung yang
// belum masuk — melihat jadwal yang sama tanpa satu pun tombol. Datanya sama
// persis; yang berbeda cuma apa yang bisa dilakukan pada sebuah blok.
//
// DS-45 — jadwal bersifat publik. Melempar tamu ke /masuk berarti meminta
// orang membuat akun untuk membaca jam buka; yang layak disembunyikan adalah
// tombolnya, bukan jadwalnya. Tamu memakai kerangka publik (`publik.tsx`),
// bukan sidebar aplikasi.
//
// Keputusan boleh-tidaknya booking diambil bolehBooking() di src/rules/,
// bukan di sini. Berkas ini membaca database dan menggambar hasilnya.

import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, List } from "lucide-react";
import { pg } from "@/db";
import {
  alatTerpakai,
  bookingAktif,
  jadwal,
  paketMember,
  setelanStudio,
  type BarisJadwal,
} from "@/db/booking";
import { penggunaById } from "@/db/admin";
import { bolehBooking, type PaketMember, type Setelan } from "@/rules";
import { userSaatIni } from "@/lib/masuk";
import {
  awalHariWib,
  awalMingguWib,
  hariWib,
  jamWib,
  kunciHariWib,
  namaHariWib,
  nomorHariWib,
  selisihManusiawi,
  tanggalWib,
} from "@/lib/waktu";
import { Angka, Chip, Kartu, Kerangka } from "@/components/kerangka";
import { RangkaPublik } from "@/components/rangka-publik";
import { Keterangan } from "./publik";
import { Kalender, type IsiBlok } from "./kalender";
import { BuatKelas, type ModeBuat } from "./buat-kelas";
import { Konfirmasi } from "./konfirmasi";
import { ikutWaitlist } from "./aksi";

export const dynamic = "force-dynamic";

type Mode = "tamu" | "member" | "staf" | "coach";

/** DS-51 — dua rupa untuk data yang sama. Kalender bawaan, daftar lewat URL. */
type Rupa = "kalender" | "daftar";

type Konteks = {
  mode: Mode;
  setelan: Setelan;
  paket: PaketMember[];
  aktif: { session_id: string; mulai_at: Date; durasi_menit: number }[];
  sekarang: Date;
  /** URL layar ini dengan panel konfirmasi (M2) sesi itu terbuka. */
  tautanPilih: (session_id: string) => string;
  /** URL layar ini apa adanya — dibawa formulir supaya minggunya tidak hilang. */
  sini: string;
};

/** Alasan tolak diringkas jadi dua kata — kalimat penuh tidak muat di blok. */
const RINGKAS: Record<string, string> = {
  X1: "dibatalkan",
  X2: "di luar jendela",
  X3: "sudah terdaftar",
  X4: "bentrok jam lain",
  X5: "kredit tidak cukup",
  X7: "paket lain",
};

/**
 * Satu-satunya tempat yang memutuskan rupa sebuah sesi. Dipakai kalender dan
 * daftar HP, supaya keduanya tidak pernah bercerita berbeda tentang sesi yang
 * sama. DS-14 — warna tidak pernah jadi satu-satunya penanda; semua berteks.
 */
function rupa(b: BarisJadwal, k: Konteks): IsiBlok {
  const sisa = b.kapasitas - b.terisi;
  const penuh = sisa <= 0;

  if (b.booking_saya)
    return {
      warna: "border-ok-foreground/30 bg-ok-surface text-ok-foreground",
      catatan: `Alat ${b.booking_saya.nomor_alat}`,
    };

  if (b.antre_saya)
    return {
      warna: "border-warn-foreground/30 bg-warn-surface text-warn-foreground",
      catatan: `Mengantre · ${b.antre} di daftar`,
    };

  // Tamu — DS-45. Yang perlu terbaca cuma tiga hal: kelas apa, jam berapa,
  // masih ada kursi atau tidak. Jumlah antre dan kode tolak milik member
  // tidak berarti apa-apa untuk orang yang belum punya akun, dan blok yang
  // masih kosong jadi tautan ke layar masuk — itu langkah berikutnya.
  if (k.mode === "tamu") {
    if (b.status !== "scheduled" || b.mulai_at <= k.sekarang)
      return {
        warna: "border-border bg-muted text-muted-foreground",
        catatan: b.status !== "scheduled" ? "Dibatalkan" : "Sudah lewat",
      };

    if (penuh)
      return {
        warna: "border-border bg-neutral-surface text-neutral-foreground",
        catatan: "Penuh",
      };

    return {
      warna:
        "border-foreground bg-background transition-colors hover:bg-primary hover:text-primary-foreground",
      catatan: `${sisa} kursi tersisa`,
      bungkus: (anak) => (
        <Link href="/masuk" className="block h-full">
          {anak}
        </Link>
      ),
    };
  }

  if (k.mode !== "member")
    return {
      warna: penuh
        ? "border-border bg-neutral-surface text-neutral-foreground"
        : "border-border bg-background",
      catatan: `${b.terisi}/${b.kapasitas} kursi${b.antre ? ` · ${b.antre} antre` : ""}`,
      bungkus:
        k.mode === "staf"
          ? (anak) => (
              <Link href={`/admin/sesi/${b.id}`} className="block h-full">
                {anak}
              </Link>
            )
          : undefined,
    };

  const putusan = bolehBooking({
    sesi: b,
    setelan: k.setelan,
    paket: k.paket,
    booking_aktif: k.aktif,
    sekarang: k.sekarang,
  });

  // BR-4.5 — antre tidak memotong kredit, jadi kelas penuh selalu boleh
  // diantre. Penuhnya daftar tunggu sendiri (BR-4.1) baru diuji di aksinya.
  if (penuh)
    return {
      warna: "border-border bg-neutral-surface text-neutral-foreground",
      catatan: b.antre ? `Penuh · ${b.antre} antre` : "Penuh · Antre",
      bungkus: (anak) => (
        <form action={ikutWaitlist} className="h-full">
          <input type="hidden" name="session_id" value={b.id} />
          <input type="hidden" name="kembali" value={k.sini} />
          <button type="submit" className="h-full w-full">
            {anak}
          </button>
        </form>
      ),
    };

  // Bloknya tidak lagi memesan langsung: ia membuka panel konfirmasi M2, dan
  // di sanalah nomor alat dipilih serta aturan batal dibaca (BR-2.6).
  if (putusan.boleh)
    return {
      warna:
        "border-foreground bg-background transition-colors hover:bg-primary hover:text-primary-foreground",
      catatan: `${sisa} kursi · Booking`,
      bungkus: (anak) => (
        <Link href={k.tautanPilih(b.id)} className="block h-full">
          {anak}
        </Link>
      ),
    };

  return {
    warna: "border-border bg-muted text-muted-foreground",
    catatan: `${sisa} kursi · ${RINGKAS[putusan.kode]}`,
  };
}

/**
 * Satu sesi dalam rupa daftar — dipakai di HP dan di rupa "daftar" (DS-51).
 *
 * Jam mulai ditumpuk di atas jam selesai, bukan di atas durasi: "55m" harus
 * dijumlahkan sendiri oleh pembacanya, sedangkan yang ditanya orang yang
 * menyusun harinya selalu "jam berapa saya keluar".
 */
function Baris({ b, k }: { b: BarisJadwal; k: Konteks }) {
  const { warna, catatan, bungkus } = rupa(b, k);
  const selesai = new Date(b.mulai_at.getTime() + b.durasi_menit * 60_000);
  const dalam = (
    <div className="flex w-full items-center gap-4 px-4 py-4 text-left">
      {/* DS-28 — jam jadi jangkar kiri, lebar tetap. */}
      <div className="w-14 shrink-0">
        <p className="text-app-section tabular-nums">{jamWib(b.mulai_at)}</p>
        <p className="text-app-label tabular-nums text-muted-foreground">
          {jamWib(selesai)}
        </p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-app-body">{b.kelas}</p>
        <p className="truncate text-app-body-sm text-muted-foreground">
          {b.coach ?? "—"}
        </p>
      </div>
      <Chip warna={warna} anak={catatan} />
    </div>
  );
  return <li>{bungkus ? bungkus(dalam) : dalam}</li>;
}

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
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-border px-3 text-app-label uppercase transition-colors hover:border-foreground"
    >
      {anak}
    </Link>
  );
}

/**
 * Saringan alat — DS-40.
 *
 * Satu studio bisa punya beberapa ruang, satu alat per ruang: Reformer di
 * lantai bawah, Mat di atas. Dua sesi bisa berjalan di jam yang sama dan
 * kalender menaruhnya berdampingan — terbaca, tapi sempit. Memilih satu alat
 * mengembalikan kolom harinya jadi selebar satu sesi.
 *
 * Angka di sebelah nama adalah jumlah sesi minggu INI, bukan total: yang
 * ditanya orang di depan kalender selalu "minggu ini ada berapa".
 *
 * Di HP barisnya TIDAK boleh turun — lima chip yang patah jadi dua baris
 * mendorong kalender turun setengah layar. Karena itu hurufnya yang mengecil
 * (10px, satu-satunya tempat di luar skala DS-4) dan "Semua alat" jadi
 * "Semua"; tinggi sentuhnya tetap 44px (DS-11). Lima chip pas di 375px dengan
 * sisa 2px, jadi `overflow-x-auto` tetap dipasang sebagai katup: studio yang
 * punya jenis kelas kelima harus bisa menggesernya, bukan kehilangannya.
 */
function Saringan({
  daftar,
  aktif,
  tautan,
}: {
  daftar: [string, number][];
  aktif: string;
  tautan: (alat: string) => string;
}) {
  return (
    <div className="flex w-full items-center gap-0.5 overflow-x-auto rounded-sm border border-border p-1 sm:w-auto sm:gap-1">
      {([["", "Semua", daftar.reduce((t, [, n]) => t + n, 0)]] as [
        string,
        string,
        number,
      ][])
        .concat(daftar.map(([nama, n]) => [nama, nama, n]))
        .map(([nilai, label, n]) => {
          const dipilih = nilai === aktif;
          return (
            <Link
              key={nilai || "semua"}
              href={tautan(nilai)}
              aria-current={dipilih ? "true" : undefined}
              className={`inline-flex min-h-11 shrink-0 items-center gap-1 rounded-sm px-1.5 text-[0.625rem] uppercase tracking-[0.04em] transition-colors sm:gap-2 sm:px-3 sm:text-app-label ${
                dipilih
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              <span
                className={`tabular-nums ${dipilih ? "opacity-70" : "opacity-60"}`}
              >
                {n}
              </span>
            </Link>
          );
        })}
    </div>
  );
}

/**
 * Strip hari — DS-51.
 *
 * Menggantikan teks rentang + tiga tombol geser sebagai kendali utama minggu.
 * Tujuh harinya selalu kelihatan, jadi "Kamis ada kelas apa" dijawab satu
 * ketukan, bukan dengan menghitung kolom kalender. Hari yang diketuk membuka
 * rupa daftar hari itu — di kalender strip ini menandai hari ini saja, karena
 * di sana ketujuh harinya memang sudah tergambar sekaligus.
 *
 * Lebarnya dibagi rata tujuh (`grid-cols-7`), bukan mengikuti isi: kolom yang
 * melebar-menyempit mengikuti panjang nama hari membuat matanya harus mencari
 * ulang tiap pindah minggu.
 */
function StripHari({
  hari,
  ditandai,
  tautan,
  mundur,
  maju,
}: {
  hari: Date[];
  /** Indeks 0–6 yang disorot, atau −1 kalau minggunya tidak memuat hari ini. */
  ditandai: number;
  tautan: (i: number) => string;
  mundur: string;
  maju: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <Geser
        href={mundur}
        anak={<ChevronLeft className="size-4" />}
        label="Minggu sebelumnya"
      />
      <div className="grid flex-1 grid-cols-7 gap-0.5 rounded-sm border border-border p-1">
        {hari.map((h, i) => {
          const pilih = i === ditandai;
          return (
            <Link
              key={kunciHariWib(h)}
              href={tautan(i)}
              aria-current={pilih ? "date" : undefined}
              className={`flex min-h-11 flex-col items-center justify-center rounded-sm transition-colors ${
                pilih
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              <span className="text-[0.625rem] uppercase tracking-[0.04em] sm:text-app-label">
                {namaHariWib(h)}
              </span>
              <span className="text-app-body tabular-nums">{nomorHariWib(h)}</span>
            </Link>
          );
        })}
      </div>
      <Geser
        href={maju}
        anak={<ChevronRight className="size-4" />}
        label="Minggu berikutnya"
      />
    </div>
  );
}

/**
 * Sakelar rupa — DS-51.
 *
 * Hanya muncul di ≥ 768px. Di bawah itu kalendernya memang tidak pernah
 * digambar, dan sakelar yang separuh pilihannya tidak bisa dipakai cuma
 * memancing ketukan yang tidak menghasilkan apa-apa.
 */
function SakelarRupa({
  aktif,
  tautan,
}: {
  aktif: Rupa;
  tautan: (r: Rupa) => string;
}) {
  const pilihan = [
    ["kalender", "Kalender", CalendarDays],
    ["daftar", "Daftar", List],
  ] as const;
  return (
    <div className="hidden items-center gap-0.5 rounded-sm border border-border p-1 md:flex">
      {pilihan.map(([nilai, label, Ikon]) => {
        const dipilih = nilai === aktif;
        return (
          <Link
            key={nilai}
            href={tautan(nilai)}
            aria-current={dipilih ? "true" : undefined}
            className={`inline-flex min-h-11 items-center gap-2 rounded-sm px-3 text-app-label uppercase transition-colors ${
              dipilih
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Ikon className="size-4" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}

export default async function M1({
  searchParams,
}: {
  searchParams: Promise<{
    kabar?: string;
    minggu?: string;
    hari?: string;
    rupa?: string;
    alat?: string;
    buat?: string;
    pilih?: string;
  }>;
}) {
  // Tidak ada penjaga di sini — jadwal boleh dibaca siapa saja (DS-45).
  // Yang menentukan tombol apa yang muncul adalah `mode` di bawah.
  const user_id = await userSaatIni();

  const {
    kabar,
    minggu,
    hari: hariParam,
    rupa: rupaParam,
    alat: alatParam,
    buat,
    pilih,
  } = await searchParams;
  const geser = Math.trunc(Number(minggu)) || 0;
  const alat = (alatParam ?? "").trim();
  const modeBuat: ModeBuat = buat === "berulang" ? "berulang" : "sekali";
  const rupaAktif: Rupa = rupaParam === "daftar" ? "daftar" : "kalender";
  const sekarang = new Date();

  const mingguIni = awalMingguWib(sekarang);
  const senin = new Date(mingguIni.getTime() + geser * 7 * 86_400_000);
  const sampai = new Date(senin.getTime() + 7 * 86_400_000);
  const tujuhHari = Array.from(
    { length: 7 },
    (_, i) => new Date(senin.getTime() + i * 86_400_000),
  );

  // Indeks hari ini di dalam minggunya sendiri, 0 = Senin. Jadi hari bawaan
  // selama minggu itu yang dibuka — orang yang membuka jadwal hampir selalu
  // bertanya soal hari ini dulu — dan jadi penanda strip di rupa kalender.
  // Minggu lain jatuh ke Senin; tidak ada "hari ini" di sana.
  const idxHariIni = Math.round(
    (awalHariWib(sekarang).getTime() - mingguIni.getTime()) / 86_400_000,
  );
  const hariBaku = geser === 0 ? idxHariIni : 0;
  const hariMinta = Math.trunc(Number(hariParam));
  const hariIdx =
    hariParam !== undefined && hariMinta >= 0 && hariMinta <= 6
      ? hariMinta
      : hariBaku;

  // Tiga query terakhir milik pengguna yang sudah masuk. Nilai biasa di dalam
  // Promise.all tetap sah, jadi tamu tidak perlu cabang await sendiri.
  const [setelan, baris, paket, aktif, saya] = await Promise.all([
    setelanStudio(pg),
    jadwal(pg, { user_id, dari: senin, sampai }),
    user_id ? paketMember(pg, user_id) : [],
    user_id ? bookingAktif(pg, user_id) : [],
    user_id ? penggunaById(pg, user_id) : null,
  ]);
  // Cookie yang menunjuk user sudah tidak ada — biasanya sesudah `db:seed`
  // menerbitkan id baru — diperlakukan sebagai tamu, bukan dilempar ke
  // /masuk. Halaman publik yang menutup diri karena cookie basi adalah
  // kebalikan dari yang dijanjikan DS-45, dan pengunjung yang tidak pernah
  // punya akun tidak boleh dikirim ke daftar peran demo.

  const mode: Mode = !saya
    ? "tamu"
    : saya.peran === "admin" || saya.peran === "owner"
      ? "staf"
      : saya.peran === "coach"
        ? "coach"
        : "member";
  const staf = mode === "staf";

  /** URL layar ini dengan satu bagian diganti — sisanya ikut terbawa. */
  const url = (ubah: {
    minggu?: number;
    hari?: number;
    rupa?: Rupa;
    alat?: string;
    buat?: ModeBuat;
    pilih?: string;
  }) => {
    const q = new URLSearchParams();
    const m = ubah.minggu ?? geser;
    const a = ubah.alat ?? alat;
    const b = ubah.buat ?? modeBuat;
    const r = ubah.rupa ?? rupaAktif;
    const h = ubah.hari ?? hariIdx;
    if (m) q.set("minggu", String(m));
    if (a) q.set("alat", a);
    if (b === "berulang") q.set("buat", b);
    if (r === "daftar") q.set("rupa", r);
    // `hari` hanya ditulis kalau berbeda dari bawaan minggu TUJUAN — bukan
    // minggu yang sedang dibuka. Tanpa itu, geser minggu dari Rabu mendarat
    // di Senin: bawaan minggu ini (Rabu) sama dengan pilihan sekarang, jadi
    // parameternya tidak ikut terbawa dan minggu depan memakai bawaannya
    // sendiri.
    if (h !== (m === 0 ? idxHariIni : 0)) q.set("hari", String(h));
    // `pilih` sengaja TIDAK diwarisi: geser minggu atau ganti saringan berarti
    // orang sedang melihat-lihat lagi, dan panelnya harus ikut tertutup.
    if (ubah.pilih) q.set("pilih", ubah.pilih);
    const sisa = q.toString();
    return sisa ? `/jadwal?${sisa}` : "/jadwal";
  };

  const k: Konteks = {
    mode,
    setelan,
    paket,
    aktif,
    sekarang,
    tautanPilih: (id) => url({ pilih: id }),
    sini: url({}),
  };

  // Saringan alat dihitung dari minggu yang sedang dibuka, bukan dari katalog
  // jenis kelas: yang menarik adalah apa yang BERJALAN minggu ini. Alat yang
  // sedang dipilih tetap disebut walau nol, kalau tidak pindah minggu bisa
  // membuat chip-nya hilang dan pilihannya tidak bisa dilepas lagi.
  const jumlahAlat = new Map<string, number>();
  for (const b of baris) jumlahAlat.set(b.kelas, (jumlahAlat.get(b.kelas) ?? 0) + 1);
  if (alat && !jumlahAlat.has(alat)) jumlahAlat.set(alat, 0);
  const daftarAlat = [...jumlahAlat.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], "id"),
  );

  const tampil = alat ? baris.filter((b) => b.kelas === alat) : baris;

  // BR-1.7 — sisa kredit dijumlahkan dari buku besar, tidak ada kolom saldo.
  const hidup = paket.filter((p) => p.hangus_at > sekarang && p.sisa_kredit > 0);
  const sisa = hidup.reduce((t, p) => t + p.sisa_kredit, 0);
  const terdekat = [...hidup].sort(
    (a, b) => a.hangus_at.getTime() - b.hangus_at.getTime(),
  )[0];
  const mepet =
    terdekat && terdekat.hangus_at.getTime() - sekarang.getTime() < 7 * 86_400_000;

  // Panel konfirmasi M2. `?pilih=` bisa diketik siapa saja, jadi syaratnya
  // diperiksa ulang di sini — bukan dipercaya dari tautan yang membukanya.
  // Kapasitas tetap TIDAK dijamin: kursi terakhir bisa hilang antara panel
  // terbuka dan tombol ditekan, dan yang memutuskan itu tetap INSERT-nya.
  const sesiPilih =
    mode === "member" && pilih
      ? (baris.find((b) => b.id === pilih) ?? null)
      : null;
  const putusanPilih = sesiPilih
    ? bolehBooking({
        sesi: sesiPilih,
        setelan,
        paket,
        booking_aktif: aktif,
        sekarang,
      })
    : null;
  const penuhPilih = sesiPilih ? sesiPilih.terisi >= sesiPilih.kapasitas : false;
  const bolehKonfirmasi = putusanPilih?.boleh === true && !penuhPilih;
  const terpakai =
    sesiPilih && bolehKonfirmasi ? await alatTerpakai(pg, sesiPilih.id) : [];

  /**
   * `?pilih=` yang tidak bisa dibuka harus bersuara.
   *
   * Tanpa ini halaman kembali persis seperti semula dan kliknya terasa tidak
   * terjadi — padahal justru ada yang terjadi: kursi terakhir keburu diambil
   * antara halaman digambar dan bloknya diklik, atau tautannya sudah basi.
   */
  const kabarPilih =
    !pilih || mode !== "member" || bolehKonfirmasi
      ? undefined
      : !sesiPilih
        ? "Kelas itu tidak ada di minggu yang sedang dibuka."
        : penuhPilih
          ? "Kelas itu baru saja penuh. Bloknya sekarang jadi tombol daftar tunggu."
          : putusanPilih && !putusanPilih.boleh
            ? putusanPilih.pesan
            : undefined;

  // Dikelompokkan per hari WIB, bukan per hari UTC — kelas 06.00 WIB jatuh di
  // tanggal sebelumnya kalau dihitung UTC (BR-7.5).
  const perHari = new Map<string, BarisJadwal[]>();
  for (const b of tampil) {
    const kunci = kunciHariWib(b.mulai_at);
    perHari.set(kunci, [...(perHari.get(kunci) ?? []), b]);
  }

  const rentang = `${tanggalWib(senin)} – ${tanggalWib(new Date(sampai.getTime() - 86_400_000))}`;

  // Kerangka publik sudah memasang <h1> "Jadwal Kelas"-nya sendiri; di dalam
  // aplikasi rentang tanggal inilah satu-satunya judul halaman.
  const Judul = mode === "tamu" ? "h2" : "h1";

  const strip = (
    <StripHari
      hari={tujuhHari}
      // Di rupa daftar strip itu pilihan; di rupa kalender ia cuma menunjuk
      // hari ini, karena ketujuh harinya sudah tergambar sekaligus.
      ditandai={rupaAktif === "daftar" ? hariIdx : geser === 0 ? idxHariIni : -1}
      tautan={(i) => url({ rupa: "daftar", hari: i })}
      mundur={url({ minggu: geser - 1 })}
      maju={url({ minggu: geser + 1 })}
    />
  );

  const saringan = (
    <Saringan daftar={daftarAlat} aktif={alat} tautan={(a) => url({ alat: a })} />
  );

  const hariDipilih = tujuhHari[hariIdx];
  const sesiHari = perHari.get(kunciHariWib(hariDipilih)) ?? [];

  const daftarHari = (
    <Kartu judul={hariWib(hariDipilih)} padat>
      {sesiHari.length === 0 ? (
        <p className="p-4 text-app-body text-muted-foreground">
          {alat
            ? `Tidak ada kelas ${alat} hari itu.`
            : "Tidak ada kelas terjadwal hari itu."}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {sesiHari.map((b) => (
            <Baris key={b.id} b={b} k={k} />
          ))}
        </ul>
      )}
    </Kartu>
  );

  const isi = (
    <>
      {/* DS-51 — dua baris kendali, urutannya sama untuk keempat peran:
          "kelas apa" di baris pertama, "hari mana" di baris kedua, dan
          jadwalnya tepat di bawahnya. Rentang tanggal duduk di kanan sebagai
          keterangan bagi strip — strip cuma menyebut nomor tanggal, jadi
          bulan dan pergantiannya harus disebut di suatu tempat. */}
      <div className="flex flex-col gap-dekat sm:flex-row sm:items-center sm:justify-between">
        {saringan}
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <Judul className="text-app-section tabular-nums whitespace-nowrap">
            {rentang}
          </Judul>
          {/* Tombolnya hilang saat sudah di minggu ini — tombol yang
              mengantar ke tempat yang sedang dibuka bukan tombol. */}
          {geser !== 0 && (
            <Geser
              href={url({ minggu: 0, hari: idxHariIni })}
              anak="Minggu ini"
              label="Kembali ke minggu ini"
            />
          )}
          <SakelarRupa aktif={rupaAktif} tautan={(r) => url({ rupa: r })} />
        </div>
      </div>

      <div className="mt-dekat">{strip}</div>

      {mode === "member" && (
        <div className="mt-dekat">
          <Kartu>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <Angka
                nilai={sisa}
                label="Sisa kredit"
                catatan={
                  terdekat
                    ? `Hangus ${hariWib(terdekat.hangus_at)} · ${selisihManusiawi(terdekat.hangus_at, sekarang)}`
                    : "Kredit habis atau sudah lewat masa berlaku."
                }
                warnaCatatan={
                  mepet ? "text-warn-foreground" : "text-muted-foreground"
                }
              />
              <div className="flex items-center gap-4">
                {/* Ikut pindah dari subjudul yang dihapus: tanpa kalimat ini,
                    blok minggu depan yang abu "di luar jendela" tidak punya
                    penjelasan di mana pun (BR-2.1). */}
                <p className="text-app-body-sm text-muted-foreground">
                  Booking dibuka {setelan.booking_opens_days} hari ke depan.
                </p>
                <Link
                  href="/akun"
                  className="inline-flex min-h-11 items-center text-app-body-sm underline underline-offset-4"
                >
                  Riwayat kredit
                </Link>
              </div>
            </div>
          </Kartu>
        </div>
      )}

      {/* DS-40 — 12 kolom: kalender 8, panel buat-kelas 4. Di bawah xl
          keduanya menumpuk; 8/12 dari 1024px menyisakan kalender 480px, dan
          kalender yang harus digulung mendatar sejak kolom pertama bukan
          kalender lagi. */}
      <div className="mt-dekat grid grid-cols-12 gap-dekat">
        <div className={`col-span-12 min-w-0 ${staf ? "xl:col-span-8" : ""}`}>
          {rupaAktif === "daftar" ? (
            daftarHari
          ) : (
            <>
              {/* Minggu kosong tetap menggambar kalendernya. Mengganti
                  kalender dengan satu kalimat membuat sumbu harinya ikut
                  hilang, dan yang justru ingin dibaca dari minggu kosong
                  adalah bentuk kosongnya. */}
              {tampil.length === 0 && (
                <p className="mb-dekat hidden text-app-body text-muted-foreground md:block">
                  {alat
                    ? `Tidak ada kelas ${alat} di minggu ini.`
                    : "Tidak ada kelas terjadwal di minggu ini."}
                </p>
              )}

              {/* Kalender mingguan butuh ruang; di bawah md selalu daftar. */}
              <div className="hidden md:block">
                <Kalender
                  senin={senin}
                  baris={tampil}
                  isi={(b) => rupa(b, k)}
                  hariIni={kunciHariWib(sekarang)}
                />
              </div>
              <div className="md:hidden">{daftarHari}</div>
            </>
          )}
        </div>

        {staf && (
          <div className="col-span-12 min-w-0 xl:col-span-4">
            <BuatKelas
              owner={saya?.peran === "owner"}
              mode={modeBuat}
              tautan={(m) => url({ buat: m })}
              kembali="/jadwal"
              sekarang={sekarang}
            />
          </div>
        )}
      </div>

      {/* Keterangan warna duduk DI BAWAH jadwal: ia penjelasan, bukan
          pengantar. Ditaruh di atas, ia jadi hal pertama yang dibaca orang
          padahal belum ada yang perlu dijelaskan. */}
      {mode === "tamu" && (
        <div className="mt-dekat">
          <Keterangan />
        </div>
      )}

      {sesiPilih && bolehKonfirmasi && (
        <Konfirmasi
          sesi={sesiPilih}
          terpakai={terpakai}
          setelan={setelan}
          sisa={sisa}
          tutup={url({})}
        />
      )}
    </>
  );

  if (!saya)
    return (
      <RangkaPublik judul="Jadwal Kelas" aktif="/jadwal" kabar={kabar}>
        {isi}
      </RangkaPublik>
    );

  return (
    <Kerangka
      nama={saya.nama}
      peran={saya.peran}
      aktif="/jadwal"
      judul="Jadwal Kelas"
      kabar={kabar ?? kabarPilih}
    >
      {isi}
    </Kerangka>
  );
}
