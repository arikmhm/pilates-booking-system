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
//
// Di ujung berkas, penjaga yang menentukan siapa yang boleh memperbaiki salah
// centang cakupan paket: hanya paket yang belum sempat dibeli siapa pun.

import { afterAll, beforeAll, expect, test } from "vitest";
import postgres from "postgres";
import { kursiVsKredit, ubahPaket } from "./kelola";
import { bersihkan as kosongkan, dbUji } from "./uji-db";

const sql = postgres(dbUji(), { max: 4 });

const SEKARANG = new Date("2026-09-22T05:00:00Z"); // Selasa, 12.00 WIB
const jam = (n: number) => new Date(SEKARANG.getTime() + n * 3_600_000);
const hari = (n: number) => jam(n * 24);

let jenisId: Record<string, string>;
let paketBelumLaku: string;

beforeAll(async () => {
  await kosongkan(sql);

  const [{ id: studio }] = await sql<{ id: string }[]>`
    insert into studios (nama) values ('Studio Uji') returning id`;

  jenisId = {};
  const jenis = jenisId;
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

  // Paket yang belum pernah dibeli — bahan uji penjaga ubah-cakupan.
  const [belum] = await sql<{ id: string }[]>`
    insert into packages (studio_id, nama, jumlah_kredit, masa_berlaku_hari,
                          harga_rupiah)
    values (${studio}, 'Belum Laku', 3, 30, 900000) returning id`;
  paketBelumLaku = belum.id;
  await sql`
    insert into package_class_types (package_id, class_type_id)
    values (${belum.id}, ${jenis.Reformer})`;

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

/* ── Penjaga ubah-cakupan paket ──────────────────────────────────────────── */

/** Nilai lain paket dibiarkan apa adanya — yang diuji di sini penjaganya. */
const ISI = { nama: "Belum Laku", jumlah_kredit: 3, masa_berlaku_hari: 30, harga_rupiah: 900000 };

test("paket yang belum pernah dibeli boleh diubah", async () => {
  // Salah centang saat membuat paket harus bisa dibetulkan, bukan menyisakan
  // paket rusak yang cuma bisa disembunyikan.
  const berhasil = await ubahPaket(sql, paketBelumLaku, {
    ...ISI,
    harga_rupiah: 750_000,
    class_type_ids: [jenisId.Private],
  });
  expect(berhasil).toBe(true);

  const [p] = await sql<{ harga_rupiah: number }[]>`
    select harga_rupiah from packages where id = ${paketBelumLaku}`;
  expect(p.harga_rupiah).toBe(750_000);

  const cakupan = await sql<{ nama: string }[]>`
    select ct.nama from package_class_types pct
      join class_types ct on ct.id = pct.class_type_id
     where pct.package_id = ${paketBelumLaku}`;
  expect(cakupan.map((c) => c.nama)).toEqual(["Private"]);
});

test("paket yang sudah dibeli DITOLAK, dan tidak tersentuh sedikit pun", async () => {
  // Harga dan nama dibaca hidup-hidup oleh buku transaksi, jadi mengubahnya
  // menulis ulang riwayat penjualan. Mempersempit cakupan lebih keras lagi:
  // kredit yang sudah dibayar jadi ditolak di kelas yang kemarin masih boleh
  // (BR-1.4).
  const [laku] = await sql<{ id: string; harga_rupiah: number }[]>`
    select id, harga_rupiah from packages where nama = 'Bebas 4 Sesi'`;

  const berhasil = await ubahPaket(sql, laku.id, {
    nama: "Nama Baru",
    jumlah_kredit: 99,
    masa_berlaku_hari: 999,
    harga_rupiah: 1,
    class_type_ids: [jenisId.Private],
  });
  expect(berhasil).toBe(false);

  const [tetap] = await sql<{ nama: string; harga_rupiah: number }[]>`
    select nama, harga_rupiah from packages where id = ${laku.id}`;
  expect(tetap.nama).toBe("Bebas 4 Sesi");
  expect(tetap.harga_rupiah).toBe(laku.harga_rupiah);

  const cakupan = await sql<{ nama: string }[]>`
    select ct.nama from package_class_types pct
      join class_types ct on ct.id = pct.class_type_id
     where pct.package_id = ${laku.id} order by ct.nama`;
  expect(cakupan.map((c) => c.nama)).toEqual(["Private", "Reformer"]);
});
