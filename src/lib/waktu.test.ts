// BR-7.5 — aritmetika hari WIB. Empat berkas bergantung padanya dan tidak ada
// yang berteriak kalau meleset sejam: kalender cuma salah baris.
import { expect, test } from "vitest";
import { awalHariWib, awalMingguWib, menitHariWib } from "./waktu.ts";

// 2026-09-22 adalah hari Selasa.
const selasaPagi = new Date("2026-09-21T23:00:00Z"); // 22 Sep 06.00 WIB
const selasaMalam = new Date("2026-09-22T16:30:00Z"); // 22 Sep 23.30 WIB

test("menit dihitung dari tengah malam WIB, bukan UTC", () => {
  expect(menitHariWib(selasaPagi)).toBe(6 * 60);
  expect(menitHariWib(selasaMalam)).toBe(23 * 60 + 30);
  // Tengah malam WIB tepat: 24.00 harus jadi 0, bukan 1440.
  expect(menitHariWib(new Date("2026-09-22T17:00:00Z"))).toBe(0);
});

test("awal hari WIB jatuh pukul 17.00 UTC hari sebelumnya", () => {
  expect(awalHariWib(selasaPagi).toISOString()).toBe("2026-09-21T17:00:00.000Z");
  // Titik paling rawan: 23.30 WIB masih hari yang sama, bukan hari berikutnya.
  expect(awalHariWib(selasaMalam).toISOString()).toBe("2026-09-21T17:00:00.000Z");
});

test("minggu dimulai Senin 00.00 WIB", () => {
  const senin = awalMingguWib(selasaPagi);
  expect(senin.toISOString()).toBe("2026-09-20T17:00:00.000Z"); // 21 Sep 00.00 WIB
  // Minggu malam masih minggu yang lalu — pergeserannya 6 hari, bukan 0.
  const minggu = new Date("2026-09-20T15:00:00Z"); // 20 Sep 22.00 WIB, hari Minggu
  expect(awalMingguWib(minggu).toISOString()).toBe("2026-09-13T17:00:00.000Z");
});
