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
import { booking, ikutWaitlist } from "./aksi";

export const dynamic = "force-dynamic";

type Mode = "member" | "staf" | "coach";

type Konteks = {
  mode: Mode;
  setelan: Setelan;
  paket: PaketMember[];
  aktif: { session_id: string; mulai_at: Date; durasi_menit: number }[];
  sekarang: Date;
};

/** Alasan tolak diringkas jadi dua kata — kalimat penuh tidak muat di blok. */
const RINGKAS: Record<string, string> = {
  X1: "dibatalkan",
  X2: "di luar jendela",
  X3: "sudah terdaftar",
  X4: "bentrok jam lain",
  X5: "kredit tidak cukup",
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
          <button type="submit" className="h-full w-full">
            {anak}
          </button>
        </form>
      ),
    };

  if (putusan.boleh)
    return {
      warna:
        "border-foreground bg-background transition-colors hover:bg-primary hover:text-primary-foreground",
      catatan: `${sisa} kursi · Booking`,
      bungkus: (anak) => (
        <form action={booking} className="h-full">
          <input type="hidden" name="session_id" value={b.id} />
          <button type="submit" className="h-full w-full">
            {anak}
          </button>
        </form>
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
  ke,
  anak,
  label,
}: {
  ke: number;
  anak: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={ke === 0 ? "/jadwal" : `/jadwal?minggu=${ke}`}
      aria-label={label}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-border px-3 text-app-label uppercase transition-colors hover:border-foreground"
    >
      {anak}
    </Link>
  );
}

export default async function M1({
  searchParams,
}: {
  searchParams: Promise<{ kabar?: string; minggu?: string }>;
}) {
  const user_id = await userSaatIni();
  if (!user_id) redirect("/masuk");

  const { kabar, minggu } = await searchParams;
  const geser = Math.trunc(Number(minggu)) || 0;
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
  const k: Konteks = { mode, setelan, paket, aktif, sekarang };

  // BR-1.7 — sisa kredit dijumlahkan dari buku besar, tidak ada kolom saldo.
  const hidup = paket.filter((p) => p.hangus_at > sekarang && p.sisa_kredit > 0);
  const sisa = hidup.reduce((t, p) => t + p.sisa_kredit, 0);
  const terdekat = [...hidup].sort(
    (a, b) => a.hangus_at.getTime() - b.hangus_at.getTime(),
  )[0];
  const mepet =
    terdekat && terdekat.hangus_at.getTime() - sekarang.getTime() < 7 * 86_400_000;

  // Dikelompokkan per hari WIB, bukan per hari UTC — kelas 06.00 WIB jatuh di
  // tanggal sebelumnya kalau dihitung UTC (BR-7.5).
  const perHari = new Map<string, BarisJadwal[]>();
  for (const b of baris) {
    const kunci = kunciHariWib(b.mulai_at);
    perHari.set(kunci, [...(perHari.get(kunci) ?? []), b]);
  }

  const mingguIni = geser === 0;
  const rentang = `${tanggalWib(senin)} – ${tanggalWib(new Date(sampai.getTime() - 86_400_000))}`;

  return (
    <Kerangka
      nama={saya.nama}
      peran={saya.peran}
      aktif="/jadwal"
      judul="Jadwal Kelas"
      kabar={kabar}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-app-title">{rentang}</h1>
          <p className="text-app-body-sm text-muted-foreground">
            {mingguIni
              ? `Minggu ini · booking dibuka ${setelan.booking_opens_days} hari ke depan`
              : `${Math.abs(geser)} minggu ${geser < 0 ? "lalu" : "ke depan"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Geser ke={geser - 1} anak={<ChevronLeft className="size-4" />} label="Minggu sebelumnya" />
          <Geser ke={0} anak="Minggu ini" label="Kembali ke minggu ini" />
          <Geser ke={geser + 1} anak={<ChevronRight className="size-4" />} label="Minggu berikutnya" />
        </div>
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
              <Link
                href="/akun"
                className="inline-flex min-h-11 items-center text-app-body-sm underline underline-offset-4"
              >
                Riwayat kredit
              </Link>
            </div>
          </Kartu>
        </div>
      )}

      {baris.length === 0 && (
        <p className="mt-sedang text-app-body text-muted-foreground">
          Tidak ada kelas terjadwal di minggu ini.
        </p>
      )}

      {/* Kalender mingguan butuh 64rem; di bawah itu daftar per hari menang. */}
      <div className="mt-dekat hidden md:block">
        <Kalender
          senin={senin}
          baris={baris}
          isi={(b) => rupa(b, k)}
          hariIni={kunciHariWib(sekarang)}
        />
      </div>

      <div className="mt-dekat space-y-dekat md:hidden">
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
    </Kerangka>
  );
}
