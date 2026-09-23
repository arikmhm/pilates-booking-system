// Bilah atas halaman publik — dipakai `/` dan `/jadwal` dari satu berkas.
// DS-44 — menunya menamai barangnya: Kelas · Paket · Jadwal. Tautan ke pita
// halaman profil ditulis mutlak (`/#kelas`) supaya bentuk yang sama jalan dari
// halaman mana pun. Penjaganya
// `rute.test.ts` — tiap `/#jangkar` wajib punya `id`-nya di halaman profil.

import Link from "next/link";

/** Slot foto yang belum ada isinya — DS-25. Blok gradien hangat berasio
 *  terkunci; memasang foto asli cukup mengganti nilai ini di satu tempat. */
export const FOTO =
  "bg-[linear-gradient(135deg,var(--accent-warm),var(--photo-warm))]";

const NAV: [string, string][] = [
  ["Kelas", "/#kelas"],
  ["Paket", "/paket"],
  ["Jadwal", "/jadwal"],
];

export function BilahPublik({
  /** Rute yang sedang dibuka — butir menunya ditandai, bukan ikut bertaut. */
  aktif,
  /**
   * Lebar isi halaman yang memakai bilah ini — tepinya harus segaris dengan
   * isi di bawahnya, jadi lebarnya ikut halamannya.
   */
  lebar = "max-w-[1200px]",
}: {
  aktif?: string;
  lebar?: string;
}) {
  return (
    // Di HP navigasi disembunyikan, wordmark dan CTA tetap.
    <header className="border-b border-border bg-background">
      <div className={`mx-auto flex h-16 w-full ${lebar} items-center justify-between px-gutter`}>
        <nav className="hidden flex-1 gap-dekat md:flex">
          {NAV.map(([label, href]) => (
            <Link
              key={label}
              href={href}
              aria-current={href === aktif ? "page" : undefined}
              className={`min-h-11 inline-flex items-center text-app-body-sm hover:underline ${
                href === aktif ? "font-medium underline" : ""
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <Link
          href="/"
          className="text-app-label font-medium uppercase tracking-[0.18em] md:flex-1 md:text-center"
        >
          Studio Pilates Kenari
        </Link>

        <div className="flex flex-1 items-center justify-end gap-4">
          <Link
            href="/masuk"
            className="min-h-11 hidden items-center text-app-body-sm sm:inline-flex"
          >
            Masuk
          </Link>
          {/* Penawaran kelas pertama gratis diulang di kepala katalog paket,
              jadi tombol ini mengantar ke harga, bukan ke pita halaman profil. */}
          <Link
            href="/paket"
            className="min-h-11 inline-flex items-center rounded-sm bg-primary px-4 text-app-label font-medium uppercase text-primary-foreground"
          >
            Coba Kelas Pertama
          </Link>
        </div>
      </div>
    </header>
  );
}
