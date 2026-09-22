// Kerangka halaman publik — dipakai jadwal yang dibuka pengunjung.
//
// Jadwal studio itu **informasi jualan**, bukan isi akun: orang yang sedang
// menimbang mau ikut kelas apa perlu melihat jamnya lebih dulu, sebelum punya
// alasan membuat akun. Karena itu `/jadwal` tidak lagi melempar tamu ke
// `/masuk` — yang disembunyikan cuma tombolnya, bukan jadwalnya (DS-45).
//
// Kerangka aplikasi (`components/kerangka.tsx`) sengaja TIDAK dipakai di sini:
// sidebar member penuh menu yang belum bisa dibuka tamu, dan sidebar yang
// separuh butirnya melempar ke layar masuk itu janji kosong. Yang dipinjam
// dari halaman profil hanya bilah atasnya, supaya tamu merasa masih berada di
// situs yang sama.

import Link from "next/link";

export function RangkaPublik({
  judul,
  catatan,
  kabar,
  children,
}: {
  judul: string;
  catatan: string;
  /** Pesan sesudah aksi yang gagal — sama perannya dengan `kabar` di Kerangka. */
  kabar?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-4 px-gutter">
          <Link
            href="/"
            className="text-app-label font-medium uppercase tracking-[0.18em]"
          >
            Studio Pilates Kenari
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/#paket"
              className="min-h-11 hidden items-center text-app-body-sm hover:underline sm:inline-flex"
            >
              Paket
            </Link>
            <Link
              href="/masuk"
              className="min-h-11 inline-flex items-center rounded-sm bg-primary px-4 text-app-label font-medium uppercase text-primary-foreground"
            >
              Masuk
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-gutter py-sedang">
        <h1 className="text-app-title">{judul}</h1>
        <p className="mt-1 max-w-[60ch] text-app-body text-muted-foreground">
          {catatan}
        </p>

        {kabar && (
          <p className="mt-dekat rounded-md border border-border bg-muted p-4 text-app-body-sm">
            {kabar}
          </p>
        )}

        <div className="mt-sedang">{children}</div>
      </main>

      {/* Satu ajakan saja di kaki halaman. Tamu yang sudah melihat jadwalnya
          cuma punya dua langkah berikutnya yang masuk akal: punya kredit lalu
          masuk, atau belum punya dan perlu paketnya. */}
      <section className="border-t border-border bg-surface-sand">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-4 px-gutter py-sedang">
          <div>
            <p className="text-app-section">Sudah punya kredit?</p>
            <p className="max-w-[46ch] text-app-body-sm text-muted-foreground">
              Masuk untuk memesan kursi. Belum punya — kelas pertama gratis, dan
              paketnya ada di halaman depan.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/#paket"
              className="inline-flex h-12 items-center justify-center rounded-sm border border-foreground px-6 text-app-label font-medium uppercase"
            >
              Lihat Paket
            </Link>
            <Link
              href="/masuk"
              className="inline-flex h-12 items-center justify-center rounded-sm bg-primary px-6 text-app-label font-medium uppercase text-primary-foreground"
            >
              Masuk
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * Keterangan warna blok — DS-14 menuntut tiap blok berteks, tapi tamu belum
 * pernah melihat kalender ini sebelumnya dan tetap perlu tahu tiga rupa itu
 * berarti apa sebelum membacanya satu per satu.
 */
export function Keterangan() {
  const butir: [string, string][] = [
    ["border-foreground bg-background", "Masih ada kursi"],
    ["border-border bg-neutral-surface text-neutral-foreground", "Penuh"],
    ["border-border bg-muted text-muted-foreground", "Sudah lewat atau batal"],
  ];
  return (
    <ul className="flex flex-wrap items-center gap-4">
      {butir.map(([warna, label]) => (
        <li key={label} className="flex items-center gap-2">
          <span className={`inline-block size-4 rounded-sm border ${warna}`} />
          <span className="text-app-body-sm text-muted-foreground">{label}</span>
        </li>
      ))}
    </ul>
  );
}
