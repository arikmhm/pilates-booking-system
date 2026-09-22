// Kerangka halaman publik — dipakai jadwal yang dibuka pengunjung.
//
// Jadwal studio itu **informasi jualan**, bukan isi akun: orang yang sedang
// menimbang mau ikut kelas apa perlu melihat jamnya lebih dulu, sebelum punya
// alasan membuat akun. Karena itu `/jadwal` tidak lagi melempar tamu ke
// `/masuk` — yang disembunyikan cuma tombolnya, bukan jadwalnya (DS-45).
//
// Kerangka aplikasi (`components/kerangka.tsx`) sengaja TIDAK dipakai di sini:
// sidebar member penuh menu yang belum bisa dibuka tamu, dan sidebar yang
// separuh butirnya melempar ke layar masuk itu janji kosong. Bilah atasnya
// bukan tiruan bilah halaman profil — ia berkas yang sama persis
// (`components/bilah-publik.tsx`), supaya tamu tidak merasa berpindah situs.

import Link from "next/link";
import { BilahPublik, FOTO } from "@/components/bilah-publik";

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
      <BilahPublik aktif="/jadwal" />

      {/* Hero pendek — DS-46. Sepertiga tinggi hero halaman profil: di sini
          orang datang untuk membaca jadwal, bukan untuk dibujuk, dan hero
          setinggi 70vh berarti kalendernya harus digulung dulu sebelum
          terlihat. Fotonya belum ada, jadi blok gradien yang sama dengan
          halaman profil (DS-25) — tata letaknya tidak akan bergeser saat foto
          aslinya dipasang. */}
      <section className="relative flex h-40 items-end overflow-hidden sm:h-52">
        <div aria-hidden className={`absolute inset-0 ${FOTO}`} />

        {/* DS-20 — tirai wajib sebelum teks putih. Arahnya dari bawah, bukan
            dari kiri seperti hero profil: judulnya duduk di dasar hero. */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, var(--photo-scrim) 0%, var(--photo-scrim) 38%, transparent 92%)",
          }}
        />

        {/* Kata raksasa yang setengah tenggelam di tepi bawah. Murni hiasan —
            `aria-hidden`, dan opasitasnya 10% supaya ia jadi tekstur, bukan
            teks kedua yang ikut dibaca. Disembunyikan di HP: di 375px ia
            menabrak judulnya sendiri. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-10 right-4 hidden select-none text-[9rem] font-medium uppercase leading-none tracking-tight text-white/10 sm:block lg:text-[12rem]"
        >
          Kenari
        </span>

        <div className="relative mx-auto w-full max-w-[1200px] px-gutter pb-5">
          <p className="text-app-label uppercase tracking-[0.18em] text-white/70">
            Studio Pilates Kenari
          </p>
          <h1 className="mt-1 text-marketing-h2 text-white">{judul}</h1>
        </div>
      </section>

      <main className="mx-auto w-full max-w-[1200px] flex-1 px-gutter py-sedang">
        <p className="max-w-[60ch] text-app-body text-muted-foreground">
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
