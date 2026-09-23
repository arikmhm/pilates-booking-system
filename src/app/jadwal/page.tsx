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
  dariKunciWib,
  hariWib,
  jamWib,
  kunciHariWib,
  selisihManusiawi,
} from "@/lib/waktu";
import { Angka, Chip, Kartu, Kerangka } from "@/components/kerangka";
import { RangkaPublik } from "@/components/rangka-publik";
import { Keterangan } from "./publik";
import { Kalender, KepalaMinggu, type IsiBlok } from "./kalender";
import { BilahKendali, type Rupa } from "./kendali";
import { BuatKelas, type ModeBuat } from "./buat-kelas";
import { Konfirmasi } from "./konfirmasi";
import { ikutWaitlist } from "./aksi";

export const dynamic = "force-dynamic";

type Mode = "tamu" | "member" | "staf" | "coach";

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

/**
 * Tombol aksi di rupa daftar — DS-51. Lime `primary` karena ini memang aksi
 * utama barisnya (DS-2), dan 44px karena DS-11 tidak mengenal pengecualian.
 */
const TOMBOL =
  "inline-flex min-h-11 shrink-0 items-center rounded-sm bg-primary px-4 text-app-label font-medium uppercase text-primary-foreground transition-opacity hover:opacity-90";

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
      catatan: `Tempat ${b.booking_saya.nomor_alat}`,
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
      // Tamu belum punya akun, jadi tombolnya mendarat di layar masuk. Kata
      // yang sama dengan tombol member — yang dituju orangnya memang sama,
      // dan "Masuk dulu" di sini terbaca seperti penolakan.
      tombol: (
        <Link href="/masuk" className={TOMBOL}>
          Pesan
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
      catatan: b.antre ? `Penuh · ${b.antre} antre` : "Penuh",
      bungkus: (anak) => (
        <form action={ikutWaitlist} className="h-full">
          <input type="hidden" name="session_id" value={b.id} />
          <input type="hidden" name="kembali" value={k.sini} />
          <button type="submit" className="h-full w-full">
            {anak}
          </button>
        </form>
      ),
      tombol: (
        <form action={ikutWaitlist}>
          <input type="hidden" name="session_id" value={b.id} />
          <input type="hidden" name="kembali" value={k.sini} />
          <button type="submit" className={TOMBOL}>
            Antre
          </button>
        </form>
      ),
    };

  // Bloknya tidak lagi memesan langsung: ia membuka panel konfirmasi M2, dan
  // di sanalah nomor tempat dipilih serta aturan batal dibaca (BR-2.6).
  if (putusan.boleh)
    return {
      warna:
        "border-foreground bg-background transition-colors hover:bg-primary hover:text-primary-foreground",
      // Sejak ada tombolnya sendiri, chip cukup menyebut keadaannya. "4 kursi
      // · Booking" di sebelah tombol Pesan menyuruh dua kali.
      catatan: `${sisa} kursi tersisa`,
      bungkus: (anak) => (
        <Link href={k.tautanPilih(b.id)} className="block h-full">
          {anak}
        </Link>
      ),
      tombol: (
        <Link href={k.tautanPilih(b.id)} className={TOMBOL}>
          Pesan
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
 *
 * Baris yang punya `tombol` TIDAK ikut dibungkus jadi tautan: tombol di dalam
 * tautan itu HTML yang tidak sah, dan dua target sentuh bersarang membuat
 * separuh ketukan mendarat di tempat yang tidak diniatkan. Yang tersisa
 * dibungkus seperti semula — baris staf menuju detail sesinya.
 */
function Baris({ b, k }: { b: BarisJadwal; k: Konteks }) {
  const { warna, catatan, bungkus, tombol } = rupa(b, k);
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
      {tombol}
    </div>
  );
  return <li>{tombol || !bungkus ? dalam : bungkus(dalam)}</li>;
}

export default async function M1({
  searchParams,
}: {
  searchParams: Promise<{
    kabar?: string;
    tgl?: string;
    rupa?: string;
    kelas?: string;
    pelatih?: string;
    buat?: string;
    pilih?: string;
  }>;
}) {
  // Tidak ada penjaga di sini — jadwal boleh dibaca siapa saja (DS-45).
  // Yang menentukan tombol apa yang muncul adalah `mode` di bawah.
  const user_id = await userSaatIni();

  const {
    kabar,
    tgl: tglParam,
    rupa: rupaParam,
    kelas: kelasParam,
    pelatih: pelatihParam,
    buat,
    pilih,
  } = await searchParams;
  const kelas = (kelasParam ?? "").trim();
  const pelatih = (pelatihParam ?? "").trim();
  const modeBuat: ModeBuat = buat === "berulang" ? "berulang" : "sekali";
  const rupaAktif: Rupa = rupaParam === "daftar" ? "daftar" : "kalender";
  const sekarang = new Date();

  // SATU jangkar waktu untuk layar ini: tanggal yang sedang dipilih. Ia
  // menentukan minggu mana yang digambar sekaligus hari mana yang dibuka rupa
  // daftar — dan ia yang jadi nilai `<input type="date">` di bilah kendali.
  // Sebelumnya dua parameter (`?minggu=` offset + `?hari=` indeks) yang harus
  // dijaga tetap sejalan; pemilih tanggal membuat salah satunya mustahil
  // dipetakan tanpa yang lain.
  const hariIni = awalHariWib(sekarang);
  const dipilih = (tglParam && dariKunciWib(tglParam)) || hariIni;
  const senin = awalMingguWib(dipilih);
  const sampai = new Date(senin.getTime() + 7 * 86_400_000);
  const tujuhHari = Array.from(
    { length: 7 },
    (_, i) => new Date(senin.getTime() + i * 86_400_000),
  );
  const idxDipilih = Math.round(
    (dipilih.getTime() - senin.getTime()) / 86_400_000,
  );
  // Hari ini dan hari yang dipilih dua hal berbeda sejak ada pemilih tanggal;
  // −1 berarti minggu yang dibuka bukan minggu ini.
  const idxHariIni = Math.round(
    (hariIni.getTime() - senin.getTime()) / 86_400_000,
  );
  const hariIniDiMinggu =
    idxHariIni >= 0 && idxHariIni <= 6 ? idxHariIni : -1;

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
    tgl?: Date;
    rupa?: Rupa;
    kelas?: string;
    pelatih?: string;
    buat?: ModeBuat;
    pilih?: string;
  }) => {
    const q = new URLSearchParams();
    const t = ubah.tgl ?? dipilih;
    const a = ubah.kelas ?? kelas;
    const c = ubah.pelatih ?? pelatih;
    const b = ubah.buat ?? modeBuat;
    const r = ubah.rupa ?? rupaAktif;
    // Hari ini tidak perlu disebut — `/jadwal` polos sudah berarti itu.
    if (t.getTime() !== hariIni.getTime()) q.set("tgl", kunciHariWib(t));
    if (a) q.set("kelas", a);
    if (c) q.set("pelatih", c);
    if (b === "berulang") q.set("buat", b);
    if (r === "daftar") q.set("rupa", r);
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

  // Isi kedua saringan dihitung dari minggu yang sedang dibuka, bukan dari
  // katalog jenis kelas atau daftar pelatih: yang menarik adalah apa yang
  // BERJALAN minggu ini. Nilai yang sedang dipilih tetap disebut walau nol —
  // kalau tidak, pindah ke minggu tanpa kelas itu membuat pilihannya hilang
  // dari daftar dan tidak bisa dilepas lagi.
  const hitung = (ambil: (b: BarisJadwal) => string | null, terpilih: string) => {
    const n = new Map<string, number>();
    for (const b of baris) {
      const v = ambil(b);
      if (v) n.set(v, (n.get(v) ?? 0) + 1);
    }
    if (terpilih && !n.has(terpilih)) n.set(terpilih, 0);
    return [...n.entries()].sort((a, b) => a[0].localeCompare(b[0], "id"));
  };
  const daftarKelas = hitung((b) => b.kelas, kelas);
  const daftarPelatih = hitung((b) => b.coach, pelatih);

  const tampil = baris.filter(
    (b) => (!kelas || b.kelas === kelas) && (!pelatih || b.coach === pelatih),
  );

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

  const geserMinggu = (arah: -1 | 1) => ({
    tgl: new Date(dipilih.getTime() + arah * 7 * 86_400_000),
  });

  const sesiHari = perHari.get(kunciHariWib(dipilih)) ?? [];

  /**
   * Daftar satu hari tanpa kotak sendiri — kotaknya milik pembungkusnya
   * (DS-57), supaya bilah kendali dan jadwalnya duduk di dalam satu tepi.
   */
  const daftarHari = (
    <>
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-app-section">{hariWib(dipilih)}</h2>
      </div>
      {sesiHari.length === 0 ? (
        <p className="p-4 text-app-body text-muted-foreground">
          {kelas || pelatih
            ? "Tidak ada kelas yang cocok hari itu."
            : "Tidak ada kelas terjadwal hari itu."}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {sesiHari.map((b) => (
            <Baris key={b.id} b={b} k={k} />
          ))}
        </ul>
      )}
    </>
  );

  const bilah = (
    <BilahKendali
      kelas={kelas}
      daftarKelas={daftarKelas}
      pelatih={pelatih}
      daftarPelatih={daftarPelatih}
      tgl={kunciHariWib(dipilih)}
      hariIni={kunciHariWib(hariIni)}
      rupa={rupaAktif}
      buat={staf ? modeBuat : undefined}
      tautanRupa={{
        kalender: url({ rupa: "kalender" }),
        daftar: url({ rupa: "daftar" }),
      }}
      tautanHariIni={url({ tgl: hariIni })}
      menyatu={mode !== "tamu"}
    >
      {/* Di rupa daftar kepala minggu jadi pemilih hari — cuma satu hari
          yang digambar — jadi ia ikut menempel: memilih hari lain tidak
          boleh menuntut menggulung ke atas dulu. Tanpa `min-w` di sini; ia
          harus muat di 375px, dan tujuh kolom selebar 34px masih menampung
          "SEN" 11px. Lebar 46rem cuma berlaku saat kepalanya menyangga kisi
          kalender. */}
      {/* Di bawah 768px yang digambar SELALU daftar satu hari, apa pun
          `?rupa=`-nya — jadi pemilih harinya harus ada di sana juga. Di
          atas 768px rupa kalender sudah punya kepala minggunya sendiri di
          dalam kotak kalender, dan dua deret tanggal yang bersisian memaksa
          pembacanya menebak mana yang berlaku. */}
      <div className={rupaAktif === "daftar" ? "" : "md:hidden"}>
        <div className="border-t border-border">
          <KepalaMinggu
            hari={tujuhHari}
            ditandai={idxDipilih}
            hariIni={hariIniDiMinggu}
            mundur={url(geserMinggu(-1))}
            maju={url(geserMinggu(1))}
            tautan={(i) => url({ tgl: tujuhHari[i] })}
          />
        </div>
      </div>
    </BilahKendali>
  );

  const isi = (
    <>
      {/* Rentang tanggal dulu jadi <h1> layar ini. Ia dibuang — kepala
          kalender sudah menyebut ketujuh tanggalnya, dan sebaris teks yang
          cuma menamai apa yang tepat di bawahnya bukan judul. Yang tersisa
          judul untuk pembaca layar: tamu sudah punya <h1> dari hero. */}
      {mode !== "tamu" && <h1 className="sr-only">Jadwal Kelas</h1>}

      {/* DS-57 — di dalam aplikasi bilah ini duduk DI DALAM kotak jadwal,
          jadi satu tepi membungkus kendali dan isinya. Tamu memakainya
          berdiri sendiri selebar halaman: di halaman publik tidak ada kartu
          untuk ditempeli. */}
      {mode === "tamu" && bilah}

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

      {/* DS-40 — 12 kolom: jadwal 8, panel buat-kelas 4. Di bawah xl
          keduanya menumpuk; 8/12 dari 1024px menyisakan kalender 480px, dan
          kalender yang harus digulung mendatar sejak kolom pertama bukan
          kalender lagi. */}
      {/* TANPA `items-start`: kolom yang menciut setinggi isinya tidak
          menyisakan ruang bagi panel menempel di dalamnya untuk bergerak —
          `sticky` butuh induk yang lebih tinggi daripada dirinya. */}
      <div className="mt-dekat grid grid-cols-12 gap-dekat">
        <div className={`col-span-12 min-w-0 ${staf ? "xl:col-span-8" : ""}`}>
          {/* DS-57 — SATU kotak untuk bilah kendali dan jadwalnya. Kotak ini
              sengaja tidak punya `overflow`: leluhur ber-overflow membuat
              bilah di dalamnya berhenti menempel, dan gulung mendatar kalender
              memang sudah punya lapisannya sendiri. */}
          <div className="rounded-md border border-border bg-background">
            {mode !== "tamu" && bilah}

            {rupaAktif === "daftar" ? (
              daftarHari
            ) : (
              <>
                {/* Minggu kosong tetap menggambar kepala kalendernya.
                    Mengganti kalender dengan satu kalimat membuat sumbu
                    harinya ikut hilang, berikut tombol geser minggunya. */}
                {tampil.length === 0 && (
                  <p className="hidden px-4 pt-4 text-app-body text-muted-foreground md:block">
                    {kelas || pelatih
                      ? "Tidak ada kelas yang cocok di minggu ini."
                      : "Tidak ada kelas terjadwal di minggu ini."}
                  </p>
                )}

                {/* Kalender mingguan butuh ruang; di bawah md selalu daftar. */}
                <div className="hidden md:block">
                  <Kalender
                    polos
                    hari={tujuhHari}
                    baris={tampil}
                    isi={(b) => rupa(b, k)}
                    ditandai={idxDipilih}
                    hariIni={hariIniDiMinggu}
                    mundur={url(geserMinggu(-1))}
                    maju={url(geserMinggu(1))}
                  />
                </div>
                <div className="md:hidden">{daftarHari}</div>
              </>
            )}
          </div>
        </div>

        {staf && (
          <div className="col-span-12 min-w-0 xl:col-span-4">
            {/* DS-57 — panel buat-kelas ikut menempel, tapi hanya saat ia
                memang berdampingan dengan jadwalnya (≥ 1280px). Di bawah itu
                keduanya menumpuk, dan kartu yang menempel di tumpukan cuma
                menutupi isi yang sedang dibaca.
                `max-h` + gulung sendiri wajib: panel berulang lebih tinggi
                dari layar 800px, dan kartu menempel yang ujungnya tidak bisa
                dicapai berarti tombol simpannya tidak bisa ditekan. */}
            <div className="xl:sticky xl:top-0 xl:max-h-svh xl:overflow-y-auto">
              <BuatKelas
                owner={saya?.peran === "owner"}
                mode={modeBuat}
                tautan={(m) => url({ buat: m })}
                kembali="/jadwal"
                sekarang={sekarang}
              />
            </div>
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
