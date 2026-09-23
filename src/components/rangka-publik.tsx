// Kerangka halaman publik — dipakai jadwal dan katalog paket. Bilah atas sama
// dengan halaman profil (`bilah-publik.tsx`) plus hero pendek (DS-46), bukan
// sidebar aplikasi: sidebar member penuh menu yang belum bisa dibuka tamu.

import Link from "next/link";
import { BilahPublik, FOTO } from "@/components/bilah-publik";

/** Satu lebar untuk hero, isi, dan ajakan — supaya tepinya segaris. */
const LEBAR = "mx-auto w-full max-w-6xl px-gutter";

export function RangkaPublik({
  judul,
  aktif,
  kabar,
  children,
}: {
  judul: string;
  /** Rute halaman ini — menandai butir menunya dan memilih ajakan penutup. */
  aktif: string;
  /** Pesan sesudah aksi yang gagal — sama perannya dengan `kabar` di Kerangka. */
  kabar?: string;
  children: React.ReactNode;
}) {
  const diPaket = aktif === "/paket";
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <BilahPublik aktif={aktif} lebar="max-w-6xl" />

      {/* Hero pendek — DS-46, sepertiga tinggi hero profil: orang datang untuk
          membaca jadwal, bukan dibujuk. Blok gradien yang sama (DS-25) supaya
          tata letaknya tidak bergeser saat foto asli dipasang. */}
      <section className="relative flex h-40 items-end overflow-hidden sm:h-52">
        <div aria-hidden className={`absolute inset-0 ${FOTO}`} />

        {/* DS-20 — tirai wajib sebelum teks putih. Arahnya dari bawah: judulnya
            duduk di dasar hero. */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, var(--photo-scrim) 0%, var(--photo-scrim) 38%, transparent 92%)",
          }}
        />

        {/* Kata raksasa setengah tenggelam — murni hiasan (`aria-hidden`,
            opasitas 10%). Disembunyikan di HP: di 375px ia menabrak judul. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-10 right-4 hidden select-none text-[9rem] font-medium uppercase leading-none tracking-tight text-white/10 sm:block lg:text-[12rem]"
        >
          Kenari
        </span>

        <div className={`relative ${LEBAR} pb-5`}>
          <p className="text-app-label uppercase tracking-[0.18em] text-white/70">
            Studio Pilates Kenari
          </p>
          <h1 className="mt-1 text-marketing-h2 text-white">{judul}</h1>
        </div>
      </section>

      <main className={`${LEBAR} flex-1 py-sedang`}>
        {kabar && (
          <p className="mb-dekat rounded-md border border-border bg-muted p-4 text-app-body-sm">
            {kabar}
          </p>
        )}
        {children}
      </main>

      {/* Satu ajakan saja di kaki: tamu yang sudah melihat jadwal cuma punya
          dua langkah berikutnya — masuk, atau beli paket. */}
      <section className="border-t border-border bg-surface-sand">
        <div className={`${LEBAR} flex flex-wrap items-center justify-between gap-4 py-sedang`}>
          <div>
            <p className="text-app-section">Sudah punya kredit?</p>
            <p className="max-w-[46ch] text-app-body-sm text-muted-foreground">
              Masuk untuk memesan kursi. Belum punya — kelas pertama gratis, dan
              paketnya dibeli lewat meja depan.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            {/* Di halaman paket, "Lihat Paket" menunjuk halaman yang sedang
                dibuka; yang berguna di sana jadwalnya. */}
            <Link
              href={diPaket ? "/jadwal" : "/paket"}
              className="inline-flex h-12 items-center justify-center rounded-sm border border-foreground px-6 text-app-label font-medium uppercase"
            >
              {diPaket ? "Lihat Jadwal" : "Lihat Paket"}
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
