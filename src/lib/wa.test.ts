// Nomor WA yang salah ubah berarti mengirim pesan kredit member ke orang
// asing. Transformasinya sepele, akibat salahnya tidak.

import { expect, test } from "vitest";
import { nomorWa, tautanWa } from "./wa";

test("awalan 0 diganti 62", () => {
  expect(nomorWa("08122100013")).toBe("628122100013");
});

test("nomor yang sudah 62 tidak diubah dua kali", () => {
  expect(nomorWa("628122100013")).toBe("628122100013");
});

test("spasi, tanda hubung, dan +62 dibersihkan", () => {
  expect(nomorWa("+62 812-2100-013")).toBe("628122100013");
  expect(nomorWa("0812 2100 013")).toBe("628122100013");
});

test("pesan di-encode, bukan ditempel mentah", () => {
  const t = tautanWa("081234", "Halo Sri, kredit & sisa 3 — dipakai ya?");
  expect(t.startsWith("https://wa.me/6281234?text=")).toBe(true);
  expect(t).not.toContain(" ");
  expect(t).toContain("%26"); // "&" tidak boleh memotong query
});
