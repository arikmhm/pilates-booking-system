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
import { bolehBooking, type PaketMember, type Setelan } from "@/rules";
import { userSaatIni } from "@/lib/masuk";
import { hariWib, jamWib, kunciHariWib } from "@/lib/waktu";
import { booking, ikutWaitlist } from "./aksi";

export const dynamic = "force-dynamic";

function Chip({ warna, anak }: { warna: string; anak: string }) {
  return (
    <span className={`rounded-full px-3 py-1 text-app-label ${warna}`}>{anak}</span>
  );
}

/** DS-14 — warna tidak pernah jadi satu-satunya penanda; tiap chip berteks. */
function status(b: BarisJadwal) {
  if (b.booking_saya)
    return ["bg-ok-surface text-ok-foreground", `Terdaftar · alat ${b.booking_saya.nomor_alat}`];
  if (b.antre_saya) return ["bg-warn-surface text-warn-foreground", "Kamu mengantre"];
  if (b.terisi >= b.kapasitas)
    return ["bg-neutral-surface text-neutral-foreground", `Penuh · ${b.antre} antre`];
  return ["bg-ok-surface text-ok-foreground", `${b.kapasitas - b.terisi} kursi tersisa`];
}

function Kartu({
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
  const putusan = bolehBooking({ sesi: b, setelan, paket, booking_aktif: aktif, sekarang });

  return (
    <li className="rounded-md border border-border p-4">
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-app-section tabular-nums">{jamWib(b.mulai_at)}</span>
        <Chip warna={warna} anak={teks} />
      </div>
      <p className="mt-1 text-app-body">
        {b.kelas}
        {b.coach && <span className="text-muted-foreground"> · {b.coach}</span>}
      </p>

      {b.booking_saya || b.antre_saya ? null : penuh ? (
        <form action={ikutWaitlist} className="mt-3">
          <input type="hidden" name="session_id" value={b.id} />
          <button
            type="submit"
            className="h-12 w-full rounded-sm border border-foreground text-app-label font-medium uppercase"
          >
            Ikut Daftar Tunggu
          </button>
        </form>
      ) : putusan.boleh ? (
        <form action={booking} className="mt-3">
          <input type="hidden" name="session_id" value={b.id} />
          <button
            type="submit"
            className="h-12 w-full rounded-sm bg-primary text-app-label font-medium uppercase text-primary-foreground"
          >
            Booking
          </button>
        </form>
      ) : (
        // Alasan penolakan ditampilkan apa adanya, bukan tombol mati tanpa
        // penjelasan. Teksnya sama persis dengan yang dipakai server action.
        <p className="mt-3 text-app-body-sm text-muted-foreground">{putusan.pesan}</p>
      )}
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

  const [baris, paket, aktif, [saya]] = await Promise.all([
    jadwal(pg, { user_id, sampai }),
    paketMember(pg, user_id),
    bookingAktif(pg, user_id),
    pg<{ nama: string }[]>`select nama from users where id = ${user_id}`,
  ]);

  // BR-1.7 — sisa kredit dijumlahkan dari buku besar, tidak ada kolom saldo.
  const sisa = paket
    .filter((p) => p.hangus_at > sekarang)
    .reduce((t, p) => t + p.sisa_kredit, 0);
  const terdekat = paket
    .filter((p) => p.hangus_at > sekarang && p.sisa_kredit > 0)
    .sort((a, b) => a.hangus_at.getTime() - b.hangus_at.getTime())[0];

  if (!saya) redirect("/masuk"); // cookie menunjuk user yang sudah tidak ada

  // Dikelompokkan per hari WIB, bukan per hari UTC — kelas 06.00 WIB jatuh di
  // tanggal sebelumnya kalau dihitung UTC (BR-7.5).
  const perHari = new Map<string, BarisJadwal[]>();
  for (const b of baris) {
    const k = kunciHariWib(b.mulai_at);
    perHari.set(k, [...(perHari.get(k) ?? []), b]);
  }

  return (
    <main className="mx-auto w-full max-w-md px-gutter py-sm">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-app-title">Jadwal</h1>
          <p className="text-app-body-sm text-muted-foreground">{saya.nama}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/akun" className="inline-flex min-h-11 items-center text-app-body-sm underline">
            Akun Saya
          </Link>
          <Link href="/masuk" className="inline-flex min-h-11 items-center text-app-body-sm">
            Ganti
          </Link>
        </div>
      </header>

      <div className="mt-sm rounded-md border border-border p-4">
        <p className="text-app-label uppercase text-muted-foreground">Sisa kredit</p>
        <p className="text-app-number tabular-nums">{sisa}</p>
        {terdekat && (
          <p className="text-app-body-sm text-warn-foreground">
            Paket terdekat hangus {hariWib(terdekat.hangus_at)}
          </p>
        )}
      </div>

      {kabar && (
        <p className="mt-sm rounded-md bg-muted p-4 text-app-body-sm">{kabar}</p>
      )}

      {perHari.size === 0 && (
        <p className="mt-md text-app-body text-muted-foreground">
          Belum ada kelas dalam {setelan.booking_opens_days} hari ke depan.
        </p>
      )}

      {[...perHari.entries()].map(([kunci, sesi]) => (
        <section key={kunci} className="mt-md">
          <h2 className="text-app-section">{hariWib(sesi[0].mulai_at)}</h2>
          <ul className="mt-3 space-y-3">
            {sesi.map((b) => (
              <Kartu
                key={b.id}
                b={b}
                setelan={setelan}
                paket={paket}
                aktif={aktif}
                sekarang={sekarang}
              />
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
