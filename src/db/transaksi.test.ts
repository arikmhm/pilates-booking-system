// Test integrasi buku transaksi — UC-M14, UC-C03.
// Yang diuji: kredit yang KEMBALI harus ikut dihitung. Batal tepat waktu
// menulis dua baris (−1 lalu +1); query yang cuma membaca 'booking' melaporkan
// kelas berkursi nol sebagai pemakan kredit. Sisi member diuji dari arah lain:
// awal − dipakai + kembali harus persis sama dengan sisa (BR-1.7).

import { afterAll, beforeAll, expect, test } from "vitest";
import postgres from "postgres";
import {
  kelasTerpakaiCoach,
  kreditMenggantung,
  pembelianMember,
} from "./transaksi";
import { bersihkan as kosongkan, dbUji } from "./uji-db";

const sql = postgres(dbUji(), { max: 4 });

const SEKARANG = new Date("2026-09-22T05:00:00Z"); // Selasa, 12.00 WIB
const jam = (n: number) => new Date(SEKARANG.getTime() + n * 3_600_000);

let coach: string;
let member: string;
let paketMember: string;
let sesiHadir: string;
let sesiBatal: string;

beforeAll(async () => {
  await kosongkan(sql);

  const [{ id: studio }] = await sql<{ id: string }[]>`
    insert into studios (nama) values ('Studio Uji') returning id`;

  const [{ id: jenis }] = await sql<{ id: string }[]>`
    insert into class_types (studio_id, nama, kapasitas_default, durasi_menit)
    values (${studio}, 'Reformer', 8, 60) returning id`;

  [{ id: coach }] = await sql<{ id: string }[]>`
    insert into users (studio_id, nama, telepon, peran)
    values (${studio}, 'Coach Uji', '08110002', 'coach') returning id`;

  [{ id: member }] = await sql<{ id: string }[]>`
    insert into users (studio_id, nama, telepon)
    values (${studio}, 'Member Uji', '08110001') returning id`;

  const [paket] = await sql<{ id: string }[]>`
    insert into packages (studio_id, nama, jumlah_kredit, masa_berlaku_hari, harga_rupiah)
    values (${studio}, '10 Sesi', 10, 60, 1350000) returning id`;

  [{ id: paketMember }] = await sql<{ id: string }[]>`
    insert into member_packages
      (user_id, package_id, dibeli_at, hangus_at, jumlah_kredit_awal)
    values (${member}, ${paket.id},
            ${jam(-24 * 10).toISOString()}::timestamptz,
            ${jam(24 * 50).toISOString()}::timestamptz, 10)
    returning id`;

  // Dua kelas milik coach yang sama, dua nasib berbeda.
  [{ id: sesiHadir }] = await sql<{ id: string }[]>`
    insert into sessions (studio_id, class_type_id, coach_id, mulai_at,
                          durasi_menit, kapasitas)
    values (${studio}, ${jenis}, ${coach}, ${jam(-48).toISOString()}::timestamptz,
            60, 8)
    returning id`;

  [{ id: sesiBatal }] = await sql<{ id: string }[]>`
    insert into sessions (studio_id, class_type_id, coach_id, mulai_at,
                          durasi_menit, kapasitas)
    values (${studio}, ${jenis}, ${coach}, ${jam(-24).toISOString()}::timestamptz,
            60, 8)
    returning id`;

  const [hadir] = await sql<{ id: string }[]>`
    insert into bookings (session_id, user_id, member_package_id, nomor_alat, status)
    values (${sesiHadir}, ${member}, ${paketMember}, 1, 'attended') returning id`;

  const [batal] = await sql<{ id: string }[]>`
    insert into bookings (session_id, user_id, member_package_id, nomor_alat, status)
    values (${sesiBatal}, ${member}, ${paketMember}, 1, 'cancelled') returning id`;

  // 10 dibeli · 1 dipakai dan hadir · 1 dipakai lalu batal tepat waktu (BR-3.1)
  await sql`
    insert into credit_ledger (member_package_id, booking_id, delta, alasan)
    values (${paketMember}, null,        10, 'beli'),
           (${paketMember}, ${hadir.id}, -1, 'booking'),
           (${paketMember}, ${batal.id}, -1, 'booking'),
           (${paketMember}, ${batal.id},  1, 'batal_tepat_waktu')`;

  // Paket kedua: masa berlaku SUDAH lewat, sisa 4 kredit — bukan kewajiban
  // studio lagi, jadi tidak boleh ikut terhitung sebagai kredit menggantung.
  const [mati] = await sql<{ id: string }[]>`
    insert into member_packages
      (user_id, package_id, dibeli_at, hangus_at, jumlah_kredit_awal)
    values (${member}, ${paket.id},
            ${jam(-24 * 70).toISOString()}::timestamptz,
            ${jam(-24).toISOString()}::timestamptz, 10)
    returning id`;
  await sql`
    insert into credit_ledger (member_package_id, delta, alasan)
    values (${mati.id}, 10, 'beli'), (${mati.id}, -6, 'booking')`;
});

afterAll(async () => {
  await kosongkan(sql);
  await sql.end();
});

test("kelas coach: kursi yang batal tepat waktu tidak memakan kredit (BR-3.1)", async () => {
  const kelas = await kelasTerpakaiCoach(sql, {
    coach_id: coach,
    sejak: jam(-24 * 7),
    sampai: SEKARANG,
  });

  const hadir = kelas.find((k) => k.id === sesiHadir)!;
  const batal = kelas.find((k) => k.id === sesiBatal)!;

  expect(hadir).toMatchObject({ kursi: 1, kredit: 1 });
  // Bukan 1: baris 'booking' −1 dibalas 'batal_tepat_waktu' +1.
  expect(batal).toMatchObject({ kursi: 0, kredit: 0 });
});

test("pembelian member: awal − dipakai + kembali = sisa (BR-1.7)", async () => {
  const [beli] = await pembelianMember(sql, member);

  expect(beli).toMatchObject({
    kredit_awal: 10,
    dipakai: 2,
    kembali: 1,
    hangus: 0,
    sisa: 9,
  });
  expect(beli.kredit_awal - beli.dipakai + beli.kembali).toBe(beli.sisa);
});

test("kredit menggantung dinilai per paketnya, bukan per kredit rata-rata", async () => {
  // Paket 1.350.000 / 10 kredit = 135.000; sisa 9 dan belum lewat → 9 × 135.000.
  // Rumus pembaginya sama dengan `ringkasUang()`.
  const m = await kreditMenggantung(sql, { sekarang: SEKARANG });
  expect(m).toEqual({ rupiah: 1_215_000, kredit: 9, paket: 1 });
});
