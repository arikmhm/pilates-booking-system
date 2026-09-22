// Penjaga tabrakan nama token — DS-29.
//
// Di Tailwind v4, utilitas `max-w-*` ikut membaca namespace `--spacing-*`.
// Mendefinisikan `--spacing-lg: 60px` membuat `max-w-lg` bernilai 60px alih-alih
// 512px, dan seluruh kolom isi menyusut jadi selebar dua kata. Gagalnya senyap:
// tidak ada galat, tidak ada luapan, typecheck dan lint tetap hijau — halamannya
// saja yang tidak terbaca. Sekali ini terjadi sudah cukup.

import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

// Skala container bawaan Tailwind v4.
const CONTAINER = [
  "3xs", "2xs", "xs", "sm", "md", "lg", "xl",
  "2xl", "3xl", "4xl", "5xl", "6xl", "7xl",
];

// Komentar dibuang dulu: penjelasan bug ini sendiri menyebut `--spacing-lg`
// sebagai contoh, dan tanpa ini test menuduh prosanya.
const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");

test("tidak ada --spacing-* yang bertabrakan dengan skala container", () => {
  const bentrok = CONTAINER.filter((n) =>
    new RegExp(`--spacing-${n}\\s*:`).test(css),
  );
  expect(bentrok).toEqual([]);
});

test("token jarak yang dipakai memang terdefinisi", () => {
  for (const n of ["rapat", "dekat", "sedang", "lega", "luas", "gutter"]) {
    expect(css).toContain(`--spacing-${n}:`);
  }
});
