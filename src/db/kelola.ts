// Query layar pengelolaan studio — direktori member, tim, layanan, aturan
// jadwal, dan laporan pemilik.
//
// Dipisah dari admin.ts karena iramanya berbeda: admin.ts dipakai tiap hari
// (dashboard, absensi, pembatalan), berkas ini dipakai sesekali — saat menata
// katalog, menambah kelas, atau melihat angka bulan lalu.
//
// Tidak ada tabel baru. Semua layar di sini membaca 12 tabel yang sudah ada;
// yang selama ini hilang cuma pintunya.

import type postgres from "postgres";
import { saat, ts, type Sql } from "./booking";

/* ── Direktori member — UC-A16 ───────────────────────────────────────────── */

export type BarisMember = {
  id: string;
  nama: string;
  telepon: string;
  sisa_kredit: number;
  hangus_at: Date | null;
  booking_aktif: number;
  terakhir_hadir: Date | null;
};

/**
 * Satu baris per member dengan angka yang menentukan tindakan: sisa kredit,
 * kapan hangus, berapa kelas sudah dipesan, kapan terakhir datang.
 *
 * Sisa kredit dijumlahkan dari buku besar dan hanya dari paket yang masih
 * hidup (BR-1.7 + BR-1.6). Kolom saldo tetap tidak ada.
 */
export async function daftarMember(
  sql: Sql,
  args: { q?: string; sekarang: Date },
): Promise<BarisMember[]> {
  const pola = args.q?.trim() ? `%${args.q.trim()}%` : null;
  const kini = ts(args.sekarang);

  const baris = await sql<BarisMember[]>`
    select u.id,
           u.nama,
           u.telepon,
           (select coalesce(sum(cl.delta), 0)::int
              from member_packages mp
              join credit_ledger cl on cl.member_package_id = mp.id
             where mp.user_id = u.id
               and mp.hangus_at > ${kini}::timestamptz) as sisa_kredit,
           (select min(mp.hangus_at)
              from member_packages mp
             where mp.user_id = u.id
               and mp.hangus_at > ${kini}::timestamptz) as hangus_at,
           (select count(*)::int
              from bookings b
              join sessions s on s.id = b.session_id
             where b.user_id = u.id
               and b.status = 'confirmed'
               and s.mulai_at > ${kini}::timestamptz) as booking_aktif,
           (select max(s.mulai_at)
              from bookings b
              join sessions s on s.id = b.session_id
             where b.user_id = u.id and b.status = 'attended') as terakhir_hadir
      from users u
     where u.peran = 'member'
       and (${pola}::text is null
            or u.nama ilike ${pola} or u.telepon ilike ${pola})
     order by u.nama`;

  return baris.map((b) => ({
    ...b,
    hangus_at: b.hangus_at ? saat(b.hangus_at) : null,
    terakhir_hadir: b.terakhir_hadir ? saat(b.terakhir_hadir) : null,
  }));
}

/* ── Tim: coach, admin, owner — UC-A17 ───────────────────────────────────── */

export type BarisTim = {
  id: string;
  nama: string;
  peran: string;
  telepon: string;
  email: string | null;
  kelas_pekan_ini: number;
  kelas_mendatang: number;
};

export async function daftarTim(sql: Sql, sekarang: Date): Promise<BarisTim[]> {
  const kini = ts(sekarang);
  return sql<BarisTim[]>`
    select u.id, u.nama, u.peran, u.telepon, u.email,
           (select count(*)::int from sessions s
             where s.coach_id = u.id and s.status = 'scheduled'
               and s.mulai_at between ${kini}::timestamptz
                                  and ${kini}::timestamptz + interval '7 days')
             as kelas_pekan_ini,
           (select count(*)::int from sessions s
             where s.coach_id = u.id and s.status = 'scheduled'
               and s.mulai_at > ${kini}::timestamptz) as kelas_mendatang
      from users u
     where u.peran <> 'member'
     order by case u.peran when 'owner' then 1 when 'admin' then 2 else 3 end,
              u.nama`;
}

/* ── Layanan: jenis kelas dan paket — UC-O02, UC-O03 ─────────────────────── */

export type JenisKelas = {
  id: string;
  nama: string;
  kapasitas_default: number;
  durasi_menit: number;
  slot_mingguan: number;
  sesi_mendatang: number;
};

export async function daftarJenisKelas(
  sql: Sql,
  sekarang: Date,
): Promise<JenisKelas[]> {
  return sql<JenisKelas[]>`
    select ct.id, ct.nama, ct.kapasitas_default, ct.durasi_menit,
           (select count(*)::int from schedule_rules r
             where r.class_type_id = ct.id) as slot_mingguan,
           (select count(*)::int from sessions s
             where s.class_type_id = ct.id and s.status = 'scheduled'
               and s.mulai_at > ${ts(sekarang)}::timestamptz) as sesi_mendatang
      from class_types ct
     order by ct.nama`;
}

export type BarisPaket = {
  id: string;
  nama: string;
  jumlah_kredit: number;
  masa_berlaku_hari: number;
  harga_rupiah: number;
  aktif: boolean;
  terjual: number;
  kelas: string[];
};

export async function daftarPaket(sql: Sql): Promise<BarisPaket[]> {
  const baris = await sql<(Omit<BarisPaket, "kelas"> & { kelas: string[] | null })[]>`
    select p.id, p.nama, p.jumlah_kredit, p.masa_berlaku_hari, p.harga_rupiah,
           p.aktif,
           (select count(*)::int from member_packages mp
             where mp.package_id = p.id) as terjual,
           (select array_agg(ct.nama order by ct.nama)
              from package_class_types pct
              join class_types ct on ct.id = pct.class_type_id
             where pct.package_id = p.id) as kelas
      from packages p
     order by p.aktif desc, p.harga_rupiah`;
  return baris.map((b) => ({ ...b, kelas: b.kelas ?? [] }));
}

export const BATAS_PAKET = {
  jumlah_kredit: [1, 200],
  masa_berlaku_hari: [1, 730],
  harga_rupiah: [0, 100_000_000],
} as const;

/**
 * BR-1.4 — paket TANPA jenis kelas sama sekali tidak bisa dipakai membooking
 * apa pun: `pilihPaket()` mencocokkan `class_type_ids`, dan daftar kosong
 * tidak pernah cocok. Karena itu minimal satu jenis wajib dipilih, dan itu
 * dijaga di sini, bukan hanya oleh `required` di form.
 */
export async function buatPaket(
  // Bukan Sql: fungsi ini membuka transaksinya sendiri, dan TransactionSql
  // tidak punya .begin — paket dan jenis kelasnya harus masuk bersamaan.
  sql: postgres.Sql,
  args: {
    studio_id: string;
    nama: string;
    jumlah_kredit: number;
    masa_berlaku_hari: number;
    harga_rupiah: number;
    class_type_ids: string[];
  },
) {
  return sql.begin(async (tx) => {
    const [paket] = await tx<{ id: string }[]>`
      insert into packages
        (studio_id, nama, jumlah_kredit, masa_berlaku_hari, harga_rupiah)
      values (${args.studio_id}, ${args.nama}, ${args.jumlah_kredit},
              ${args.masa_berlaku_hari}, ${args.harga_rupiah})
      returning id`;

    const baris: Record<string, unknown>[] = args.class_type_ids.map((id) => ({
      package_id: paket.id,
      class_type_id: id,
    }));
    await tx`
      insert into package_class_types ${tx(baris, "package_id", "class_type_id")}`;

    return paket.id;
  });
}

/** Paket lama tidak pernah dihapus — `member_packages` menunjuk ke sana. */
export async function ubahAktifPaket(sql: Sql, id: string, aktif: boolean) {
  await sql`update packages set aktif = ${aktif} where id = ${id}`;
}

/* ── Aturan jadwal berulang — UC-O01 ─────────────────────────────────────── */

export const HARI = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Minggu",
] as const;

export type BarisAturan = {
  id: string;
  hari: number;
  jam_mulai: string;
  kapasitas: number | null;
  kelas: string;
  kapasitas_default: number;
  durasi_menit: number;
  coach: string | null;
  berlaku_sampai: string | null;
  sesi_mendatang: number;
};

export async function daftarAturan(
  sql: Sql,
  sekarang: Date,
): Promise<BarisAturan[]> {
  return sql<BarisAturan[]>`
    select r.id, r.hari, r.jam_mulai, r.kapasitas, r.berlaku_sampai,
           ct.nama as kelas, ct.kapasitas_default, ct.durasi_menit,
           c.nama as coach,
           (select count(*)::int from sessions s
             where s.schedule_rule_id = r.id and s.status = 'scheduled'
               and s.mulai_at > ${ts(sekarang)}::timestamptz) as sesi_mendatang
      from schedule_rules r
      join class_types ct on ct.id = r.class_type_id
      left join users c on c.id = r.coach_id
     order by r.hari, r.jam_mulai`;
}

export async function buatAturan(
  sql: Sql,
  args: {
    studio_id: string;
    class_type_id: string;
    coach_id: string | null;
    hari: number;
    jam_mulai: string;
    kapasitas: number | null;
  },
) {
  const [r] = await sql<{ id: string }[]>`
    insert into schedule_rules
      (studio_id, class_type_id, coach_id, hari, jam_mulai, kapasitas, berlaku_dari)
    values (${args.studio_id}, ${args.class_type_id}, ${args.coach_id},
            ${args.hari}, ${args.jam_mulai}, ${args.kapasitas}, current_date)
    returning id`;
  return r.id;
}

/**
 * Berhentikan aturan tanpa menghapusnya: `berlaku_sampai` kemarin membuat job
 * generate berhenti menerbitkan sesi baru, sementara sesi yang sudah ada —
 * beserta bookingnya — tetap utuh. Menghapus barisnya akan memutus
 * `sessions.schedule_rule_id`.
 */
export async function hentikanAturan(sql: Sql, id: string) {
  await sql`
    update schedule_rules set berlaku_sampai = current_date - 1 where id = ${id}`;
}

/** Hapus sesi mendatang yang belum punya booking sama sekali. */
export async function bersihkanSesiKosong(sql: Sql, schedule_rule_id: string) {
  const baris = await sql<{ id: string }[]>`
    delete from sessions s
     where s.schedule_rule_id = ${schedule_rule_id}
       and s.mulai_at > now()
       and not exists (select 1 from bookings b where b.session_id = s.id)
       and not exists (select 1 from waitlist_entries w where w.session_id = s.id)
    returning s.id`;
  return baris.length;
}

/**
 * Sesi sekali jalan — kelas tambahan, workshop, jam pengganti.
 * `schedule_rule_id` dibiarkan NULL; itu yang membuatnya luput dari job
 * generate maupun dari index idempotensinya (BR-7.1).
 */
export async function buatSesiManual(
  sql: Sql,
  args: {
    studio_id: string;
    class_type_id: string;
    coach_id: string | null;
    /** Tanggal WIB `YYYY-MM-DD` dan jam dinding WIB `HH:MM`, apa adanya. */
    tanggal: string;
    jam: string;
    durasi_menit: number;
    kapasitas: number;
  },
): Promise<Date> {
  // Perubahan jam dinding → timestamptz dikerjakan Postgres, bukan
  // JavaScript menebak offset (BR-7.5). Hasilnya dibaca balik lewat saat()
  // karena di runtime Next timestamptz kembali sebagai string mentah.
  const [s] = await sql<{ mulai_at: string | Date }[]>`
    insert into sessions
      (studio_id, class_type_id, coach_id, mulai_at, durasi_menit, kapasitas)
    values (${args.studio_id}, ${args.class_type_id}, ${args.coach_id},
            (${args.tanggal}::date + ${args.jam}::time) at time zone 'Asia/Jakarta',
            ${args.durasi_menit}, ${args.kapasitas})
    returning mulai_at`;
  return saat(s.mulai_at);
}

/* ── Laporan pemilik — UC-O04, UC-O05 ────────────────────────────────────── */

export type Laporan = {
  bulanan: { bulan: string; paket: number; rupiah: number }[];
  paket: { nama: string; terjual: number; rupiah: number }[];
  okupansi: { kursi: number; terisi: number; sesi: number };
  kehadiran: { hadir: number; bolos: number };
  hangus: { kredit: number; rupiah: number };
};

/**
 * Semua angka dihitung ulang dari baris transaksi tiap kali halaman dibuka.
 * Tidak ada tabel ringkasan: satu studio menulis ~25 baris sehari, dan
 * ringkasan yang basi lebih mahal daripada query yang diulang.
 *
 * Pendapatan diakui pada `dibeli_at` — saat paket dibeli, bukan saat
 * kreditnya dipakai. Itu yang cocok dengan cara pemilik studio menghitung
 * kas masuk, dan bedanya perlu disebut kalau nanti ada akuntan yang bertanya.
 */
export async function laporan(
  sql: Sql,
  args: { sekarang: Date; hari: number },
): Promise<Laporan> {
  const kini = ts(args.sekarang);
  const sejak = ts(new Date(args.sekarang.getTime() - args.hari * 86_400_000));

  const [bulanan, paket, okupansi, kehadiran, hangus] = await Promise.all([
    sql<{ bulan: string; paket: number; rupiah: string }[]>`
      select to_char(date_trunc('month', mp.dibeli_at at time zone 'Asia/Jakarta'),
                     'YYYY-MM') as bulan,
             count(*)::int as paket,
             sum(p.harga_rupiah)::bigint as rupiah
        from member_packages mp
        join packages p on p.id = mp.package_id
       group by 1
       order by 1 desc
       limit 6`,

    sql<{ nama: string; terjual: number; rupiah: string }[]>`
      select p.nama,
             count(mp.id)::int as terjual,
             coalesce(sum(p.harga_rupiah), 0)::bigint as rupiah
        from packages p
        left join member_packages mp on mp.package_id = p.id
       group by p.id, p.nama
       order by 3 desc`,

    sql<{ kursi: number; terisi: number; sesi: number }[]>`
      with lewat as (
        select id, kapasitas from sessions
         where status = 'scheduled'
           and mulai_at between ${sejak}::timestamptz and ${kini}::timestamptz
      )
      select (select count(*)::int from lewat) as sesi,
             (select coalesce(sum(kapasitas), 0)::int from lewat) as kursi,
             (select count(*)::int from bookings b
               where b.session_id in (select id from lewat)
                 and b.status in ('confirmed', 'attended', 'no_show')) as terisi`,

    sql<{ hadir: number; bolos: number }[]>`
      select count(*) filter (where b.status = 'attended')::int as hadir,
             count(*) filter (where b.status = 'no_show')::int as bolos
        from bookings b
        join sessions s on s.id = b.session_id
       where s.mulai_at between ${sejak}::timestamptz and ${kini}::timestamptz`,

    // Kredit hangus dinilai per paketnya: harga dibagi jumlah kredit. Itu
    // uang yang sudah masuk kas tapi tidak pernah jadi kelas — angka yang
    // membuat panel "kredit hangus ≤ 7 hari" di dashboard punya harga.
    sql<{ kredit: number; rupiah: string }[]>`
      select coalesce(sum(-cl.delta), 0)::int as kredit,
             coalesce(sum(-cl.delta * p.harga_rupiah
                          / nullif(p.jumlah_kredit, 0)), 0)::bigint as rupiah
        from credit_ledger cl
        join member_packages mp on mp.id = cl.member_package_id
        join packages p on p.id = mp.package_id
       where cl.alasan = 'hangus'
         and cl.created_at >= ${sejak}::timestamptz`,
  ]);

  return {
    bulanan: bulanan.map((b) => ({ ...b, rupiah: Number(b.rupiah) })),
    paket: paket.map((b) => ({ ...b, rupiah: Number(b.rupiah) })),
    okupansi: okupansi[0],
    kehadiran: kehadiran[0],
    hangus: { kredit: hangus[0].kredit, rupiah: Number(hangus[0].rupiah) },
  };
}

/* ── Jadwal mengajar coach — UC-C01, UC-C02 ──────────────────────────────── */

export type KelasCoach = {
  id: string;
  mulai_at: Date;
  durasi_menit: number;
  kelas: string;
  kapasitas: number;
  status: "scheduled" | "cancelled";
  peserta: { nama: string; nomor_alat: number; status: string }[];
};

export async function kelasCoach(
  sql: Sql,
  args: { coach_id: string; sekarang: Date },
): Promise<KelasCoach[]> {
  const baris = await sql<KelasCoach[]>`
    select s.id, s.mulai_at, s.durasi_menit, s.kapasitas, s.status,
           ct.nama as kelas,
           coalesce(
             (select jsonb_agg(jsonb_build_object(
                       'nama', u.nama,
                       'nomor_alat', b.nomor_alat,
                       'status', b.status)
                     order by b.nomor_alat)
                from bookings b
                join users u on u.id = b.user_id
               where b.session_id = s.id
                 and b.status in ('confirmed', 'attended', 'no_show')),
             '[]'::jsonb) as peserta
      from sessions s
      join class_types ct on ct.id = s.class_type_id
     where s.coach_id = ${args.coach_id}
       and s.mulai_at >= ${ts(args.sekarang)}::timestamptz - interval '12 hours'
     order by s.mulai_at
     limit 40`;

  return baris.map((b) => ({ ...b, mulai_at: saat(b.mulai_at) }));
}
