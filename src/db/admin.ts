// Query layar admin A1–A3. Dipisah dari booking.ts karena audiens dan
// layarnya berbeda: ini tampilan laptop di meja resepsionis (DS-16).

import { saat, ts, type Sql } from "./booking";

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

/** "Hari ini" dihitung di kalender WIB, bukan UTC — kelas 06.00 WIB jatuh di
 *  tanggal kemarin kalau dipotong hari UTC (BR-7.5). Batasnya disusun di SQL
 *  supaya tidak ada parameter waktu yang perlu diserialisasi. */
export async function sesiHariIni(
  sql: Sql,
  geser = 0,
): Promise<SesiHariIni[]> {
  const baris = await sql<SesiHariIni[]>`
    with hari as (
      select (date_trunc('day', now() at time zone 'Asia/Jakarta')
               + make_interval(days => ${geser}))
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

/** Query 5.3 — 05-data-model.md. Bukan laporan: daftar orang yang harus
 *  di-chat hari ini. */
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

/* ── Dua antrean kerja meja depan — dashboard A1 sisi admin ──────────────── */

export type AntreMenunggu = {
  id: string;
  nama: string;
  telepon: string;
  session_id: string;
  mulai_at: Date;
  kelas: string;
  terisi: number;
  kapasitas: number;
};

/** Siapa yang menunggu kursi, bukan berapa orang — begitu kursi terbuka, meja
 *  depan butuh nama dan nomornya, bukan chip "3 antre". */
export async function antreMenunggu(
  sql: Sql,
  args: { sekarang: Date; batas?: number },
): Promise<AntreMenunggu[]> {
  const baris = await sql<AntreMenunggu[]>`
    select w.id, u.nama, u.telepon,
           s.id as session_id, s.mulai_at, s.kapasitas,
           ct.nama as kelas,
           (select count(*) from bookings b
             where b.session_id = s.id and b.status = 'confirmed')::int as terisi
      from waitlist_entries w
      join users u on u.id = w.user_id
      join sessions s on s.id = w.session_id
      join class_types ct on ct.id = s.class_type_id
     where w.status = 'waiting'
       and s.status = 'scheduled'
       and s.mulai_at >= ${ts(args.sekarang)}::timestamptz
     order by s.mulai_at, w.created_at
     limit ${args.batas ?? 6}`;
  return baris.map((b) => ({ ...b, mulai_at: saat(b.mulai_at) }));
}

export type BelumDiabsen = {
  id: string;
  mulai_at: Date;
  kelas: string;
  coach: string | null;
  belum: number;
};

/** Kelas selesai yang kehadirannya belum dicentang. Sesudah
 *  `noshow_after_hours` (BR-6.2) job no-show menandainya sendiri dan koreksinya
 *  jadi manual per orang (BR-6.4). Jendela dua hari ke belakang saja. */
export async function belumDiabsen(
  sql: Sql,
  args: { sekarang: Date; batas?: number },
): Promise<BelumDiabsen[]> {
  const kini = ts(args.sekarang);
  const baris = await sql<BelumDiabsen[]>`
    select s.id, s.mulai_at, ct.nama as kelas, c.nama as coach,
           count(*)::int as belum
      from bookings b
      join sessions s on s.id = b.session_id
      join class_types ct on ct.id = s.class_type_id
      left join users c on c.id = s.coach_id
     where b.status = 'confirmed'
       and s.status = 'scheduled'
       and s.mulai_at + make_interval(mins => s.durasi_menit)
             <= ${kini}::timestamptz
       and s.mulai_at >= ${kini}::timestamptz - make_interval(days => 2)
     group by s.id, ct.nama, c.nama
     order by s.mulai_at desc
     limit ${args.batas ?? 6}`;
  return baris.map((b) => ({ ...b, mulai_at: saat(b.mulai_at) }));
}

export type Setelan3 = {
  id: string;
  nama: string;
  cancel_window_hours: number;
  booking_opens_days: number;
  waitlist_max: number;
  studio_cancel_extension_days: number;
};

export async function setelanLengkap(sql: Sql): Promise<Setelan3> {
  const [s] = await sql<Setelan3[]>`
    select id, nama, cancel_window_hours, booking_opens_days, waitlist_max,
           studio_cancel_extension_days
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

/* ── Layar A2 · Detail sesi ───────────────────────────────────────────── */

export type DetailSesi = {
  id: string;
  mulai_at: Date;
  durasi_menit: number;
  kapasitas: number;
  status: "scheduled" | "cancelled";
  alasan_batal: string | null;
  kelas: string;
  coach: string | null;
  coach_id: string | null;
};

export async function detailSesi(
  sql: Sql,
  id: string,
): Promise<DetailSesi | null> {
  const [s] = await sql<DetailSesi[]>`
    select s.id, s.mulai_at, s.durasi_menit, s.kapasitas, s.status,
           s.alasan_batal, ct.nama as kelas, c.nama as coach, s.coach_id
      from sessions s
      join class_types ct on ct.id = s.class_type_id
      left join users c on c.id = s.coach_id
     where s.id = ${id}`;
  return s ? { ...s, mulai_at: saat(s.mulai_at) } : null;
}

export type Peserta = {
  booking_id: string;
  user_id: string;
  nama: string;
  telepon: string;
  nomor_alat: number;
  status: "confirmed" | "cancelled" | "attended" | "no_show";
  sumber: "member" | "admin" | "waitlist";
  dipromosikan_at: Date | null;
};

export async function pesertaSesi(sql: Sql, session_id: string): Promise<Peserta[]> {
  const baris = await sql<Peserta[]>`
    select b.id as booking_id, b.user_id, u.nama, u.telepon, b.nomor_alat,
           b.status, b.sumber, b.dipromosikan_at
      from bookings b
      join users u on u.id = b.user_id
     where b.session_id = ${session_id}
     order by b.status <> 'cancelled' desc, b.nomor_alat`;
  return baris.map((b) => ({
    ...b,
    dipromosikan_at: b.dipromosikan_at ? saat(b.dipromosikan_at) : null,
  }));
}

export type Pengantre = {
  id: string;
  nama: string;
  telepon: string;
  status: string;
  created_at: Date;
};

export async function antreanLengkap(
  sql: Sql,
  session_id: string,
): Promise<Pengantre[]> {
  const baris = await sql<Pengantre[]>`
    select w.id, u.nama, u.telepon, w.status, w.created_at
      from waitlist_entries w
      join users u on u.id = w.user_id
     where w.session_id = ${session_id}
     order by w.created_at`;
  return baris.map((b) => ({ ...b, created_at: saat(b.created_at) }));
}

/** BR-5.4 — mode massal: semua sesi coach yang sama pada hari WIB yang sama.
 *  "Coach sakit" membatalkan satu hari penuh, bukan satu kelas. */
export async function sesiSekelompok(
  sql: Sql,
  session_id: string,
  massal: boolean,
): Promise<string[]> {
  if (!massal) return [session_id];
  const baris = await sql<{ id: string }[]>`
    with acuan as (
      select coach_id,
             (mulai_at at time zone 'Asia/Jakarta')::date as hari
        from sessions where id = ${session_id}
    )
    select s.id
      from sessions s, acuan a
     where s.status = 'scheduled'
       and s.coach_id is not distinct from a.coach_id
       and (s.mulai_at at time zone 'Asia/Jakarta')::date = a.hari`;
  return baris.map((b) => b.id);
}

/** Ambang BR-5.2 — paket yang hangus dalam kurang dari ini ikut diperpanjang.
 *  Angkanya tetap; besar perpanjangannya yang diatur `studio_cancel_extension_days`. */
export const AMBANG_PERPANJANG_HARI = 7;

export type RingkasBatal = {
  sesi: number;
  kredit: number;
  diperpanjang: number;
  antre: number;
  pesan: number;
};

/** Alur 5 — pembatalan oleh studio dalam SATU pernyataan (rangkaian CTE):
 *  mustahil berhenti di tengah dengan separuh kredit dikembalikan, dan angka
 *  yang ditampilkan layar akhir datang dari pernyataan yang mengerjakannya. */
export async function batalkanSesi(
  sql: Sql,
  args: {
    ids: string[];
    alasan: string;
    pelaku_id: string;
    perpanjang_hari: number;
    isiPeserta: string;
    isiAntre: string;
  },
): Promise<RingkasBatal> {
  const [r] = await sql<RingkasBatal[]>`
    with target as (
      update sessions
         set status = 'cancelled', alasan_batal = ${args.alasan}, dibatalkan_at = now()
       where id = any(${args.ids}) and status = 'scheduled'
      returning id
    ), batal as (
      update bookings b
         set status = 'cancelled', dibatalkan_at = now()
       where b.session_id in (select id from target) and b.status = 'confirmed'
      returning b.id, b.user_id, b.member_package_id, b.session_id
    ), kembali as (
      -- BR-5.1 kredit kembali PENUH, tanpa melihat jam. Kesalahan studio
      -- bukan kesalahan member, jadi aturan 12 jam tidak berlaku di sini.
      insert into credit_ledger (member_package_id, booking_id, delta, alasan, pelaku_id)
      select member_package_id, id, 1, 'batal_studio', ${args.pelaku_id} from batal
      returning 1
    ), perpanjang as (
      -- BR-5.2 kredit yang kembali tidak ada gunanya kalau paketnya hangus
      -- lusa. Yang mepet diperpanjang, dan jejaknya disimpan.
      update member_packages mp
         set hangus_at = mp.hangus_at + make_interval(days => ${args.perpanjang_hari}),
             diperpanjang_at = now()
       where mp.id in (select member_package_id from batal)
         and mp.hangus_at < now() + make_interval(days => ${AMBANG_PERPANJANG_HARI})
      returning 1
    ), antre as (
      -- BR-5.3 antrean ikut dibatalkan dan diberi tahu
      update waitlist_entries w set status = 'expired'
       where w.session_id in (select id from target) and w.status = 'waiting'
      returning w.user_id, w.session_id
    ), pesan as (
      insert into notifications (user_id, kanal, template, isi, session_id)
      select user_id, 'layar', 'kelas_batal', ${args.isiPeserta}, session_id from batal
      union all
      select user_id, 'layar', 'kelas_batal', ${args.isiAntre}, session_id from antre
      returning 1
    )
    select (select count(*) from target)::int      as sesi,
           (select count(*) from batal)::int       as kredit,
           (select count(*) from perpanjang)::int  as diperpanjang,
           (select count(*) from antre)::int       as antre,
           (select count(*) from pesan)::int       as pesan`;
  return r;
}

/** BR-6.1 — centang hadir. Tidak menyentuh ledger: kredit sudah dipotong
 *  saat booking, kehadiran hanya mengubah status. */
export async function tandaiHadir(sql: Sql, booking_id: string) {
  const baris = await sql`
    update bookings set status = 'attended'
     where id = ${booking_id} and status in ('confirmed', 'no_show')
    returning id, status`;
  return baris.length > 0;
}

/** BR-6.4 — koreksi no_show jadi hadir. Beda dari `tandaiHadir`: no-show sudah
 *  menghanguskan kredit (BR-6.3), jadi koreksinya WAJIB mengembalikannya. */
export async function koreksiNoShow(
  sql: Sql,
  args: { booking_id: string; catatan: string; pelaku_id: string },
): Promise<boolean> {
  const [r] = await sql<{ ok: boolean }[]>`
    with ubah as (
      update bookings set status = 'attended'
       where id = ${args.booking_id} and status = 'no_show'
      returning id, member_package_id
    ), catat as (
      insert into credit_ledger
        (member_package_id, booking_id, delta, alasan, pelaku_id, catatan)
      select member_package_id, id, 1, 'koreksi', ${args.pelaku_id}, ${args.catatan}
        from ubah
      returning 1
    )
    select (select count(*) from ubah) > 0 as ok`;
  return r.ok;
}

/* ── Layar A3 · Detail member ─────────────────────────────────────────── */

export type Member = {
  id: string;
  nama: string;
  telepon: string;
  email: string | null;
  peran: string;
  created_at: Date;
};

export async function detailMember(sql: Sql, id: string): Promise<Member | null> {
  const [u] = await sql<Member[]>`
    select id, nama, telepon, email, peran, created_at
      from users where id = ${id}`;
  return u ? { ...u, created_at: saat(u.created_at) } : null;
}

export type BarisDompet = {
  id: string;
  paket: string;
  dibeli_at: Date;
  hangus_at: Date;
  jumlah_kredit_awal: number;
  sisa: number;
  diperpanjang_at: Date | null;
};

/** Semua paket, termasuk yang sudah hangus — riwayat pembelian tidak dibuang.
 *  BR-1.7: `sisa` dihitung dari buku besar, bukan kolom saldo. */
export async function dompetMember(
  sql: Sql,
  user_id: string,
): Promise<BarisDompet[]> {
  const baris = await sql<BarisDompet[]>`
    select mp.id, p.nama as paket, mp.dibeli_at, mp.hangus_at,
           mp.jumlah_kredit_awal, mp.diperpanjang_at,
           coalesce(sum(cl.delta), 0)::int as sisa
      from member_packages mp
      join packages p on p.id = mp.package_id
      left join credit_ledger cl on cl.member_package_id = mp.id
     where mp.user_id = ${user_id}
     group by mp.id, p.nama
     order by mp.hangus_at desc`;
  return baris.map((b) => ({
    ...b,
    dibeli_at: saat(b.dibeli_at),
    hangus_at: saat(b.hangus_at),
    diperpanjang_at: b.diperpanjang_at ? saat(b.diperpanjang_at) : null,
  }));
}

/** Batas wajar koreksi manual. Bukan aturan bisnis — pagar supaya salah ketik
 *  tidak menambah 500 kredit dalam satu klik. */
export const BATAS_KOREKSI = 20;

/** BR-1.8 — koreksi manual ±, wajib isi alasan. Saldo tidak boleh negatif
 *  (BR-1.7) dan itu dicek di dalam pernyataan yang sama, bukan baca-lalu-tulis:
 *  dua admin bisa mengoreksi bersamaan. */
export async function koreksiKredit(
  sql: Sql,
  args: {
    member_package_id: string;
    delta: number;
    catatan: string;
    pelaku_id: string;
  },
): Promise<{ ok: boolean; sisa: number }> {
  const [r] = await sql<{ ok: boolean; sisa: number }[]>`
    with sekarang as (
      select coalesce(sum(delta), 0)::int as sisa
        from credit_ledger
       where member_package_id = ${args.member_package_id}
    ), tulis as (
      insert into credit_ledger
        (member_package_id, booking_id, delta, alasan, pelaku_id, catatan)
      select ${args.member_package_id}, null, ${args.delta}, 'koreksi',
             ${args.pelaku_id}, ${args.catatan}
        from sekarang
       where sekarang.sisa + ${args.delta} >= 0
      returning 1
    )
    select (select count(*) from tulis) > 0 as ok,
           (select sisa from sekarang) + case
             when (select count(*) from tulis) > 0 then ${args.delta} else 0
           end as sisa`;
  return r;
}
