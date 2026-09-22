// Layar O1 Laporan — UC-O04, UC-O05. Hanya untuk peran `owner`.
//
// Pemisahan itu sendiri bagian dari yang dijual: resepsionis butuh melihat
// seluruh jadwal dan seluruh member, tapi tidak perlu melihat omzet. Admin
// yang membuka halaman ini dilempar ke dashboard (BR-9.1).
//
// Tidak ada tabel ringkasan. Semua angka dihitung ulang dari baris transaksi
// tiap halaman dibuka — satu studio menulis ~25 baris sehari, dan ringkasan
// yang basi lebih mahal daripada query yang diulang.

import Link from "next/link";
import { pg } from "@/db";
import { laporan } from "@/db/kelola";
import { pastikanOwner } from "@/lib/masuk";
import { rupiah } from "@/lib/waktu";
import { Angka, Kartu, Kerangka } from "@/components/kerangka";

export const dynamic = "force-dynamic";

const BULAN = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

const namaBulan = (kunci: string) => {
  const [tahun, bulan] = kunci.split("-").map(Number);
  return `${BULAN[bulan - 1]} ${tahun}`;
};

const persen = (atas: number, bawah: number) =>
  bawah > 0 ? Math.round((atas / bawah) * 100) : 0;

export default async function O1({
  searchParams,
}: {
  searchParams: Promise<{ kabar?: string; hari?: string }>;
}) {
  const pengguna = await pastikanOwner();
  const { kabar, hari } = await searchParams;
  const rentang = Number(hari) === 90 ? 90 : 30;

  const l = await laporan(pg, { sekarang: new Date(), hari: rentang });

  const total = l.bulanan.reduce((t, b) => t + b.rupiah, 0);
  const puncak = Math.max(1, ...l.bulanan.map((b) => b.rupiah));
  const bulanIni = l.bulanan[0];
  const bulanLalu = l.bulanan[1];
  const selisih =
    bulanIni && bulanLalu && bulanLalu.rupiah > 0
      ? Math.round(((bulanIni.rupiah - bulanLalu.rupiah) / bulanLalu.rupiah) * 100)
      : null;

  const isi = persen(l.okupansi.terisi, l.okupansi.kursi);
  const datang = persen(
    l.kehadiran.hadir,
    l.kehadiran.hadir + l.kehadiran.bolos,
  );

  return (
    <Kerangka
      nama={pengguna.nama}
      peran={pengguna.peran}
      aktif="/admin/laporan"
      kabar={kabar}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-app-title">Laporan</h1>
          <p className="text-app-body-sm text-muted-foreground">
            Pendapatan diakui saat paket dibeli, bukan saat kreditnya dipakai.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[30, 90].map((n) => (
            <Link
              key={n}
              href={n === 30 ? "/admin/laporan" : `/admin/laporan?hari=${n}`}
              className={`inline-flex min-h-11 items-center rounded-sm border px-4 text-app-label uppercase transition-colors ${
                rentang === n
                  ? "border-foreground bg-foreground text-background"
                  : "border-border hover:border-foreground"
              }`}
            >
              {n} hari
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-dekat grid gap-dekat sm:grid-cols-2 xl:grid-cols-4">
        <Kartu>
          <Angka
            nilai={rupiah(bulanIni?.rupiah ?? 0)}
            label={`Pendapatan ${bulanIni ? namaBulan(bulanIni.bulan) : "bulan ini"}`}
            catatan={
              selisih === null
                ? `${bulanIni?.paket ?? 0} paket terjual`
                : `${selisih >= 0 ? "+" : ""}${selisih}% dari bulan lalu · ${bulanIni.paket} paket`
            }
            warnaCatatan={
              selisih !== null && selisih < 0
                ? "text-danger-foreground"
                : "text-muted-foreground"
            }
          />
        </Kartu>
        <Kartu>
          <Angka
            nilai={`${isi}%`}
            label={`Okupansi ${rentang} hari`}
            catatan={`${l.okupansi.terisi} dari ${l.okupansi.kursi} kursi · ${l.okupansi.sesi} kelas`}
          />
        </Kartu>
        <Kartu>
          <Angka
            nilai={`${datang}%`}
            label="Tingkat kehadiran"
            catatan={`${l.kehadiran.hadir} hadir · ${l.kehadiran.bolos} tidak datang`}
            warnaCatatan={
              l.kehadiran.bolos > l.kehadiran.hadir / 4
                ? "text-warn-foreground"
                : "text-muted-foreground"
            }
          />
        </Kartu>
        <Kartu warna="bg-warn-surface border-border-warm">
          <Angka
            nilai={rupiah(l.hangus.rupiah)}
            label="Kredit hangus"
            catatan={`${l.hangus.kredit} kelas dibayar tapi tidak pernah diambil`}
            warnaCatatan="text-warn-foreground"
          />
        </Kartu>
      </div>

      <div className="mt-dekat grid gap-dekat lg:grid-cols-2">
        <Kartu
          judul="Pendapatan per bulan"
          catatan={`Enam bulan terakhir · total ${rupiah(total)}`}
          padat
        >
          <ul className="divide-y divide-border">
            {l.bulanan.map((b) => (
              <li key={b.bulan} className="px-4 py-3">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-app-body">{namaBulan(b.bulan)}</span>
                  <span className="text-app-body tabular-nums">
                    {rupiah(b.rupiah)}
                  </span>
                </div>
                {/* Batang proporsional — DS-14: angkanya tetap tertulis penuh
                    di atas, batang hanya mempercepat perbandingan. */}
                <div className="mt-1 flex items-center gap-3">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${Math.round((b.rupiah / puncak) * 100)}%` }}
                  />
                  <span className="shrink-0 text-app-label tabular-nums text-muted-foreground">
                    {b.paket} paket
                  </span>
                </div>
              </li>
            ))}
            {l.bulanan.length === 0 && (
              <li className="px-4 py-4 text-app-body text-muted-foreground">
                Belum ada paket terjual.
              </li>
            )}
          </ul>
        </Kartu>

        <Kartu judul="Paket terlaris" catatan="Sepanjang waktu." padat>
          <ul className="divide-y divide-border">
            {l.paket.map((p) => (
              <li
                key={p.nama}
                className="flex items-center gap-4 px-4 py-3"
              >
                <span className="min-w-0 flex-1 truncate text-app-body">
                  {p.nama}
                </span>
                <span className="w-24 shrink-0 text-right text-app-body-sm tabular-nums text-muted-foreground">
                  {p.terjual} terjual
                </span>
                <span className="w-32 shrink-0 text-right text-app-body tabular-nums">
                  {rupiah(p.rupiah)}
                </span>
              </li>
            ))}
          </ul>
        </Kartu>
      </div>

      <div className="mt-dekat">
        <Kartu judul="Yang belum ada di sini">
          <p className="max-w-[60ch] text-app-body text-muted-foreground">
            Ekspor CSV, pajak, dan biaya operasional belum dihitung — laporan ini
            membaca pemasukan dari paket yang terjual, bukan pembukuan lengkap.
            Angka kredit hangus dinilai dari harga paket dibagi jumlah kreditnya.
          </p>
        </Kartu>
      </div>
    </Kerangka>
  );
}
