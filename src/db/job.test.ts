// Test integrasi empat job terjadwal — 04-flows.md bagian 7.
//
// Yang diuji di sini bukan "apakah barisnya berubah" — itu mudah dan tidak
// menarik. Yang diuji adalah **idempotensi**: tiap job dijalankan DUA KALI
// dan jalan kedua harus tidak mengubah apa pun. Cron memang dijalankan ulang:
// retry setelah timeout, jam yang telat, dua instance yang tumpang tindih,
// atau orang yang penasaran menekan endpoint-nya.
//
// Kalau penjaganya bocor, akibatnya berbeda-beda dan semuanya mahal: kredit
// terpotong dua kali, jadwal berisi sesi kembar, member menerima dua pesan
// yang membingungkan. Tidak satu pun bisa ditangkap typecheck.

import { afterAll, beforeAll, expect, test } from "vitest";
import postgres from "postgres";
import {
  generateSesi,
  hanguskanKredit,
  tandaiNoShow,
  tutupWaitlist,
} from "./job";
import { bersihkan as kosongkan, dbUji } from "./uji-db";

const sql = postgres(dbUji(), { max: 4 });
const bersihkan = () => kosongkan(sql);

const SEKARANG = new Date("2026-09-22T05:00:00Z"); // Selasa, 12.00 WIB
const jam = (n: number) => new Date(SEKARANG.getTime() + n * 3_600_000);

let studio: string;
let jenis: string;
let member: string;
let paketMember: string;
let sesiLampau: string;
let sesiTutup: string;

beforeAll(async () => {
  await bersihkan();

  [{ id: studio }] = await sql<{ id: string }[]>`
    insert into studios (nama, noshow_after_hours, booking_closes_hours,
                         generate_weeks_ahead)
    values ('Studio Uji', 2, 1, 2) returning id`;

  [{ id: jenis }] = await sql<{ id: string }[]>`
    insert into class_types (studio_id, nama, kapasitas_default, durasi_menit)
    values (${studio}, 'Reformer', 8, 60) returning id`;

  // Aturan berulang tiap hari Selasa 07.00 WIB — dipakai job generate sesi.
  await sql`
    insert into schedule_rules
      (studio_id, class_type_id, hari, jam_mulai, berlaku_dari)
    values (${studio}, ${jenis}, 2, '07:00', '2026-01-01')`;

  [{ id: member }] = await sql<{ id: string }[]>`
    insert into users (studio_id, nama, telepon)
    values (${studio}, 'Member Uji', '08110001') returning id`;

  const [paket] = await sql<{ id: string }[]>`
    insert into packages (studio_id, nama, jumlah_kredit, masa_berlaku_hari, harga_rupiah)
    values (${studio}, '10 Sesi', 10, 60, 1350000) returning id`;

  // Paket yang SUDAH lewat hangus_at dengan sisa 4 kredit.
  [{ id: paketMember }] = await sql<{ id: string }[]>`
    insert into member_packages
      (user_id, package_id, dibeli_at, hangus_at, jumlah_kredit_awal)
    values (${member}, ${paket.id},
            ${jam(-24 * 61).toISOString()}::timestamptz,
            ${jam(-24).toISOString()}::timestamptz, 10)
    returning id`;
  await sql`
    insert into credit_ledger (member_package_id, delta, alasan)
    values (${paketMember}, 10, 'beli'), (${paketMember}, -6, 'booking')`;

  // Sesi yang selesai 4 jam lalu — lewat ambang no-show 2 jam.
  [{ id: sesiLampau }] = await sql<{ id: string }[]>`
    insert into sessions (studio_id, class_type_id, mulai_at, durasi_menit, kapasitas)
    values (${studio}, ${jenis}, ${jam(-5).toISOString()}::timestamptz, 60, 8)
    returning id`;
  await sql`
    insert into bookings (session_id, user_id, member_package_id, nomor_alat)
    values (${sesiLampau}, ${member}, ${paketMember}, 1)`;

  // Sesi yang mulai 30 menit lagi — booking sudah tutup (1 jam sebelum).
  [{ id: sesiTutup }] = await sql<{ id: string }[]>`
    insert into sessions (studio_id, class_type_id, mulai_at, durasi_menit, kapasitas)
    values (${studio}, ${jenis}, ${jam(0.5).toISOString()}::timestamptz, 60, 8)
    returning id`;
  await sql`
    insert into waitlist_entries (session_id, user_id)
    values (${sesiTutup}, ${member})`;
});

afterAll(async () => {
  await bersihkan();
  await sql.end();
});

const hitung = async (teks: string) => {
  const [r] = await sql.unsafe<{ n: number }[]>(`select count(*)::int as n ${teks}`);
  return r.n;
};

test("hanguskan kredit: sisa 4 jadi satu baris ledger, jalan kedua diam (BR-1.6)", async () => {
  const pertama = await hanguskanKredit(sql, SEKARANG);
  expect(pertama).toEqual({ dihanguskan: 1, kredit: 4 });

  const [{ sisa }] = await sql<{ sisa: number }[]>`
    select coalesce(sum(delta), 0)::int as sisa
      from credit_ledger where member_package_id = ${paketMember}`;
  expect(sisa).toBe(0); // 10 − 6 − 4

  // Jalan kedua: hasilPenghangusan() melihat baris 'hangus' sudah ada.
  expect(await hanguskanKredit(sql, SEKARANG)).toEqual({ dihanguskan: 0, kredit: 0 });
  expect(await hitung(`from credit_ledger where alasan = 'hangus'`)).toBe(1);
});

test("hanguskan kredit: penjaganya database, bukan urutan baca (BR-1.6)", async () => {
  // Dua cron yang tumpang tindih membaca "belum dihanguskan" bersamaan, lalu
  // dua-duanya menulis. Yang menahannya credit_ledger_hangus_key, bukan
  // pemeriksaan di JavaScript — dan hanya INSERT langsung yang membuktikannya.
  await expect(
    sql`insert into credit_ledger (member_package_id, delta, alasan)
        values (${paketMember}, -4, 'hangus')`,
  ).rejects.toMatchObject({ code: "23505" });
});

test("no-show otomatis: hanya yang lewat 2 jam, jalan kedua diam (BR-6.2)", async () => {
  const sebelum = await hitung(`from credit_ledger`);

  expect(await tandaiNoShow(sql, SEKARANG)).toEqual({ ditandai: 1 });
  expect(await hitung(`from bookings where status = 'no_show'`)).toBe(1);

  // BR-6.3 — kredit tidak dikembalikan dan tidak dipotong lagi.
  expect(await hitung(`from credit_ledger`)).toBe(sebelum);

  expect(await tandaiNoShow(sql, SEKARANG)).toEqual({ ditandai: 0 });
});

test("tutup waitlist: expired + satu notifikasi, jalan kedua diam (BR-4.6)", async () => {
  expect(await tutupWaitlist(sql, SEKARANG)).toEqual({ ditutup: 1 });
  expect(await hitung(`from waitlist_entries where status = 'expired'`)).toBe(1);
  expect(await hitung(`from notifications where template = 'waitlist_tutup'`)).toBe(1);

  expect(await tutupWaitlist(sql, SEKARANG)).toEqual({ ditutup: 0 });
  expect(await hitung(`from notifications where template = 'waitlist_tutup'`)).toBe(1);
});

test("generate sesi: 2 minggu ke depan, jalan kedua tidak menggandakan (BR-7.1)", async () => {
  const pertama = await generateSesi(sql, SEKARANG);
  // Aturan jatuh tiap Selasa; 22 Sep 07.00 WIB sudah lewat pukul 12.00 WIB,
  // jadi yang terbit 29 Sep, 6 Okt — dan bisa 13 Okt kalau tanggal akhir
  // rentang (hari ini + 14) masih Selasa. Yang dijamin: minimal dua.
  expect(pertama.dibuat).toBeGreaterThanOrEqual(2);

  expect(await generateSesi(sql, SEKARANG)).toEqual({ dibuat: 0 });

  // Kapasitas DISALIN dari class_types, tidak di-join (BR-7.3).
  const [{ kapasitas, durasi_menit }] = await sql<
    { kapasitas: number; durasi_menit: number }[]
  >`select kapasitas, durasi_menit from sessions
     where schedule_rule_id is not null limit 1`;
  expect(kapasitas).toBe(8);
  expect(durasi_menit).toBe(60);

  // Semua hasil generate jatuh pukul 07.00 WIB, bukan 07.00 UTC (BR-7.5).
  const jamWib = await sql<{ j: string }[]>`
    select distinct to_char(mulai_at at time zone 'Asia/Jakarta', 'HH24:MI') as j
      from sessions where schedule_rule_id is not null`;
  expect(jamWib.map((r) => r.j)).toEqual(["07:00"]);
});
