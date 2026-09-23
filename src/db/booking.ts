// Query kapasitas dan kredit. Klien db selalu lewat argumen: test memakai
// koneksi lokal, jadi test tidak pernah bisa menulis ke Neon.

import type postgres from "postgres";
import type { PaketMember, Sesi, Setelan } from "@/rules";

// Sql dan TransactionSql tidak saling assignable; union cukup karena hanya
// tanda tangan tagged template yang dipakai di sini.
export type Sql = postgres.Sql | postgres.TransactionSql;

/** Date → ISO string untuk parameter timestamptz. Di runtime server Next,
 *  `value instanceof Date` di postgres.js false (beda realm) dan Date mentah
 *  meledak. Wajib berpasangan dengan cast `::timestamptz`. */
export const ts = (d: Date | null | undefined) => (d ? d.toISOString() : null);

/** timestamptz yang DITERIMA → Date. Di runtime Next parser postgres.js tidak
 *  terpasang, kolomnya kembali sebagai string; `new Date()` menangani keduanya
 *  dan idempoten. Dinormalisasi di sini supaya src/rules/ tidak dapat string. */
export const saat = (v: unknown): Date => new Date(v as string);

/* ── Query 5.1 · booking atomik — 05-data-model.md ────────────────────────
   Balapan dijaga partial unique index (BR-2.3), tanpa lock. 0 baris = penuh. */
export async function pesanKursi(
  sql: Sql,
  args: {
    session_id: string;
    user_id: string;
    member_package_id: string;
    sumber?: "member" | "admin" | "waitlist";
    dipromosikan_at?: Date | null;
    /** BR-2.6 — sekadar urutan pilihan, bukan syarat: kalau keburu diambil
     *  orang lain, yang terdekat tetap didapat. Kosong = sistem yang pilih. */
    alat_pilihan?: number | null;
  },
): Promise<{ id: string; nomor_alat: number } | null> {
  const baris = await sql<{ id: string; nomor_alat: number }[]>`
    insert into bookings
      (session_id, user_id, member_package_id, nomor_alat, status, sumber, dipromosikan_at)
    select s.id, ${args.user_id}, ${args.member_package_id}, alat, 'confirmed',
           ${args.sumber ?? "member"}, ${ts(args.dipromosikan_at)}::timestamptz
    from sessions s
    cross join lateral generate_series(1, s.kapasitas) as alat
    where s.id = ${args.session_id}
      and s.status = 'scheduled'
      and alat not in (
        select nomor_alat from bookings
        where session_id = s.id and status = 'confirmed'
      )
    order by (alat = ${args.alat_pilihan ?? null}::int) desc, alat
    limit 1
    returning id, nomor_alat`;
  return baris[0] ?? null;
}

/** Nomor alat yang sudah terisi di satu sesi — pemilih alat layar M2 (BR-2.6). */
export async function alatTerpakai(
  sql: Sql,
  session_id: string,
): Promise<number[]> {
  const baris = await sql<{ nomor_alat: number }[]>`
    select nomor_alat from bookings
     where session_id = ${session_id} and status = 'confirmed'
     order by nomor_alat`;
  return baris.map((b) => b.nomor_alat);
}

/** Dua constraint yang bisa dilanggar `pesanKursi` — sama-sama 23505, tapi
 *  penanganannya berlawanan. */
export const ALAT_BENTROK = "bookings_sesi_alat_key"; // balapan → coba lagi
export const SUDAH_TERDAFTAR = "bookings_sesi_user_key"; // BR-2.4 → tolak

/* ── Query 5.2 · paket valid milik member, urut paling cepat hangus ────── */
export async function paketMember(
  sql: Sql,
  user_id: string,
): Promise<PaketMember[]> {
  const baris = await sql<
    { id: string; hangus_at: Date; sisa: number; class_type_ids: string[] }[]
  >`
    select mp.id,
           mp.hangus_at,
           coalesce(sum(cl.delta), 0)::int as sisa,
           (select array_agg(pct.class_type_id)
              from package_class_types pct
             where pct.package_id = mp.package_id) as class_type_ids
      from member_packages mp
      left join credit_ledger cl on cl.member_package_id = mp.id
     where mp.user_id = ${user_id}
     group by mp.id, mp.hangus_at, mp.package_id
     order by mp.hangus_at`;

  // Saring sisa <= 0 di sini, bukan HAVING: M3 tetap perlu melihat paket nol.
  return baris.map((b) => ({
    id: b.id,
    hangus_at: saat(b.hangus_at),
    sisa_kredit: b.sisa,
    class_type_ids: b.class_type_ids ?? [],
  }));
}

/* ── Sesi dalam jendela booking + okupansi ─────────────────────────────── */
export type BarisJadwal = Sesi & {
  kelas: string;
  coach: string | null;
  kapasitas: number;
  terisi: number;
  antre: number;
  booking_saya: { nomor_alat: number } | null;
  antre_saya: boolean;
};

/** `user_id` boleh null — jadwal bersifat publik (UC-P01). Dicor ke `uuid`
 *  supaya Postgres punya tipe; `= null` tidak pernah benar, jadi kolom
 *  `booking_saya`/`antre_saya` ikut kosong sendiri. */
export async function jadwal(
  sql: Sql,
  args: { user_id: string | null; dari: Date; sampai: Date },
): Promise<BarisJadwal[]> {
  const baris = await sql<BarisJadwal[]>`
    select s.id,
           s.class_type_id,
           s.status,
           s.mulai_at,
           s.durasi_menit,
           s.kapasitas,
           ct.nama as kelas,
           c.nama  as coach,
           count(b.id) filter (where b.status = 'confirmed')::int as terisi,
           (select count(*) from waitlist_entries w
             where w.session_id = s.id and w.status = 'waiting')::int as antre,
           (select jsonb_build_object('nomor_alat', b2.nomor_alat)
              from bookings b2
             where b2.session_id = s.id and b2.user_id = ${args.user_id}::uuid
               and b2.status = 'confirmed') as booking_saya,
           exists (select 1 from waitlist_entries w2
                    where w2.session_id = s.id and w2.user_id = ${args.user_id}::uuid
                      and w2.status = 'waiting') as antre_saya
      from sessions s
      join class_types ct on ct.id = s.class_type_id
      left join users c on c.id = s.coach_id
      left join bookings b on b.session_id = s.id
     where s.mulai_at >= ${ts(args.dari)}::timestamptz
       and s.mulai_at <  ${ts(args.sampai)}::timestamptz
     group by s.id, ct.nama, c.nama
     order by s.mulai_at`;
  return baris.map((b) => ({ ...b, mulai_at: saat(b.mulai_at) }));
}

/** Booking aktif milik member — dipakai bolehBooking() untuk X3 dan X4. */
export async function bookingAktif(sql: Sql, user_id: string) {
  const baris = await sql<
    { session_id: string; mulai_at: Date; durasi_menit: number }[]
  >`
    select b.session_id, s.mulai_at, s.durasi_menit
      from bookings b
      join sessions s on s.id = b.session_id
     where b.user_id = ${user_id}
       and b.status = 'confirmed'
       and s.mulai_at >= now()`;
  return baris.map((b) => ({ ...b, mulai_at: saat(b.mulai_at) }));
}

/** Satu sesi, waktunya sudah dinormalisasi — dipakai server action supaya
 *  tidak ada baris mentah lolos ke src/rules/. */
export async function sesiById(sql: Sql, id: string): Promise<Sesi | null> {
  const [s] = await sql<Sesi[]>`
    select id, class_type_id, status, mulai_at, durasi_menit
      from sessions where id = ${id}`;
  return s ? { ...s, mulai_at: saat(s.mulai_at) } : null;
}

export async function setelanStudio(sql: Sql): Promise<Setelan> {
  const [s] = await sql<Setelan[]>`
    select booking_opens_days, booking_closes_hours,
           cancel_window_hours, waitlist_max
      from studios limit 1`;
  return s;
}

/* ── Layar M3 · Akun Saya ─────────────────────────────────────────────── */

export type BookingSaya = {
  id: string;
  session_id: string;
  member_package_id: string;
  nomor_alat: number;
  dipromosikan_at: Date | null;
  mulai_at: Date;
  durasi_menit: number;
  kelas: string;
  coach: string | null;
};

/** Booking confirmed yang kelasnya belum lewat, paling dekat duluan. */
export async function bookingSaya(
  sql: Sql,
  user_id: string,
): Promise<BookingSaya[]> {
  const baris = await sql<BookingSaya[]>`
    select b.id, b.session_id, b.member_package_id, b.nomor_alat,
           b.dipromosikan_at, s.mulai_at, s.durasi_menit,
           ct.nama as kelas, c.nama as coach
      from bookings b
      join sessions s on s.id = b.session_id
      join class_types ct on ct.id = s.class_type_id
      left join users c on c.id = s.coach_id
     where b.user_id = ${user_id}
       and b.status = 'confirmed'
       and s.mulai_at >= now()
     order by s.mulai_at`;
  return baris.map((b) => ({
    ...b,
    mulai_at: saat(b.mulai_at),
    dipromosikan_at: b.dipromosikan_at ? saat(b.dipromosikan_at) : null,
  }));
}

export type BarisLedger = {
  id: string;
  delta: number;
  alasan: string;
  catatan: string | null;
  created_at: Date;
  kelas: string | null;
  mulai_at: Date | null;
};

/** BR-1.7 — riwayat baris per baris; alasan tidak ada kolom saldo. */
export async function riwayatKredit(
  sql: Sql,
  user_id: string,
  batas = 40,
): Promise<BarisLedger[]> {
  const baris = await sql<BarisLedger[]>`
    select cl.id, cl.delta, cl.alasan, cl.catatan, cl.created_at,
           ct.nama as kelas, s.mulai_at
      from credit_ledger cl
      join member_packages mp on mp.id = cl.member_package_id
      left join bookings b on b.id = cl.booking_id
      left join sessions s on s.id = b.session_id
      left join class_types ct on ct.id = s.class_type_id
     where mp.user_id = ${user_id}
     order by cl.created_at desc, cl.id desc
     limit ${batas}`;
  return baris.map((b) => ({
    ...b,
    created_at: saat(b.created_at),
    mulai_at: b.mulai_at ? saat(b.mulai_at) : null,
  }));
}

/** `user_id` opsional: diisi supaya kepemilikan ikut diperiksa di query.
 *  Dikosongkan hanya jalur admin (UC-A06) yang dijaga `pastikanAdmin()`. */
export async function bookingById(sql: Sql, id: string, user_id?: string) {
  const pemilik = user_id ?? null;
  const [b] = await sql<
    {
      id: string;
      session_id: string;
      member_package_id: string;
      dipromosikan_at: Date | null;
    }[]
  >`select id, session_id, member_package_id, dipromosikan_at
      from bookings
     where id = ${id} and status = 'confirmed'
       and (${pemilik}::uuid is null or user_id = ${pemilik})`;
  return b
    ? { ...b, dipromosikan_at: b.dipromosikan_at ? saat(b.dipromosikan_at) : null }
    : null;
}

/* ── Alur 4 · antrean satu sesi, urut FIFO (BR-4.2) ───────────────────── */

export async function antreanSesi(sql: Sql, session_id: string) {
  return sql<{ id: string; user_id: string }[]>`
    select id, user_id from waitlist_entries
     where session_id = ${session_id} and status = 'waiting'
     order by created_at`;
}

/** Antrean milik satu member — BR-4.7, dipakai layar Akun Saya. */
export type AntreSaya = {
  entry_id: string;
  session_id: string;
  mulai_at: Date;
  kelas: string;
  coach: string | null;
  posisi: number;
};

export async function antreanSaya(sql: Sql, user_id: string): Promise<AntreSaya[]> {
  const baris = await sql<AntreSaya[]>`
    select w.id as entry_id,
           s.id as session_id,
           s.mulai_at,
           ct.nama as kelas,
           c.nama as coach,
           (select count(*)::int + 1 from waitlist_entries w2
             where w2.session_id = w.session_id
               and w2.status = 'waiting'
               and w2.created_at < w.created_at) as posisi
      from waitlist_entries w
      join sessions s on s.id = w.session_id
      join class_types ct on ct.id = s.class_type_id
      left join users c on c.id = s.coach_id
     where w.user_id = ${user_id}
       and w.status = 'waiting'
       and s.mulai_at > now()
     order by s.mulai_at`;
  return baris.map((b) => ({ ...b, mulai_at: saat(b.mulai_at) }));
}
