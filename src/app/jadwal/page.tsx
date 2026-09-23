// Layar M1 Jadwal — 02-rules.md bagian 6.1.
// Satu halaman, empat peran: member (tombol booking), staf (tautan detail),
// coach (lihat saja), dan tamu (tanpa tombol). DS-45 — jadwal bersifat publik,
// yang disembunyikan tombolnya bukan jadwalnya; tamu memakai `publik.tsx`.
// Keputusan boleh-tidaknya booking diambil bolehBooking() di src/rules/.

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
  tautanPilih: (session_id: string) => string;
  sini: string;
};

const TOMBOL =
  "inline-flex min-h-11 shrink-0 items-center rounded-sm bg-primary px-4 text-app-label font-medium uppercase text-primary-foreground transition-opacity hover:opacity-90";

/** Alasan tolak diringkas dua kata — kalimat penuh tidak muat di blok. */
const RINGKAS: Record<string, string> = {
  X1: "dibatalkan",
  X2: "di luar jendela",
  X3: "sudah terdaftar",
  X4: "bentrok jam lain",
  X5: "kredit tidak cukup",
  X7: "paket lain",
};

/** Satu-satunya tempat yang memutuskan rupa sebuah sesi; kalender dan daftar HP
 *  memakainya bersama. DS-14 — semua berteks, bukan warna saja. */
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

  // Tamu — DS-45. Blok yang masih kosong jadi tautan ke layar masuk.
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

  // BR-4.5 — antre tidak memotong kredit, jadi kelas penuh selalu boleh diantre.
  // Penuhnya daftar tunggu (BR-4.1) baru diuji di aksinya.
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

  // Blok membuka panel konfirmasi M2, tempat alat dipilih (BR-2.6).
  if (putusan.boleh)
    return {
      warna:
        "border-foreground bg-background transition-colors hover:bg-primary hover:text-primary-foreground",
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

/** Satu sesi dalam rupa daftar (DS-51). Baris yang punya `tombol` TIDAK
 *  dibungkus jadi tautan — tombol di dalam tautan HTML tidak sah. */
function Baris({ b, k }: { b: BarisJadwal; k: Konteks }) {
  const { warna, catatan, bungkus, tombol } = rupa(b, k);
  const selesai = new Date(b.mulai_at.getTime() + b.durasi_menit * 60_000);
  const dalam = (
    <div className="flex w-full items-center gap-4 px-4 py-4 text-left">
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

  // SATU jangkar waktu: tanggal yang dipilih menentukan minggu yang digambar,
  // hari yang dibuka rupa daftar, dan nilai `<input type="date">`.
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
  // −1 = minggu yang dibuka bukan minggu ini.
  const idxHariIni = Math.round(
    (hariIni.getTime() - senin.getTime()) / 86_400_000,
  );
  const hariIniDiMinggu =
    idxHariIni >= 0 && idxHariIni <= 6 ? idxHariIni : -1;

  // Tiga query terakhir milik pengguna yang sudah masuk; nilai biasa di dalam
  // Promise.all tetap sah, jadi tamu tidak perlu cabang sendiri.
  const [setelan, baris, paket, aktif, saya] = await Promise.all([
    setelanStudio(pg),
    jadwal(pg, { user_id, dari: senin, sampai }),
    user_id ? paketMember(pg, user_id) : [],
    user_id ? bookingAktif(pg, user_id) : [],
    user_id ? penggunaById(pg, user_id) : null,
  ]);
  // Cookie yang menunjuk user yang sudah tidak ada diperlakukan sebagai tamu.

  const mode: Mode = !saya
    ? "tamu"
    : saya.peran === "admin" || saya.peran === "owner"
      ? "staf"
      : saya.peran === "coach"
        ? "coach"
        : "member";
  const staf = mode === "staf";

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
    if (t.getTime() !== hariIni.getTime()) q.set("tgl", kunciHariWib(t));
    if (a) q.set("kelas", a);
    if (c) q.set("pelatih", c);
    if (b === "berulang") q.set("buat", b);
    if (r === "daftar") q.set("rupa", r);
    // `pilih` sengaja TIDAK diwarisi: ganti minggu/saringan menutup panelnya.
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

  // Isi saringan dihitung dari minggu yang sedang dibuka. Nilai yang dipilih
  // tetap disebut walau nol, kalau tidak ia tidak bisa dilepas lagi.
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

  const hidup = paket.filter((p) => p.hangus_at > sekarang && p.sisa_kredit > 0);
  const sisa = hidup.reduce((t, p) => t + p.sisa_kredit, 0);
  const terdekat = [...hidup].sort(
    (a, b) => a.hangus_at.getTime() - b.hangus_at.getTime(),
  )[0];
  const mepet =
    terdekat && terdekat.hangus_at.getTime() - sekarang.getTime() < 7 * 86_400_000;

  // `?pilih=` bisa diketik siapa saja, jadi syaratnya diperiksa ulang di sini.
  // Kapasitas tetap TIDAK dijamin — yang memutuskan INSERT-nya.
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

  /** `?pilih=` yang tidak bisa dibuka harus bersuara: kursi terakhir bisa
   *  keburu diambil antara halaman digambar dan bloknya diklik. */
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

  // Dikelompokkan per hari WIB, bukan UTC (BR-7.5).
  const perHari = new Map<string, BarisJadwal[]>();
  for (const b of tampil) {
    const kunci = kunciHariWib(b.mulai_at);
    perHari.set(kunci, [...(perHari.get(kunci) ?? []), b]);
  }

  const geserMinggu = (arah: -1 | 1) => ({
    tgl: new Date(dipilih.getTime() + arah * 7 * 86_400_000),
  });

  const sesiHari = perHari.get(kunciHariWib(dipilih)) ?? [];

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
      {/* Di bawah 768px yang digambar SELALU daftar satu hari, apa pun `?rupa=`. */}
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
      {mode !== "tamu" && <h1 className="sr-only">Jadwal Kelas</h1>}

      {/* DS-57 — di dalam aplikasi bilah duduk DI DALAM kotak jadwal; tamu
          memakainya berdiri sendiri. */}
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

      {/* TANPA `items-start`: `sticky` butuh induk yang lebih tinggi darinya. */}
      <div className="mt-dekat grid grid-cols-12 gap-dekat">
        <div className={`col-span-12 min-w-0 ${staf ? "xl:col-span-8" : ""}`}>
          {/* DS-57 — SATU kotak, sengaja tanpa `overflow`: leluhur ber-overflow
              melepas `sticky` bilahnya. */}
          <div className="rounded-md border border-border bg-background">
            {mode !== "tamu" && bilah}

            {rupaAktif === "daftar" ? (
              daftarHari
            ) : (
              <>
                {/* Minggu kosong tetap menggambar kepala kalendernya, kalau tidak
                    sumbu hari dan tombol geser minggu ikut hilang. */}
                {tampil.length === 0 && (
                  <p className="hidden px-4 pt-4 text-app-body text-muted-foreground md:block">
                    {kelas || pelatih
                      ? "Tidak ada kelas yang cocok di minggu ini."
                      : "Tidak ada kelas terjadwal di minggu ini."}
                  </p>
                )}

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
            {/* DS-57 — panel ikut menempel hanya saat berdampingan (≥ 1280px).
                `max-h` + gulung sendiri wajib: panel lebih tinggi dari layar
                800px, dan tombol simpan di ujungnya harus bisa dicapai. */}
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
