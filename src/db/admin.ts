// Query layar admin A1–A3. Dipisah dari booking.ts karena audiens dan
// layarnya berbeda: ini tampilan laptop di meja resepsionis (DS-16).

import type postgres from "postgres";
import { saat } from "./booking";

type Sql = postgres.Sql | postgres.TransactionSql;

export type SesiHariIni = {
  id: string;
  mulai_at: Date;
  kelas: string;
  coach: string | null;
  kapasitas: number;
  terisi: number;
  antre: number;
  status: "scheduled" | "cancelled";
};

/**
 * "Hari ini" dihitung di kalender WIB, bukan UTC — kelas 06.00 WIB jatuh di
 * tanggal kemarin kalau dipotong pakai hari UTC (BR-7.5). Batasnya disusun di
 * SQL supaya tidak ada parameter waktu yang perlu diserialisasi sama sekali.
 */
export async function sesiHariIni(sql: Sql): Promise<SesiHariIni[]> {
  const baris = await sql<SesiHariIni[]>`
    with hari as (
      select date_trunc('day', now() at time zone 'Asia/Jakarta')
               at time zone 'Asia/Jakarta' as mulai
    )
    select s.id, s.mulai_at, s.status, s.kapasitas,
           ct.nama as kelas, c.nama as coach,
           count(b.id) filter (where b.status in ('confirmed','attended'))::int as terisi,
           (select count(*) from waitlist_entries w
             where w.session_id = s.id and w.status = 'waiting')::int as antre
      from sessions s
      cross join hari
      join class_types ct on ct.id = s.class_type_id
      left join users c on c.id = s.coach_id
      left join bookings b on b.session_id = s.id
     where s.mulai_at >= hari.mulai
       and s.mulai_at <  hari.mulai + interval '1 day'
     group by s.id, ct.nama, c.nama
     order by s.mulai_at`;
  return baris.map((b) => ({ ...b, mulai_at: saat(b.mulai_at) }));
}

export type KreditMauHangus = {
  user_id: string;
  nama: string;
  telepon: string;
  hangus_at: Date;
  sisa: number;
};

/**
 * Query 5.3 — 05-data-model.md. Senjata presentasi menit 2:15.
 * Ini bukan laporan; ini daftar orang yang harus di-chat hari ini.
 */
export async function kreditMauHangus(
  sql: Sql,
  hari = 7,
): Promise<KreditMauHangus[]> {
  const baris = await sql<KreditMauHangus[]>`
    select u.id as user_id, u.nama, u.telepon, mp.hangus_at,
           sum(cl.delta)::int as sisa
      from member_packages mp
      join users u on u.id = mp.user_id
      join credit_ledger cl on cl.member_package_id = mp.id
     where mp.hangus_at between now() and now() + make_interval(days => ${hari})
     group by u.id, mp.id, mp.hangus_at
    having sum(cl.delta) > 0
     order by mp.hangus_at`;
  return baris.map((b) => ({ ...b, hangus_at: saat(b.hangus_at) }));
}

export type Setelan3 = {
  id: string;
  nama: string;
  cancel_window_hours: number;
  booking_opens_days: number;
  waitlist_max: number;
};

export async function setelanLengkap(sql: Sql): Promise<Setelan3> {
  const [s] = await sql<Setelan3[]>`
    select id, nama, cancel_window_hours, booking_opens_days, waitlist_max
      from studios limit 1`;
  return s;
}

/** Batas wajar tiap setelan. Nilai di luar ini merusak aturan bisnis diam-diam:
 *  jendela batal 0 jam membuat BR-3.1 tidak pernah aktif, jendela buka 0 hari
 *  membuat tidak ada kelas yang bisa dibooking sama sekali. */
export const BATAS_SETELAN = {
  cancel_window_hours: [1, 72],
  booking_opens_days: [1, 60],
  waitlist_max: [0, 50],
} as const;

export type KunciSetelan = keyof typeof BATAS_SETELAN;

export async function simpanSetelan(
  sql: Sql,
  studio_id: string,
  nilai: Record<KunciSetelan, number>,
) {
  await sql`
    update studios set
      cancel_window_hours = ${nilai.cancel_window_hours},
      booking_opens_days  = ${nilai.booking_opens_days},
      waitlist_max        = ${nilai.waitlist_max}
    where id = ${studio_id}`;
}

export async function penggunaById(sql: Sql, id: string) {
  const [u] = await sql<{ id: string; nama: string; peran: string }[]>`
    select id, nama, peran from users where id = ${id}`;
  return u ?? null;
}
