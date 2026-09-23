"use client";

// Bilah kendali layar jadwal — DS-51, menempel saat halaman digulung.
// Komponen klien hanya karena `<select>`/`<input type="date">` tidak bisa
// berpindah halaman tanpa JS; formulirnya tetap `method="get"` yang sah dan
// semua keadaan hidup di URL (DS-42).

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
  kelas,
  daftarKelas,
  pelatih,
  daftarPelatih,
  tgl,
  hariIni,
  rupa,
  buat,
  tautanRupa,
  tautanHariIni,
  menyatu,
  children,
}: {
  kelas: string;
  daftarKelas: [string, number][];
  pelatih: string;
  daftarPelatih: [string, number][];
  /** "YYYY-MM-DD" — nilai mentah `<input type="date">`. */
  tgl: string;
  hariIni: string;
  rupa: Rupa;
  buat?: string;
  /** URL kedua rupa, sudah jadi — fungsi tidak bisa melintasi batas server. */
  tautanRupa: Record<Rupa, string>;
  tautanHariIni: string;
  /** Menyatu dengan kotak jadwal di bawahnya (DS-57); tamu memakai bilah yang
   *  berdiri sendiri. */
  menyatu?: boolean;
  children?: React.ReactNode;
}) {
  const router = useRouter();

  const pilihan = [
    ["kalender", "Kalender", CalendarDays],
    ["daftar", "Daftar", List],
  ] as const;

  return (
    // WAJIB tanpa leluhur ber-`overflow`, kalau tidak `sticky` menempel pada
    // kotak yang tidak pernah bergulir.
    <div
      className={`sticky top-0 z-30 border-b border-border bg-background ${
        menyatu ? "rounded-t-md px-4 py-2" : "-mx-gutter px-gutter py-2"
      }`}
    >
      <form
        method="get"
        action="/jadwal"
        // Nilai kosong tidak ditulis ke URL — "Semua kelas" → `/jadwal` bersih.
        onChange={(e) => {
          const q = new URLSearchParams();
          for (const [k, v] of new FormData(e.currentTarget)) {
            if (v) q.set(k, String(v));
          }
          router.push(q.size ? `/jadwal?${q}` : "/jadwal");
        }}
        className="flex flex-wrap items-center justify-between gap-2 py-1.5"
      >
        {/* `pilih` sengaja tidak ikut: ganti saringan harus menutup panelnya. */}
        {rupa === "daftar" && (
          <input type="hidden" name="rupa" value="daftar" />
        )}
        {buat === "berulang" && (
          <input type="hidden" name="buat" value="berulang" />
        )}

        <div className="flex items-center gap-2">
          <Pilih
            nama="kelas"
            nilai={kelas}
            semua="Semua kelas"
            daftar={daftarKelas}
          />
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

          {tgl !== hariIni && (
            <Link
              href={tautanHariIni}
              className={`${KOTAK} px-3 transition-colors hover:border-foreground`}
            >
              Hari ini
            </Link>
          )}

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
