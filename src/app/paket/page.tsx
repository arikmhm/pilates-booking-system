// Katalog paket publik — halaman jualan yang isinya benar-benar dari database.
//
// Pita harga di halaman profil sengaja tetap statis: tiga kartu pilihan,
// prerender, tanpa satu query pun. Halaman ini kebalikannya — ia membaca
// `packages` apa adanya, jadi paket yang baru dibuat owner lewat A6 langsung
// terbit tanpa menyentuh kode. Yang satu brosur, yang satu katalog.
//
// BR-1.4 memimpin tata letaknya. Jenis kelas yang tercakup bukan keterangan
// tambahan melainkan bagian dari barangnya — dan ia satu-satunya syarat yang
// baru terasa sesudah bayar, saat booking ditolak dengan kode X7. Karena itu
// ia jadi label di kepala tiap kartu, bukan baris kecil di bawah harga, dan
// saringan di atas daftar memakai jenis kelas: "saya mau ikut Mat, paket mana
// yang bisa?"
//
// Foto belum ada (DS-25). Slotnya digambar dengan rasio terkunci dan diberi
// keterangan apa adanya — memasang foto asli nanti tidak menggeser tata letak.

import Link from "next/link";
import { pg } from "@/db";
import { paketDijual } from "@/db/kelola";
import { setelanStudio } from "@/db/booking";
import { rupiah } from "@/lib/waktu";
import { tautanWa } from "@/lib/wa";
import { FOTO } from "@/components/bilah-publik";
import { RangkaPublik } from "@/components/rangka-publik";

export const dynamic = "force-dynamic";

/** Nomor meja depan di seed demo — sama dengan yang dipakai halaman profil. */
const TELEPON = "0811550002";

export default async function KatalogPaket({
  searchParams,
}: {
  searchParams: Promise<{ alat?: string }>;
}) {
  const { alat: alatParam } = await searchParams;
  const alat = (alatParam ?? "").trim();

  const [paket, setelan] = await Promise.all([
    paketDijual(pg),
    setelanStudio(pg),
  ]);

  // Saringan dihitung dari katalog yang sedang dijual, bukan dari daftar jenis
  // kelas: jenis yang tidak tercakup paket mana pun cuma menawarkan layar
  // kosong. Angkanya jumlah paket yang mencakup jenis itu.
  const jumlah = new Map<string, number>();
  for (const p of paket)
    for (const k of p.kelas) jumlah.set(k, (jumlah.get(k) ?? 0) + 1);
  const daftarAlat = [...jumlah.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], "id"),
  );

  const tampil = alat ? paket.filter((p) => p.kelas.includes(alat)) : paket;
  const tautan = (a: string) => (a ? `/paket?alat=${encodeURIComponent(a)}` : "/paket");

  return (
    <RangkaPublik judul="Paket Kredit" aktif="/paket">
      {/* Penawaran yang sama dengan pita di halaman profil, diulang di sini
          karena tombol "Coba Kelas Pertama" di bilah atas mengantar ke halaman
          ini — dan orang yang baru sampai belum tentu pernah membaca pitanya. */}
      <div className="flex flex-wrap items-end justify-between gap-dekat">
        <div>
          <p className="max-w-[52ch] text-app-body text-muted-foreground">
            Satu kredit untuk satu kelas. Kelas pertama gratis — datang dulu,
            rasakan dulu; paket dibeli setelah kamu yakin.
          </p>
        </div>
        <a
          href={tautanWa(
            TELEPON,
            "Halo Kenari, saya mau tanya soal paket kredit dan cara belinya.",
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 items-center justify-center rounded-sm bg-primary px-6 text-app-label font-medium uppercase text-primary-foreground"
        >
          Tanya Paket
        </a>
      </div>

      {daftarAlat.length > 0 && (
        <div className="mt-dekat flex w-full items-center gap-0.5 overflow-x-auto rounded-sm border border-border p-1 sm:w-auto sm:gap-1">
          {([["", "Semua", paket.length]] as [string, string, number][])
            .concat(daftarAlat.map(([nama, n]) => [nama, nama, n]))
            .map(([nilai, label, n]) => {
              const dipilih = nilai === alat;
              return (
                <Link
                  key={nilai || "semua"}
                  href={tautan(nilai)}
                  aria-current={dipilih ? "true" : undefined}
                  className={`inline-flex min-h-11 shrink-0 items-center gap-1 rounded-sm px-1.5 text-[0.625rem] uppercase tracking-[0.04em] transition-colors sm:gap-2 sm:px-3 sm:text-app-label ${
                    dipilih
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                  <span className={`tabular-nums ${dipilih ? "opacity-70" : "opacity-60"}`}>
                    {n}
                  </span>
                </Link>
              );
            })}
        </div>
      )}

      {tampil.length === 0 ? (
        <p className="mt-sedang text-app-body text-muted-foreground">
          {alat
            ? `Belum ada paket yang mencakup kelas ${alat}.`
            : "Katalog paket sedang kosong."}
        </p>
      ) : (
        <ul className="mt-dekat grid gap-sedang sm:grid-cols-2 lg:grid-cols-3">
          {tampil.map((p) => {
            const perKelas = Math.round(p.harga_rupiah / (p.jumlah_kredit || 1));
            return (
              <li
                key={p.id}
                className="flex flex-col overflow-hidden rounded-md border border-border bg-background"
              >
                {/* DS-25 — slot foto berasio terkunci. Keterangannya ditulis
                    apa adanya, bukan disamarkan jadi hiasan: yang melihat demo
                    ini harus tahu mana yang belum jadi. */}
                <div
                  className={`${FOTO} flex aspect-[4/3] w-full items-end justify-start p-3`}
                >
                  <span className="rounded-full bg-background/85 px-3 py-1 text-app-label uppercase text-muted-foreground">
                    Foto menyusul
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-4">
                  {/* BR-1.4 di kepala kartu, bukan di kakinya. */}
                  <p className="inline-flex flex-wrap gap-1">
                    {p.kelas.length === 0 ? (
                      <span className="rounded-full border border-border px-3 py-1 text-app-label uppercase text-muted-foreground">
                        Belum ada jenis kelas
                      </span>
                    ) : (
                      p.kelas.map((k) => (
                        <span
                          key={k}
                          className="rounded-full border border-border-warm px-3 py-1 text-app-label uppercase text-emphasis-sand"
                        >
                          {k}
                        </span>
                      ))
                    )}
                  </p>

                  <h2 className="mt-3 text-app-section">{p.nama}</h2>

                  <p className="mt-2 text-app-number tabular-nums">
                    <span className="align-middle text-app-body">Rp </span>
                    {p.harga_rupiah.toLocaleString("id-ID")}
                  </p>
                  <p className="text-app-body-sm text-muted-foreground">
                    {rupiah(perKelas)} per kelas
                  </p>

                  <dl className="mt-dekat space-y-1 border-t border-border pt-3 text-app-body-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Kredit</dt>
                      <dd className="tabular-nums">{p.jumlah_kredit} kelas</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Masa berlaku</dt>
                      <dd className="tabular-nums">{p.masa_berlaku_hari} hari</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Batas batal</dt>
                      <dd className="tabular-nums">
                        {setelan.cancel_window_hours} jam sebelum
                      </dd>
                    </div>
                  </dl>

                  {/* Pembelian mandiri baru ada di versi real (UC-M11), jadi
                      tombolnya mengantar ke meja depan — bukan ke keranjang
                      yang belum ada. Pesannya sudah menyebut paketnya. */}
                  <a
                    href={tautanWa(
                      TELEPON,
                      `Halo Kenari, saya mau ambil paket ${p.nama} (${p.jumlah_kredit} kredit, ${rupiah(p.harga_rupiah)}). Caranya bagaimana ya?`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-auto inline-flex h-12 w-full items-center justify-center rounded-sm border border-foreground px-4 text-app-label font-medium uppercase transition-colors hover:bg-foreground hover:text-background"
                  >
                    Ambil Paket Ini
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-sedang max-w-[70ch] text-app-body-sm text-muted-foreground">
        Kredit dipotong saat kelas dipesan, bukan saat datang. Batal lebih awal
        dari {setelan.cancel_window_hours} jam mengembalikan kreditnya ke paket
        asal dengan tanggal hangus yang sama; lewat dari itu kreditnya tetap
        terpakai. Jadwal kelasnya bisa dilihat siapa saja di{" "}
        <Link href="/jadwal" className="underline underline-offset-4">
          halaman jadwal
        </Link>
        .
      </p>
    </RangkaPublik>
  );
}
