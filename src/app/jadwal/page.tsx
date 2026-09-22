// Layar M1 Jadwal — 02-rules.md bagian 6.1.
//
// Satu halaman, tiga peran. Member melihat tombol booking, staf melihat
// tautan ke detail sesi, coach hanya melihat. Datanya sama persis; yang
// berbeda cuma apa yang bisa dilakukan pada sebuah blok.
//
// Keputusan boleh-tidaknya booking diambil bolehBooking() di src/rules/,
// bukan di sini. Berkas ini membaca database dan menggambar hasilnya.

import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  awalMingguWib,
  hariWib,
  jamWib,
  kunciHariWib,
  selisihManusiawi,
  tanggalWib,
} from "@/lib/waktu";
import { Angka, Chip, Kartu, Kerangka } from "@/components/kerangka";
import { Kalender, type IsiBlok } from "./kalender";
import { BuatKelas, type ModeBuat } from "./buat-kelas";
import { Konfirmasi } from "./konfirmasi";
import { ikutWaitlist } from "./aksi";

export const dynamic = "force-dynamic";

type Mode = "member" | "staf" | "coach";

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

/** Versi HP dari blok yang sama — kalender mingguan tidak muat di 375px. */
function Baris({ b, k }: { b: BarisJadwal; k: Konteks }) {
  const { warna, catatan, bungkus } = rupa(b, k);
  const dalam = (
    <div className="flex w-full items-center gap-4 px-4 py-4 text-left">
      {/* DS-28 — jam jadi jangkar kiri, lebar tetap. */}
      <div className="w-14 shrink-0">
        <p className="text-app-section tabular-nums">{jamWib(b.mulai_at)}</p>
        <p className="text-app-label uppercase text-muted-foreground">
          {b.durasi_menit}m
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
    <div className="flex flex-wrap items-center gap-1 rounded-sm border border-border p-1">
      {([["", "Semua alat", daftar.reduce((t, [, n]) => t + n, 0)]] as [
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
              className={`inline-flex min-h-11 items-center gap-2 rounded-sm px-3 text-app-label uppercase transition-colors ${
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

export default async function M1({
  searchParams,
}: {
  searchParams: Promise<{
    kabar?: string;
    minggu?: string;
    alat?: string;
    buat?: string;
    pilih?: string;
  }>;
}) {
  const user_id = await userSaatIni();
  if (!user_id) redirect("/masuk");

  const { kabar, minggu, alat: alatParam, buat, pilih } = await searchParams;
  const geser = Math.trunc(Number(minggu)) || 0;
  const alat = (alatParam ?? "").trim();
  const modeBuat: ModeBuat = buat === "berulang" ? "berulang" : "sekali";
  const sekarang = new Date();

  const senin = new Date(
    awalMingguWib(sekarang).getTime() + geser * 7 * 86_400_000,
  );
  const sampai = new Date(senin.getTime() + 7 * 86_400_000);

  const [setelan, baris, paket, aktif, saya] = await Promise.all([
    setelanStudio(pg),
    jadwal(pg, { user_id, dari: senin, sampai }),
    paketMember(pg, user_id),
    bookingAktif(pg, user_id),
    penggunaById(pg, user_id),
  ]);
  if (!saya) redirect("/masuk"); // cookie menunjuk user yang sudah tidak ada

  const mode: Mode =
    saya.peran === "admin" || saya.peran === "owner"
      ? "staf"
      : saya.peran === "coach"
        ? "coach"
        : "member";
  const staf = mode === "staf";

  /** URL layar ini dengan satu bagian diganti — sisanya ikut terbawa. */
  const url = (ubah: {
    minggu?: number;
    alat?: string;
    buat?: ModeBuat;
    pilih?: string;
  }) => {
    const q = new URLSearchParams();
    const m = ubah.minggu ?? geser;
    const a = ubah.alat ?? alat;
    const b = ubah.buat ?? modeBuat;
    if (m) q.set("minggu", String(m));
    if (a) q.set("alat", a);
    if (b === "berulang") q.set("buat", b);
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
  const bolehKonfirmasi =
    sesiPilih !== null &&
    sesiPilih.terisi < sesiPilih.kapasitas &&
    bolehBooking({
      sesi: sesiPilih,
      setelan,
      paket,
      booking_aktif: aktif,
      sekarang,
    }).boleh;
  const terpakai =
    sesiPilih && bolehKonfirmasi ? await alatTerpakai(pg, sesiPilih.id) : [];

  // Dikelompokkan per hari WIB, bukan per hari UTC — kelas 06.00 WIB jatuh di
  // tanggal sebelumnya kalau dihitung UTC (BR-7.5).
  const perHari = new Map<string, BarisJadwal[]>();
  for (const b of tampil) {
    const kunci = kunciHariWib(b.mulai_at);
    perHari.set(kunci, [...(perHari.get(kunci) ?? []), b]);
  }

  const rentang = `${tanggalWib(senin)} – ${tanggalWib(new Date(sampai.getTime() - 86_400_000))}`;

  return (
    <Kerangka
      nama={saya.nama}
      peran={saya.peran}
      aktif="/jadwal"
      judul="Jadwal Kelas"
      kabar={kabar}
    >
      {/* DS-40 — rentang tanggal, geser minggu, dan saringan alat jadi SATU
          bilah di kiri atas. Sebelumnya rentangnya judul besar sendiri dengan
          subjudul di bawahnya; dua baris untuk keterangan yang cuma menamai
          apa yang sudah terbaca di kepala kolom kalender. */}
      <div className="flex flex-wrap items-center gap-dekat">
        <div className="flex items-center gap-3">
          <h1 className="text-app-section tabular-nums whitespace-nowrap">
            {rentang}
          </h1>
          <div className="flex items-center gap-1">
            <Geser
              href={url({ minggu: geser - 1 })}
              anak={<ChevronLeft className="size-4" />}
              label="Minggu sebelumnya"
            />
            <Geser
              href={url({ minggu: 0 })}
              anak="Minggu ini"
              label="Kembali ke minggu ini"
            />
            <Geser
              href={url({ minggu: geser + 1 })}
              anak={<ChevronRight className="size-4" />}
              label="Minggu berikutnya"
            />
          </div>
        </div>

        <Saringan
          daftar={daftarAlat}
          aktif={alat}
          tautan={(a) => url({ alat: a })}
        />
      </div>

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
        <div className="col-span-12 min-w-0 xl:col-span-8">
          {tampil.length === 0 && (
            <p className="text-app-body text-muted-foreground">
              {alat
                ? `Tidak ada kelas ${alat} di minggu ini.`
                : "Tidak ada kelas terjadwal di minggu ini."}
            </p>
          )}

          {/* Kalender mingguan butuh ruang; di bawah md daftar per hari menang. */}
          {tampil.length > 0 && (
            <>
              <div className="hidden md:block">
                <Kalender
                  senin={senin}
                  baris={tampil}
                  isi={(b) => rupa(b, k)}
                  hariIni={kunciHariWib(sekarang)}
                />
              </div>

              <div className="space-y-dekat md:hidden">
                {[...perHari.entries()].map(([kunci, sesi]) => (
                  <Kartu key={kunci} judul={hariWib(sesi[0].mulai_at)} padat>
                    <ul className="divide-y divide-border">
                      {sesi.map((b) => (
                        <Baris key={b.id} b={b} k={k} />
                      ))}
                    </ul>
                  </Kartu>
                ))}
              </div>
            </>
          )}
        </div>

        {staf && (
          <div className="col-span-12 min-w-0 xl:col-span-4">
            <BuatKelas
              owner={saya.peran === "owner"}
              mode={modeBuat}
              tautan={(m) => url({ buat: m })}
              kembali="/jadwal"
              sekarang={sekarang}
            />
          </div>
        )}
      </div>

      {sesiPilih && bolehKonfirmasi && (
        <Konfirmasi
          sesi={sesiPilih}
          terpakai={terpakai}
          setelan={setelan}
          sisa={sisa}
          tutup={url({})}
        />
      )}
    </Kerangka>
  );
}
