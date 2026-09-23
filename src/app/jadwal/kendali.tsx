"use client";

// Bilah kendali layar jadwal — DS-51.
//
// Satu baris berisi semua saringan: jenis kelas, pelatih, tanggal, dan sakelar
// rupa. Ia menempel di atas saat halaman digulung, karena jadwal sebulan lebih
// panjang dari layar dan saringan yang harus dicari dengan menggulung ke atas
// dulu praktis tidak dipakai.
//
// Satu-satunya komponen klien di layar ini, dan hanya untuk satu hal: `<select>`
// dan `<input type="date">` tidak bisa berpindah halaman sendiri tanpa JS.
// Formulirnya tetap `method="get"` yang sah, jadi tanpa JS ia masih bekerja
// lewat tombol di dalam `<noscript>` — yang berubah cuma perlu-tidaknya menekan
// tombol itu. Semua keadaan tetap hidup di URL (DS-42), bukan di state klien.

import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarDays, ChevronDown, List } from "lucide-react";

export type Rupa = "kalender" | "daftar";

const KOTAK =
  "inline-flex min-h-11 items-center rounded-sm border border-border bg-background text-app-body-sm";

function Pilih({
  nama,
  nilai,
  semua,
  daftar,
}: {
  nama: string;
  nilai: string;
  /** Label pilihan kosong — "Semua kelas", "Semua pelatih". */
  semua: string;
  daftar: [string, number][];
}) {
  return (
    <div className="relative">
      <select
        name={nama}
        defaultValue={nilai}
        aria-label={semua}
        className={`${KOTAK} w-full appearance-none py-2 pl-3 pr-8`}
      >
        <option value="">{semua}</option>
        {daftar.map(([label, n]) => (
          <option key={label} value={label}>
            {label} ({n})
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

export function BilahKendali({
  alat,
  daftarAlat,
  pelatih,
  daftarPelatih,
  tgl,
  hariIni,
  rupa,
  buat,
  tautanRupa,
  tautanHariIni,
  children,
}: {
  alat: string;
  daftarAlat: [string, number][];
  pelatih: string;
  daftarPelatih: [string, number][];
  /** Tanggal terpilih, "YYYY-MM-DD" — nilai mentah `<input type="date">`. */
  tgl: string;
  hariIni: string;
  rupa: Rupa;
  /** Mode panel buat-kelas; ikut dibawa supaya tab staf tidak ter-reset. */
  buat?: string;
  /** URL kedua rupa, sudah jadi — fungsi tidak bisa melintasi batas server. */
  tautanRupa: Record<Rupa, string>;
  tautanHariIni: string;
  /** Kepala minggu di rupa daftar — ikut menempel, bukan menggulung pergi. */
  children?: React.ReactNode;
}) {
  const router = useRouter();

  const pilihan = [
    ["kalender", "Kalender", CalendarDays],
    ["daftar", "Daftar", List],
  ] as const;

  return (
    <div className="sticky top-0 z-30 -mx-gutter border-b border-border bg-background px-gutter">
      <form
        method="get"
        action="/jadwal"
        // Nilai kosong tidak ditulis ke URL, jadi "Semua kelas" mengembalikan
        // `/jadwal` yang bersih — bukan `/jadwal?alat=&pelatih=`.
        onChange={(e) => {
          const q = new URLSearchParams();
          for (const [k, v] of new FormData(e.currentTarget)) {
            if (v) q.set(k, String(v));
          }
          router.push(q.size ? `/jadwal?${q}` : "/jadwal");
        }}
        className="flex flex-wrap items-center justify-between gap-2 py-1.5"
      >
        {/* `pilih` sengaja tidak ikut: mengganti saringan berarti orang sedang
            melihat-lihat lagi, dan panel konfirmasinya harus ikut tertutup. */}
        {rupa === "daftar" && <input type="hidden" name="rupa" value="daftar" />}
        {buat === "berulang" && <input type="hidden" name="buat" value="berulang" />}

        <div className="flex items-center gap-2">
          <Pilih nama="alat" nilai={alat} semua="Semua kelas" daftar={daftarAlat} />
          <Pilih
            nama="pelatih"
            nilai={pelatih}
            semua="Semua pelatih"
            daftar={daftarPelatih}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            name="tgl"
            defaultValue={tgl}
            aria-label="Tanggal"
            className={`${KOTAK} px-3 py-2 tabular-nums`}
          />

          {/* Muncul hanya saat sedang tidak di hari ini — tombol yang
              mengantar ke tempat yang sedang dibuka bukan tombol. */}
          {tgl !== hariIni && (
            <Link
              href={tautanHariIni}
              className={`${KOTAK} px-3 transition-colors hover:border-foreground`}
            >
              Hari ini
            </Link>
          )}

          {/* Di bawah 768px rupanya selalu daftar, jadi sakelarnya tidak
              digambar sama sekali — sakelar yang separuh pilihannya mati cuma
              memancing ketukan yang gagal. */}
          <div className="hidden items-center gap-0.5 rounded-sm border border-border p-1 md:flex">
            {pilihan.map(([nilai, label, Ikon]) => {
              const dipilih = nilai === rupa;
              return (
                <Link
                  key={nilai}
                  href={tautanRupa[nilai]}
                  aria-current={dipilih ? "true" : undefined}
                  className={`inline-flex min-h-9 items-center gap-2 rounded-sm px-3 text-app-label uppercase transition-colors ${
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

          <noscript>
            <button type="submit" className={`${KOTAK} px-3`}>
              Terapkan
            </button>
          </noscript>
        </div>
      </form>

      {children}
    </div>
  );
}
