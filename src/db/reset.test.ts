// Test integrasi Reset Jadwal — UC-S08.
//
// Yang diuji bukan "apakah barisnya hilang". Yang diuji dua hal yang bisa
// rusak diam-diam dan baru ketahuan di depan klien:
//
//   1. **Yang tinggal, tinggal.** Aturan mingguan dan paket member harus
//      selamat. Kalau ikut terhapus, tombol "Terbitkan sekarang" tidak punya
//      apa pun untuk diterbitkan dan tidak ada yang bisa membooking — reset
//      ini justru mematikan fitur yang mau diperagakan.
//   2. **Kredit kembali seperti saat dibeli.** BR-1.7 menghitung sisa dari
//      SUM(credit_ledger.delta), jadi menghapus baris potongan booking harus
//      MENGEMBALIKAN kreditnya. Kalau satu baris potongan tertinggal, member
//      kehilangan kredit yang tidak pernah dipakainya, dan tidak ada kolom
//      saldo yang bisa dipakai membuktikannya.
//
// Ditambah penjaganya: menolak jalan di database yang bukan demo.

import { afterAll, beforeAll, expect, test } from "vitest";
import postgres from "postgres";
import { resetJadwal, seed } from "./seed";
import { bersihkan as kosongkan, dbUji } from "./uji-db";

const sql = postgres(dbUji(), { max: 4 });

const hitung = async (tabel: string) => {
  const [r] = await sql.unsafe<{ n: number }[]>(
    `select count(*)::int as n from ${tabel}`,
  );
  return r.n;
};

beforeAll(async () => {
  await kosongkan(sql);
  await seed(sql);
}, 60_000);

afterAll(async () => {
  await sql.end();
});

test("mengosongkan jadwal beserta seluruh jejak pemesanannya", async () => {
  // Seed harus benar-benar mengisi keempatnya, kalau tidak test ini hampa.
  expect(await hitung("sessions")).toBeGreaterThan(0);
  expect(await hitung("bookings")).toBeGreaterThan(0);
  expect(await hitung("waitlist_entries")).toBeGreaterThan(0);
  expect(await hitung("notifications")).toBeGreaterThan(0);

  const hasil = await resetJadwal(sql);
  expect(hasil.sesi).toBeGreaterThan(0);

  expect(await hitung("sessions")).toBe(0);
  expect(await hitung("bookings")).toBe(0);
  expect(await hitung("waitlist_entries")).toBe(0);
  expect(await hitung("notifications")).toBe(0);
  const [{ n: sisaLedgerBooking }] = await sql<{ n: number }[]>`
    select count(*)::int as n from credit_ledger where booking_id is not null`;
  expect(sisaLedgerBooking).toBe(0);
});

test("aturan mingguan, orang, katalog, dan paket terbeli tetap di tempatnya", async () => {
  for (const tabel of [
    "schedule_rules",
    "class_types",
    "packages",
    "package_class_types",
    "member_packages",
    "users",
    "studios",
  ]) {
    expect(`${tabel}=${await hitung(tabel)}`).not.toBe(`${tabel}=0`);
  }
});

test("kredit kembali persis seperti saat dibeli — BR-1.7", async () => {
  // Paket yang sudah dihanguskan dikecualikan: baris `hangus` sengaja
  // dibiarkan, jadi saldonya memang nol dan itu benar.
  const menyimpang = await sql<{ id: string; sisa: number; awal: number }[]>`
    select mp.id,
           coalesce(sum(cl.delta), 0)::int as sisa,
           mp.jumlah_kredit_awal as awal
      from member_packages mp
      left join credit_ledger cl on cl.member_package_id = mp.id
     where not exists (
             select 1 from credit_ledger h
              where h.member_package_id = mp.id and h.alasan = 'hangus')
     group by mp.id, mp.jumlah_kredit_awal
    having coalesce(sum(cl.delta), 0) <> mp.jumlah_kredit_awal`;
  expect(menyimpang).toEqual([]);
});

test("dijalankan dua kali tidak menghapus apa pun lagi", async () => {
  const lagi = await resetJadwal(sql);
  expect(lagi).toEqual({
    sesi: 0,
    booking: 0,
    waitlist: 0,
    pesan: 0,
    ledger: 0,
  });
});

test("menolak jalan di database yang bukan demo", async () => {
  await sql`update studios set nama = 'Studio Klien Sungguhan'`;
  await expect(resetJadwal(sql)).rejects.toThrow(/menolak jalan/i);
  await sql`update studios set nama = 'Studio Pilates Kenari'`;
});

test("aturan yang dihentikan bisa dijalankan lagi — bukan jalan satu arah", async () => {
  const { hentikanAturan, jalankanAturan, statusTerbit } = await import("./kelola");

  const semua = await sql<{ id: string }[]>`select id from schedule_rules`;
  expect(semua.length).toBeGreaterThan(0);

  for (const r of semua) await hentikanAturan(sql, r.id);
  // Nol aturan aktif adalah keadaan buntu: "Terbitkan sekarang" tidak akan
  // pernah menghasilkan apa pun, dan layarnya harus bisa mengatakan itu.
  expect((await statusTerbit(sql, new Date())).aturan_aktif).toBe(0);

  await jalankanAturan(sql, semua[0].id);
  expect((await statusTerbit(sql, new Date())).aturan_aktif).toBe(1);
});
