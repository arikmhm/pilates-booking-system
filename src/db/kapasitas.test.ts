// Test integrasi wajib — AGENTS.md dan 06-architecture.md bagian 3.
//
// Tembakkan 20 booking paralel ke kelas berkapasitas 8. Tepat 8 harus berhasil.
// Ini satu-satunya cara membuktikan BR-2.3 dijaga database, bukan kebetulan.
// Nilainya melebihi 50 unit test: kalau partial unique index di schema.ts hilang,
// test ini merah. Tidak ada cara lain menangkapnya.

import { afterAll, beforeAll, describe, expect, test } from "vitest";
import postgres from "postgres";
import { pesanKursi, saat } from "./booking";
import { bersihkan as kosongkan, dbUji } from "./uji-db";

const KAPASITAS = 8;
const PENYERBU = 20;


// max > PENYERBU supaya 20 percobaan benar-benar berebut, bukan antre di pool
const sql = postgres(dbUji(), { max: PENYERBU + 2 });

const bersihkan = () => kosongkan(sql);

let sesi: string;
let sesiKedua: string;
let member: { user_id: string; member_package_id: string }[];

beforeAll(async () => {
  await bersihkan();

  const [studio] = await sql`
    insert into studios (nama) values ('Studio Uji') returning id`;
  const [jenis] = await sql`
    insert into class_types (studio_id, nama, kapasitas_default, durasi_menit)
    values (${studio.id}, 'Reformer', ${KAPASITAS}, 70) returning id`;
  const [paket] = await sql`
    insert into packages (studio_id, nama, jumlah_kredit, masa_berlaku_hari, harga_rupiah)
    values (${studio.id}, '10 Sesi', 10, 60, 1350000) returning id`;
  const [s] = await sql`
    insert into sessions (studio_id, class_type_id, mulai_at, durasi_menit, kapasitas)
    values (${studio.id}, ${jenis.id}, now() + interval '2 days', 70, ${KAPASITAS})
    returning id`;
  sesi = s.id;

  // Sesi kedua yang dibiarkan kosong. Dipakai test BR-2.4: di sesi yang sudah
  // penuh, penjaga kapasitas menyalip lebih dulu dan index (session_id,
  // user_id) tidak pernah tersentuh.
  const [s2] = await sql`
    insert into sessions (studio_id, class_type_id, mulai_at, durasi_menit, kapasitas)
    values (${studio.id}, ${jenis.id}, now() + interval '3 days', 70, ${KAPASITAS})
    returning id`;
  sesiKedua = s2.id;

  member = [];
  for (let i = 0; i < PENYERBU; i++) {
    const [u] = await sql`
      insert into users (studio_id, nama, telepon)
      values (${studio.id}, ${"Member " + i}, ${"0800000" + i}) returning id`;
    const [mp] = await sql`
      insert into member_packages
        (user_id, package_id, hangus_at, jumlah_kredit_awal)
      values (${u.id}, ${paket.id}, now() + interval '60 days', 10) returning id`;
    member.push({ user_id: u.id, member_package_id: mp.id });
  }
});

afterAll(async () => {
  await bersihkan();
  await sql.end();
});

// Query 5.1 sekarang tinggal di src/db/booking.ts dan dipakai server action
// juga. Test ini menyuntikkan koneksi lokalnya sendiri — itu yang menahan
// TRUNCATE supaya tidak pernah kena Neon.
const pesan = (user_id: string, member_package_id: string, session_id = sesi) =>
  pesanKursi(sql, { session_id, user_id, member_package_id }).then((r) => r !== null);

test("20 booking paralel ke kelas 8 kursi → tepat 8 berhasil (BR-2.3)", async () => {
  const hasil = await Promise.all(
    member.map(async (m) => {
      // Dua penyerbu bisa memilih alat yang sama di detik yang sama; yang kalah
      // ditolak unique index dengan 23505, lalu mencoba alat berikutnya.
      // Inilah yang dilakukan server action nanti.
      for (let coba = 0; coba < PENYERBU; coba++) {
        try {
          return await pesan(m.user_id, m.member_package_id);
        } catch (e) {
          if ((e as { code?: string }).code !== "23505") throw e;
        }
      }
      return false;
    }),
  );

  expect(hasil.filter(Boolean)).toHaveLength(KAPASITAS);

  const [cek] = await sql`
    select count(*)::int as jumlah,
           count(distinct nomor_alat)::int as alat_unik,
           min(nomor_alat)::int as terkecil,
           max(nomor_alat)::int as terbesar
    from bookings where session_id = ${sesi} and status = 'confirmed'`;

  expect(cek.jumlah).toBe(KAPASITAS);
  expect(cek.alat_unik).toBe(KAPASITAS); // tidak ada dua orang di satu alat
  expect(cek.terkecil).toBe(1);
  expect(cek.terbesar).toBe(KAPASITAS); // tidak ada alat di luar kapasitas
});

test("member yang sama tidak bisa dua kursi di satu sesi (BR-2.4)", async () => {
  const m = member[0];
  // Kursi pertama di sesi kosong: berhasil.
  await expect(pesan(m.user_id, m.member_package_id, sesiKedua)).resolves.toBe(true);
  // Kursi kedua di sesi yang sama: ditolak index, bukan ditolak kode aplikasi.
  await expect(
    pesan(m.user_id, m.member_package_id, sesiKedua),
  ).rejects.toMatchObject({ code: "23505" });
});

test("dipromosikan_at tersimpan saat kursi diisi dari waitlist (titik 6)", async () => {
  // src/rules/ sudah diuji mengembalikan dipromosikan_at. Yang belum terjaga
  // adalah sisi database: kalau kolomnya tidak ikut tertulis, BR-3.5 diam-diam
  // berhenti bekerja dan orang yang baru naik 3 jam sebelum kelas kena hangus.
  const m = member[PENYERBU - 1];
  const naik = new Date("2026-09-22T03:00:00Z");
  const kursi = await pesanKursi(sql, {
    session_id: sesiKedua,
    user_id: m.user_id,
    member_package_id: m.member_package_id,
    sumber: "waitlist",
    dipromosikan_at: naik,
  });
  expect(kursi).not.toBeNull();

  const [baris] = await sql`
    select sumber, dipromosikan_at from bookings where id = ${kursi!.id}`;
  expect(baris.sumber).toBe("waitlist");
  expect(new Date(baris.dipromosikan_at).toISOString()).toBe(naik.toISOString());
});

test("alat pilihan member dihormati, dan tidak menggagalkan booking (BR-2.6)", async () => {
  // Sesi bersih, disalin dari yang sudah ada supaya studio dan jenis kelasnya
  // ikut tanpa perlu menyimpan id-nya di ruang modul.
  const [s] = await sql`
    insert into sessions (studio_id, class_type_id, mulai_at, durasi_menit, kapasitas)
    select studio_id, class_type_id, now() + interval '4 days', durasi_menit, kapasitas
      from sessions where id = ${sesiKedua}
    returning id`;

  // Memilih alat 5 di kelas yang masih kosong harus memberi alat 5 — bukan
  // alat 1 yang akan diberikan kalau klausa urutannya hilang.
  const pertama = await pesanKursi(sql, {
    session_id: s.id,
    user_id: member[1].user_id,
    member_package_id: member[1].member_package_id,
    alat_pilihan: 5,
  });
  expect(pertama?.nomor_alat).toBe(5);

  // Orang kedua meminta alat yang sama. BR-2.6 adalah urutan, bukan syarat:
  // dia tetap dapat kursi, yaitu alat kosong terkecil.
  const kedua = await pesanKursi(sql, {
    session_id: s.id,
    user_id: member[2].user_id,
    member_package_id: member[2].member_package_id,
    alat_pilihan: 5,
  });
  expect(kedua?.nomor_alat).toBe(1);

  // Tanpa pilihan, perilaku lamanya tidak berubah.
  const ketiga = await pesanKursi(sql, {
    session_id: s.id,
    user_id: member[3].user_id,
    member_package_id: member[3].member_package_id,
  });
  expect(ketiga?.nomor_alat).toBe(2);
});

/* ══ Normalisasi timestamptz ═══════════════════════════════════════════════
   postgres.js mengembalikan Date di node dan string mentah di runtime Next.
   Salah parse di sini tidak melempar apa-apa — cuma menggeser kelas 7 jam,
   yang artinya hari yang salah di layar jadwal.                            */
describe("saat() — timestamptz dari postgres.js", () => {
  test("string offset +00 dibaca sebagai UTC", () => {
    expect(saat("2026-09-22 09:00:00+00").toISOString()).toBe(
      "2026-09-22T09:00:00.000Z",
    );
  });

  test("string offset +07 (WIB) digeser ke UTC, bukan dianggap UTC", () => {
    expect(saat("2026-09-22 16:00:00+07").toISOString()).toBe(
      "2026-09-22T09:00:00.000Z",
    );
  });

  test("Date yang sudah jadi dilewatkan apa adanya — idempoten", () => {
    const d = new Date("2026-09-22T09:00:00.000Z");
    expect(saat(d).toISOString()).toBe(d.toISOString());
    expect(saat(saat(d)).toISOString()).toBe(d.toISOString());
  });
});
