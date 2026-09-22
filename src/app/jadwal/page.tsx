// Layar M1 Jadwal — 02-rules.md bagian 6.1. Tampilan HP (DS-16).
// "Sesi per hari · sisa kursi · tombol Booking / Penuh — Ikut Waitlist"
//
// Keputusan boleh-tidaknya booking diambil bolehBooking() di src/rules/,
// bukan di sini. Berkas ini membaca database dan menggambar hasilnya.

import Link from "next/link";
import { redirect } from "next/navigation";
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
import { hariWib, jamWib, kunciHariWib, selisihManusiawi } from "@/lib/waktu";
import { Angka, Chip, Kartu, Kerangka, Tombol } from "@/components/kerangka";
import { booking, ikutWaitlist } from "./aksi";

export const dynamic = "force-dynamic";

/** DS-14 — warna tidak pernah jadi satu-satunya penanda; tiap chip berteks. */
function status(b: BarisJadwal): [string, string] {
  if (b.booking_saya)
    return ["bg-ok-surface text-ok-foreground", `Alat ${b.booking_saya.nomor_alat}`];
  if (b.antre_saya) return ["bg-warn-surface text-warn-foreground", "Mengantre"];
  if (b.terisi >= b.kapasitas)
    return ["bg-neutral-surface text-neutral-foreground", "Penuh"];
  return ["bg-ok-surface text-ok-foreground", `${b.kapasitas - b.terisi} kursi`];
}

function Sesi({
  b,
  setelan,
  paket,
  aktif,
  sekarang,
}: {
  b: BarisJadwal;
  setelan: Setelan;
  paket: PaketMember[];
  aktif: { session_id: string; mulai_at: Date; durasi_menit: number }[];
  sekarang: Date;
}) {
  const [warna, teks] = status(b);
  const penuh = b.terisi >= b.kapasitas;
  const milikku = Boolean(b.booking_saya || b.antre_saya);
  const putusan = bolehBooking({ sesi: b, setelan, paket, booking_aktif: aktif, sekarang });

  return (
    <li className="flex items-center gap-4 px-4 py-4">
      {/* Jam jadi jangkar kiri: mata menyusuri satu kolom, bukan zigzag. */}
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
          {penuh && b.antre > 0 && ` · ${b.antre} mengantre`}
        </p>
        {!milikku && !putusan.boleh && !penuh && (
          <p className="mt-1 text-app-body-sm text-muted-foreground">
            {putusan.pesan}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <Chip warna={warna} anak={teks} />
        {!milikku &&
          (penuh ? (
            <form action={ikutWaitlist}>
              <input type="hidden" name="session_id" value={b.id} />
              <Tombol gaya="halus" kecil anak="Antre" />
            </form>
          ) : putusan.boleh ? (
            <form action={booking}>
              <input type="hidden" name="session_id" value={b.id} />
              <Tombol kecil anak="Booking" />
            </form>
          ) : null)}
      </div>
    </li>
  );
}

export default async function M1({
  searchParams,
}: {
  searchParams: Promise<{ kabar?: string }>;
}) {
  const user_id = await userSaatIni();
  if (!user_id) redirect("/masuk");

  const { kabar } = await searchParams;
  const sekarang = new Date();

  const setelan = await setelanStudio(pg);
  const sampai = new Date(
    sekarang.getTime() + setelan.booking_opens_days * 86_400_000,
  );

  const [baris, paket, aktif, saya] = await Promise.all([
    jadwal(pg, { user_id, sampai }),
    paketMember(pg, user_id),
    bookingAktif(pg, user_id),
    penggunaById(pg, user_id),
  ]);
  if (!saya) redirect("/masuk"); // cookie menunjuk user yang sudah tidak ada

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
    const k = kunciHariWib(b.mulai_at);
    perHari.set(k, [...(perHari.get(k) ?? []), b]);
  }

  return (
    <Kerangka nama={saya.nama} peran={saya.peran} aktif="/jadwal" kabar={kabar}>
      <Kartu>
        <div className="flex items-end justify-between gap-4">
          <Angka
            nilai={sisa}
            label="Sisa kredit"
            catatan={
              terdekat
                ? `Hangus ${hariWib(terdekat.hangus_at)} · ${selisihManusiawi(terdekat.hangus_at, sekarang)}`
                : "Kredit habis atau sudah lewat masa berlaku."
            }
            warnaCatatan={mepet ? "text-warn-foreground" : "text-muted-foreground"}
          />
          <Link
            href="/akun"
            className="inline-flex min-h-11 items-center text-app-body-sm underline underline-offset-4"
          >
            Riwayat
          </Link>
        </div>
      </Kartu>

      {perHari.size === 0 && (
        <p className="mt-sedang text-app-body text-muted-foreground">
          Belum ada kelas dalam {setelan.booking_opens_days} hari ke depan.
        </p>
      )}

      <div className="mt-sedang space-y-dekat">
        {[...perHari.entries()].map(([kunci, sesi]) => (
          <Kartu key={kunci} judul={hariWib(sesi[0].mulai_at)} padat>
            <ul className="divide-y divide-border">
              {sesi.map((b) => (
                <Sesi
                  key={b.id}
                  b={b}
                  setelan={setelan}
                  paket={paket}
                  aktif={aktif}
                  sekarang={sekarang}
                />
              ))}
            </ul>
          </Kartu>
        ))}
      </div>
    </Kerangka>
  );
}
