// Test integrasi wajib — AGENTS.md dan 06-architecture.md bagian 3.
//
// Tembakkan 20 booking paralel ke kelas berkapasitas 8. Tepat 8 harus berhasil.
// Ini satu-satunya cara membuktikan BR-2.3 dijaga database, bukan kebetulan.
// Nilainya melebihi 50 unit test: kalau partial unique index di schema.ts hilang,
// test ini merah. Tidak ada cara lain menangkapnya.

import { afterAll, beforeAll, expect, test } from "vitest";
import postgres from "postgres";

const KAPASITAS = 8;
const PENYERBU = 20;

// Test ini menjalankan TRUNCATE CASCADE. Sejak `neon link` menimpa
// DATABASE_URL dengan branch Neon, `npm test` bisa mengosongkan database
// sungguhan. Karena itu test memakai TEST_DATABASE_URL dan MENOLAK jalan
// kalau host-nya bukan lokal — ini pengaman, bukan kenyamanan.
function dbUji(): string {
  const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL belum diisi — lihat .env.example");
  const host = new URL(url).hostname;
  if (host !== "localhost" && host !== "127.0.0.1") {
    throw new Error(
      `Test menolak jalan: TEST_DATABASE_URL menunjuk ${host}, bukan localhost. ` +
        "Test ini TRUNCATE semua tabel. Jalankan `npm run db:up` lalu arahkan " +
        "TEST_DATABASE_URL ke Postgres lokal.",
    );
  }
  return url;
}

// max > PENYERBU supaya 20 percobaan benar-benar berebut, bukan antre di pool
const sql = postgres(dbUji(), { max: PENYERBU + 2 });

const TABEL = [
  "credit_ledger",
  "waitlist_entries",
  "notifications",
  "bookings",
  "member_packages",
  "package_class_types",
  "packages",
  "sessions",
  "schedule_rules",
  "class_types",
  "users",
  "studios",
];

async function bersihkan() {
  await sql.unsafe(`truncate ${TABEL.join(", ")} cascade`);
}

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

// Query 5.1 docs/05-data-model.md. Nomor alat diturunkan dari kapasitas sesi,
// jadi mustahil di luar rentang. Pindah ke server action saat booking dibangun.
async function pesanKursi(
  user_id: string,
  member_package_id: string,
  session_id: string = sesi,
) {
  const baris = await sql`
    insert into bookings (session_id, user_id, member_package_id, nomor_alat, status, sumber)
    select s.id, ${user_id}, ${member_package_id}, alat, 'confirmed', 'member'
    from sessions s
    cross join lateral generate_series(1, s.kapasitas) as alat
    where s.id = ${session_id}
      and s.status = 'scheduled'
      and alat not in (
        select nomor_alat from bookings
        where session_id = s.id and status = 'confirmed'
      )
    order by alat
    limit 1
    returning nomor_alat`;
  return baris.length === 1;
}

test("20 booking paralel ke kelas 8 kursi → tepat 8 berhasil (BR-2.3)", async () => {
  const hasil = await Promise.all(
    member.map(async (m) => {
      // Dua penyerbu bisa memilih alat yang sama di detik yang sama; yang kalah
      // ditolak unique index dengan 23505, lalu mencoba alat berikutnya.
      // Inilah yang dilakukan server action nanti.
      for (let coba = 0; coba < PENYERBU; coba++) {
        try {
          return await pesanKursi(m.user_id, m.member_package_id);
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
  await expect(pesanKursi(m.user_id, m.member_package_id, sesiKedua)).resolves.toBe(
    true,
  );
  // Kursi kedua di sesi yang sama: ditolak index, bukan ditolak kode aplikasi.
  await expect(
    pesanKursi(m.user_id, m.member_package_id, sesiKedua),
  ).rejects.toMatchObject({ code: "23505" });
});
