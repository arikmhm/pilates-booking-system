// Penjaga menu — DS-43. Tiap butir menu, breadcrumb, dan tombol menyebut
// rutenya sebagai string biasa yang tidak diperiksa siapa pun; menghapus layar
// meninggalkan butir menu yang tampak normal tapi mendarat di 404.
// Test ini membaca sumbernya apa adanya, bukan mengimpor daftar menunya.

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

/** Rute yang disebut di dalam sumber. Sengaja hanya string harfiah: yang
 *  dirakit template (`/admin/sesi/${id}`) tidak bisa diperiksa di sini. */
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
  // Halaman publik sempat memakainya di 12 tempat — halaman jualan yang
  // tautannya mati memperagakan kebalikan dari yang dijual.
  const mati = semua
    .filter(({ isi }) => /href=\{?"#"/.test(isi))
    .map(({ jalur }) => jalur);

  expect(mati).toEqual([]);
});

test("jangkar ke halaman profil (/#…) punya id-nya di halaman profil", () => {
  // `"/#paket"` lolos dua penjaga di atas: bukan rute (ada `#`) dan bukan
  // jangkar di berkas yang sama. Padahal itu bentuk yang dipakai layar publik.
  const profil = readFileSync(new URL("page.tsx", APP), "utf8");
  const hilang: string[] = [];

  for (const { jalur, isi } of semua) {
    for (const [, nama] of isi.matchAll(/"\/#([a-z0-9-]+)"/g)) {
      if (!profil.includes(`id="${nama}"`)) hilang.push(`${jalur} → /#${nama}`);
    }
  }

  expect(hilang).toEqual([]);
});
