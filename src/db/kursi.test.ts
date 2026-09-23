// Test integrasi "kursi vs kredit" — UC-O02.
//
// Yang diuji satu hal yang tidak bisa dilihat typecheck maupun mata: **kredit
// terkunci dan kredit bebas tidak boleh tertukar.** Paket yang cuma mencakup
// satu jenis kelas membebani jenis itu; paket yang mencakup beberapa tidak
// membebani satu pun secara khusus, dan menghitungnya di tiap jenis akan
// melipatgandakan kewajiban studio sampai angkanya tidak berarti apa-apa.
//
// Dua jebakan lain ikut dijaga: kursi yang terbit SESUDAH kredit hangus tidak
// boleh ikut dihitung — ia tidak akan pernah bisa dipakai — dan kursi yang
// sudah dipesan bukan kursi kosong.

import { afterAll, beforeAll, expect, test } from "vitest";
import postgres from "postgres";
import { kursiVsKredit } from "./kelola";
import { bersihkan as kosongkan, dbUji } from "./uji-db";

const sql = postgres(dbUji(), { max: 4 });

const SEKARANG = new Date("2026-09-22T05:00:00Z"); // Selasa, 12.00 WIB
const jam = (n: number) => new Date(SEKARANG.getTime() + n * 3_600_000);
const hari = (n: number) => jam(n * 24);

beforeAll(async () => {
  await kosongkan(sql);

  const [{ id: studio }] = await sql<{ id: string }[]>`
    insert into studios (nama) values ('Studio Uji') returning id`;

  const jenis: Record<string, string> = {};
  for (const [nama, kursi] of [
    ["Private", 1],
    ["Reformer", 8],
  ] as const) {
    const [j] = await sql<{ id: string }[]>`
      insert into class_types (studio_id, nama, kapasitas_default, durasi_menit)
      values (${studio}, ${nama}, ${kursi}, 60) returning id`;
    jenis[nama] = j.id;
  }

  const [{ id: member }] = await sql<{ id: string }[]>`
    insert into users (studio_id, nama, telepon)
    values (${studio}, 'Member Uji', '08110001') returning id`;

  /** Paket + cakupannya + satu pembelian yang masih hidup. */
  async function jual(
    nama: string,
    kredit: number,
    cakupan: string[],
    hangus: Date,
    dibeli = hari(-1),
  ) {
    const [p] = await sql<{ id: string }[]>`
      insert into packages (studio_id, nama, jumlah_kredit, masa_berlaku_hari,
                            harga_rupiah)
      values (${studio}, ${nama}, ${kredit}, 30, 1000000) returning id`;
    await sql`
      insert into package_class_types ${sql(
        cakupan.map((n) => ({ package_id: p.id, class_type_id: jenis[n] })),
        "package_id",
        "class_type_id",
      )}`;
    const [mp] = await sql<{ id: string }[]>`
      insert into member_packages
        (user_id, package_id, dibeli_at, hangus_at, jumlah_kredit_awal)
      values (${member}, ${p.id}, ${dibeli.toISOString()}::timestamptz,
              ${hangus.toISOString()}::timestamptz, ${kredit})
      returning id`;
    await sql`
      insert into credit_ledger (member_package_id, delta, alasan)
      values (${mp.id}, ${kredit}, 'beli')`;
    return mp.id;
  }

  // TERKUNCI: 5 kredit yang cuma bisa dipakai di Private, hangus 30 hari lagi.
  await jual("Private 5 Sesi", 5, ["Private"], hari(30));
  // BEBAS: 4 kredit yang boleh dipakai di dua jenis kelas.
  await jual("Bebas 4 Sesi", 4, ["Private", "Reformer"], hari(20));
  // Sudah hangus — bukan kewajiban studio lagi, tidak boleh ikut terhitung.
  await jual("Private Kedaluwarsa", 9, ["Private"], hari(-1), hari(-31));

  /** Sesi Private berkursi satu. */
  async function sesi(mulai: Date) {
    const [s] = await sql<{ id: string }[]>`
      insert into sessions (studio_id, class_type_id, mulai_at, durasi_menit,
                            kapasitas)
      values (${studio}, ${jenis.Private}, ${mulai.toISOString()}::timestamptz,
              60, 1)
      returning id`;
    return s.id;
  }

  await sesi(hari(3)); // kosong → terhitung
  await sesi(hari(10)); // kosong → terhitung
  await sesi(hari(40)); // SESUDAH kredit terkunci hangus → tidak terhitung
  await sesi(hari(-2)); // sudah lewat → tidak terhitung

  // Sesi yang kursinya sudah dipesan bukan kursi kosong.
  const penuh = await sesi(hari(5));
  const [pemesan] = await sql<{ id: string }[]>`
    insert into users (studio_id, nama, telepon)
    values (${studio}, 'Pemesan', '08110002') returning id`;
  const [mp] = await sql<{ id: string }[]>`
    insert into member_packages
      (user_id, package_id, dibeli_at, hangus_at, jumlah_kredit_awal)
    select ${pemesan.id}, p.id, ${hari(-1).toISOString()}::timestamptz,
           ${hari(30).toISOString()}::timestamptz, 1
      from packages p where p.nama = 'Private 5 Sesi'
    returning id`;
  await sql`
    insert into credit_ledger (member_package_id, delta, alasan)
    values (${mp.id}, 1, 'beli')`;
  const [b] = await sql<{ id: string }[]>`
    insert into bookings (session_id, user_id, member_package_id, nomor_alat,
                          status)
    values (${penuh}, ${pemesan.id}, ${mp.id}, 1, 'confirmed') returning id`;
  await sql`
    insert into credit_ledger (member_package_id, booking_id, delta, alasan)
    values (${mp.id}, ${b.id}, -1, 'booking')`;
});

afterAll(async () => {
  await kosongkan(sql);
  await sql.end();
});

test("kredit terkunci dibebankan ke jenis kelasnya, kredit bebas tidak", async () => {
  const { terkunci, bebas } = await kursiVsKredit(sql, SEKARANG);

  // Private saja — Reformer tidak punya satu pun paket yang khusus untuknya.
  expect(terkunci.map((t) => t.nama)).toEqual(["Private"]);

  // 5 dari paket terkunci + 1 milik pemesan yang tersisa 0 → tidak ikut.
  // Paket kedaluwarsa (9 kredit) juga tidak.
  expect(terkunci[0].kredit).toBe(5);

  // Kursi kosong sampai kredit terkunci hangus: hari ke-3 dan ke-10 saja.
  // Hari ke-40 di luar jendela, hari ke-2 sudah lewat, hari ke-5 sudah
  // dipesan orang.
  expect(terkunci[0].kursi).toBe(2);

  // Paket dua-jenis tidak pernah muncul di baris terkunci mana pun.
  expect(bebas.kredit).toBe(4);
});

test("kursi kurang dari kredit — inilah keadaan yang harus kelihatan", async () => {
  const { terkunci } = await kursiVsKredit(sql, SEKARANG);
  expect(terkunci[0].kursi).toBeLessThan(terkunci[0].kredit);
});

test("tanggal hangus terdekat ikut dilaporkan", async () => {
  // Query cuma menjawab "cukup atau tidak" untuk keseluruhan; timing per
  // member dinilai orang, dan tanggal inilah bahannya.
  const { terkunci } = await kursiVsKredit(sql, SEKARANG);
  expect(terkunci[0].hangus_terdekat.getTime()).toBe(hari(30).getTime());
});
