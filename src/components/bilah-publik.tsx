// Bilah atas halaman publik — dipakai halaman profil `/` dan jadwal publik
// `/jadwal`, dari satu berkas ini saja.
//
// DS-44 — menunya menamai barangnya: Kelas · Paket · Jadwal, tiga langkah yang
// dijual. Dua halaman publik yang menyalin menu masing-masing akan berbeda
// pada perubahan pertama, dan menu yang berubah saat orang pindah halaman
// membuat situsnya terasa seperti dua situs.
//
// Tautannya selalu mutlak (`/#paket`, bukan `#paket`) justru supaya bisa
// dipakai dari kedua halaman: dari `/jadwal` ia pindah halaman lalu turun ke
// pitanya, dari `/` ia cuma turun ke pitanya. Penjaganya `rute.test.ts` —
// tiap `/#jangkar` wajib punya `id`-nya di halaman profil.

import Link from "next/link";

const NAV: [string, string][] = [
  ["Kelas", "/#kelas"],
  ["Paket", "/#paket"],
  ["Jadwal", "/jadwal"],
];

export function BilahPublik({
  /** Rute yang sedang dibuka — butir menunya ditandai, bukan ikut bertaut. */
  aktif,
}: {
  aktif?: string;
}) {
  return (
    // Di HP navigasi disembunyikan, wordmark dan CTA tetap.
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-gutter">
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
          {/* Turun ke pita "Kelas pertama gratis" — penawarannya ada di halaman
              profil, jadi tidak ada gunanya mengirim orang ke tempat lain
              untuk membacanya. */}
          <Link
            href="/#paket"
            className="min-h-11 inline-flex items-center rounded-sm bg-primary px-4 text-app-label font-medium uppercase text-primary-foreground"
          >
            Coba Kelas Pertama
          </Link>
        </div>
      </div>
    </header>
  );
}
