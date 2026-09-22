// Penjaga menu — DS-43.
//
// Tiap butir menu, breadcrumb, dan tombol di aplikasi ini menyebut rutenya
// sebagai string biasa: `{ href: "/admin/tim", … }` di sidebar, `["Harga",
// "#harga"]` di halaman publik. String tidak diperiksa siapa pun. Menghapus
// sebuah layar atau mengganti nama pitanya meninggalkan butir menu yang
// tampak normal, bisa diklik, dan mendarat di 404 — dan yang menemukannya
// pertama kali adalah orang yang sedang dipresentasikan.
//
// Test ini membaca sumbernya apa adanya, bukan mengimpor daftar menunya:
// daftar yang diimpor cuma menjaga daftar itu. Yang perlu dijaga adalah
// SETIAP rute yang ditulis di mana pun.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";

const APP = new URL(".", import.meta.url);
const SRC = new URL("../", import.meta.url);

/** Semua .tsx di bawah src/app dan src/components. */
function berkas(dir: URL): URL[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const anak = new URL(`${d.name}${d.isDirectory() ? "/" : ""}`, dir);
    if (d.isDirectory()) return berkas(anak);
    return d.name.endsWith(".tsx") ? [anak] : [];
  });
}

const semua = [
  ...berkas(APP),
  ...berkas(new URL("components/", SRC)),
].map((u) => ({ jalur: u.pathname.slice(SRC.pathname.length), isi: readFileSync(u, "utf8") }));

/**
 * Rute yang disebut di dalam sumber. Sengaja hanya string harfiah: yang
 * dirakit template (`/admin/sesi/${id}`) tidak bisa diperiksa di sini, dan
 * segmen dinamisnya memang tidak punya berkas bernama sama.
 */
const RUTE = /"(\/[a-z0-9/-]*)"/g;

test("tiap rute yang disebut di sumber punya page.tsx-nya", () => {
  const hilang: string[] = [];

  for (const { jalur, isi } of semua) {
    for (const [, rute] of isi.matchAll(RUTE)) {
      const halaman = new URL(`.${rute}${rute.endsWith("/") ? "" : "/"}page.tsx`, APP);
      if (!existsSync(halaman)) hilang.push(`${jalur} → ${rute}`);
    }
  }

  expect(hilang).toEqual([]);
});

test("tiap jangkar # yang ditautkan punya id-nya di berkas yang sama", () => {
  const hilang: string[] = [];

  for (const { jalur, isi } of semua) {
    for (const [, nama] of isi.matchAll(/"#([a-z0-9-]+)"/g)) {
      if (!isi.includes(`id="${nama}"`)) hilang.push(`${jalur} → #${nama}`);
    }
  }

  expect(hilang).toEqual([]);
});

test("tidak ada tautan mati — href ke jangkar kosong", () => {
  // Halaman publik sempat memakainya di 12 tempat: menu kepala, tiga kolom
  // kaki, dan dua tombol utama. Halaman jualan yang tautannya mati
  // memperagakan persis kebalikan dari yang dijual.
  const mati = semua
    .filter(({ isi }) => /href=\{?"#"/.test(isi))
    .map(({ jalur }) => jalur);

  expect(mati).toEqual([]);
});
