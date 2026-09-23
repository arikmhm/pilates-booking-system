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
  /** Berapa paket yang mencakup jenis ini — pertanyaan khas layar katalog. */
  dipakai_paket: number;
  /** Sudah menempel di slot, sesi, atau paket — syarat yang sama dengan
   *  `hapusJenisKelas()`, supaya layar tidak menawarkan tombol yang gagal. */
  dipakai: boolean;
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
               and s.mulai_at > ${ts(sekarang)}::timestamptz) as sesi_mendatang,
           (select count(*)::int from package_class_types pct
             where pct.class_type_id = ct.id) as dipakai_paket,
           (exists (select 1 from schedule_rules r where r.class_type_id = ct.id)
            or exists (select 1 from sessions s2 where s2.class_type_id = ct.id)
            or exists (select 1 from package_class_types p
                        where p.class_type_id = ct.id)) as dipakai
      from class_types ct
     order by ct.nama`;
}

export const BATAS_JENIS = {
  kapasitas_default: [1, 60],
  durasi_menit: [15, 240],
} as const;

/**
 * UC-O02. Menambah jenis kelas aman terhadap sesi yang sudah berjalan:
 * BR-7.3 menyalin kapasitas ke `sessions` saat sesi dibuat, jadi baris baru
 * di sini tidak menyentuh satu pun sesi lama. Yang tidak disediakan justru
 * mengubah nama dan kapasitas jenis yang sudah dipakai — itu mengubah arti
 * kartu paket yang sudah dibeli orang, dan pantas lewat percakapan.
 *
 * Nama unik per studio dijaga index `class_types_studio_nama_key`, bukan cek
 * dulu baru insert: dua tab yang mengirim nama sama pada saat yang sama akan
 * lolos pemeriksaan yang sama-sama membaca "belum ada".
 */
export const NAMA_JENIS_GANDA = "class_types_studio_nama_key";

export async function buatJenisKelas(
  sql: Sql,
  args: {
    studio_id: string;
    nama: string;
    kapasitas_default: number;
    durasi_menit: number;
  },
) {
  const [j] = await sql<{ id: string }[]>`
    insert into class_types (studio_id, nama, kapasitas_default, durasi_menit)
    values (${args.studio_id}, ${args.nama}, ${args.kapasitas_default},
            ${args.durasi_menit})
    returning id`;
  return j.id;
}

/**
 * Hapus jenis kelas yang **belum dipakai apa pun** — salah ketik yang baru
 * saja dibuat. Begitu ia menempel di slot mingguan, sesi, atau paket, ia
 * tidak bisa dihapus: `sessions` dan `package_class_types` menunjuk ke sini,
 * dan kartu paket yang kehilangan jenis kelasnya berhenti bisa dipakai
 * membooking apa pun (BR-1.4).
 *
 * Syaratnya diperiksa di dalam DELETE-nya, bukan sebagai SELECT terpisah:
 * baris yang lahir di antara kedua query itu akan lolos pemeriksaan yang
 * sudah telanjur dibaca.
 */
export async function hapusJenisKelas(sql: Sql, id: string): Promise<boolean> {
  const hapus = await sql`
    delete from class_types ct
     where ct.id = ${id}
       and not exists (select 1 from schedule_rules r where r.class_type_id = ct.id)
       and not exists (select 1 from sessions s where s.class_type_id = ct.id)
       and not exists (select 1 from package_class_types p
                        where p.class_type_id = ct.id)`;
  return hapus.count > 0;
}

/**
 * Kapasitas dan durasi bawaan satu jenis kelas — dipakai saat formulir
 * jadwal dikosongkan (BR-7.2). Dibaca di server, bukan disalin ke formulir:
 * angka yang dititipkan ke klien bisa diganti sebelum dikirim balik.
 */
export async function jenisKelasById(sql: Sql, id: string) {
  const [j] = await sql<
    { nama: string; kapasitas_default: number; durasi_menit: number }[]
  >`
    select nama, kapasitas_default, durasi_menit
      from class_types where id = ${id}`;
  return j ?? null;
}

/**
 * Sesi terjadwal di sekitar satu jam, untuk penjaga BR-7.6 kelas sekali
 * jalan. Jendelanya dilebarkan 4 jam ke belakang — durasi terpanjang yang
 * boleh disimpan 240 menit, jadi sesi yang MULAI sebelum itu tidak mungkin
 * masih berjalan saat kelas baru dimulai.
 *
 * Sesi dari slot mingguan dan sesi sekali jalan sama-sama di tabel ini, jadi
 * satu query menutup keduanya.
 */
export async function sesiSekitar(
  sql: Sql,
  mulai: Date,
  durasi_menit: number,
): Promise<
  {
    mulai_at: Date;
    durasi_menit: number;
    class_type_id: string;
    coach_id: string | null;
    kelas: string;
  }[]
> {
  const baris = await sql<
    {
      mulai_at: string | Date;
      durasi_menit: number;
      class_type_id: string;
      coach_id: string | null;
      kelas: string;
    }[]
  >`
    select s.mulai_at, s.durasi_menit, s.class_type_id, s.coach_id,
           ct.nama as kelas
      from sessions s
      join class_types ct on ct.id = s.class_type_id
     where s.status = 'scheduled'
       and s.mulai_at >= ${ts(mulai)}::timestamptz - interval '4 hours'
       and s.mulai_at < ${ts(new Date(mulai.getTime() + durasi_menit * 60_000))}::timestamptz`;
  // saat() wajib: di runtime server Next, timestamptz kembali string mentah.
  return baris.map((b) => ({ ...b, mulai_at: saat(b.mulai_at) }));
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

/* ── Kursi vs kredit — UC-O02, UC-O06 ─────────────────────────────────────

   Pertanyaan yang tidak bisa dijawab layar mana pun sebelum ini: "kredit yang
   sudah saya jual, ada kursinya belum?" Studio yang menjual 5 kredit Private
   berkursi satu berutang lima sesi sebelum kredit itu hangus — dan kalau
   tidak dijadwalkan, kreditnya tetap hangus (BR-1.6). Uangnya di studio,
   kreditnya hilang di member. Itu mesin sengketa.

   **Hitungannya syarat perlu, bukan syarat cukup.** Ia membandingkan jumlah
   di dalam satu jendela, bukan mencocokkan tiap member ke tiap kursi: kalau
   kursinya kurang, pasti ada yang tidak kebagian; kalau cukup, masih mungkin
   ada member yang kreditnya hangus duluan karena kursinya baru tersedia
   sesudah tanggal hangusnya. Karena itu tanggal hangus terdekat ikut
   disebut — sisanya penilaian orang, bukan penilaian query.                */

export type KursiVsKredit = {
  /**
   * Jenis kelas yang punya kredit TERKUNCI — kredit dari paket yang cuma
   * mencakup jenis ini, jadi pemiliknya tidak punya kelas lain untuk
   * memakainya. Di sinilah kewajiban studio paling keras.
   */
  terkunci: {
    id: string;
    nama: string;
    kredit: number;
    kursi: number;
    hangus_terdekat: Date;
    hangus_terakhir: Date;
  }[];
  /**
   * Kredit dari paket yang mencakup lebih dari satu jenis kelas. Pemiliknya
   * punya pilihan, jadi tidak bisa dibebankan ke satu jenis kelas mana pun —
   * yang masih berarti cuma totalnya lawan total kursi kosong.
   */
  bebas: { kredit: number; kursi: number; hangus_terakhir: Date | null };
};

/** Sisa kredit satu paket member = SUM(delta) — BR-1.7, tidak ada kolom saldo. */
const SISA_KREDIT = `
  join lateral (select coalesce(sum(cl.delta), 0)::int as sisa
                  from credit_ledger cl
                 where cl.member_package_id = mp.id) x on true`;

export async function kursiVsKredit(
  sql: Sql,
  sekarang: Date,
): Promise<KursiVsKredit> {
  const kini = ts(sekarang);

  const terkunci = await sql<
    {
      id: string;
      nama: string;
      kredit: number;
      kursi: number;
      hangus_terdekat: string | Date;
      hangus_terakhir: string | Date;
    }[]
  >`
    with paket_satu as (
      -- having count(*) = 1 memastikan arraynya cuma berisi satu elemen;
      -- min() tidak dipakai karena Postgres tidak punya min(uuid).
      select package_id, (array_agg(class_type_id))[1] as class_type_id
        from package_class_types
       group by package_id
      having count(*) = 1
    ),
    kredit as (
      select ps.class_type_id,
             sum(x.sisa)::int as kredit,
             min(mp.hangus_at) as hangus_terdekat,
             max(mp.hangus_at) as hangus_terakhir
        from member_packages mp
        join paket_satu ps on ps.package_id = mp.package_id
        ${sql.unsafe(SISA_KREDIT)}
       where mp.hangus_at > ${kini}::timestamptz and x.sisa > 0
       group by ps.class_type_id
    )
    select ct.id, ct.nama, k.kredit, k.hangus_terdekat, k.hangus_terakhir,
           (select coalesce(sum(s.kapasitas
                   - (select count(*) from bookings b
                       where b.session_id = s.id and b.status = 'confirmed')), 0)::int
              from sessions s
             where s.class_type_id = ct.id and s.status = 'scheduled'
               and s.mulai_at > ${kini}::timestamptz
               and s.mulai_at <= k.hangus_terakhir) as kursi
      from kredit k
      join class_types ct on ct.id = k.class_type_id
     order by ct.nama`;

  const [bebas] = await sql<
    { kredit: number; hangus_terakhir: string | Date | null }[]
  >`
    with paket_satu as (
      select package_id from package_class_types
       group by package_id having count(*) = 1
    )
    select coalesce(sum(x.sisa), 0)::int as kredit,
           max(mp.hangus_at) as hangus_terakhir
      from member_packages mp
      ${sql.unsafe(SISA_KREDIT)}
     where mp.hangus_at > ${kini}::timestamptz and x.sisa > 0
       and mp.package_id not in (select package_id from paket_satu)`;

  const [kursiBebas] = bebas.hangus_terakhir
    ? await sql<{ kursi: number }[]>`
        select coalesce(sum(s.kapasitas
               - (select count(*) from bookings b
                   where b.session_id = s.id and b.status = 'confirmed')), 0)::int
                 as kursi
          from sessions s
         where s.status = 'scheduled'
           and s.mulai_at > ${kini}::timestamptz
           and s.mulai_at <= ${ts(saat(bebas.hangus_terakhir))}::timestamptz`
    : [{ kursi: 0 }];

  return {
    terkunci: terkunci.map((t) => ({
      ...t,
      hangus_terdekat: saat(t.hangus_terdekat),
      hangus_terakhir: saat(t.hangus_terakhir),
    })),
    bebas: {
      kredit: bebas.kredit,
      kursi: kursiBebas.kursi,
      hangus_terakhir: bebas.hangus_terakhir ? saat(bebas.hangus_terakhir) : null,
    },
  };
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

/* ── Berikan paket ke member — UC-A13 ────────────────────────────────────── */

/** Paket yang masih dijual, untuk daftar pilihan di layar detail member. */
export type PaketDijual = {
  id: string;
  nama: string;
  jumlah_kredit: number;
  masa_berlaku_hari: number;
  harga_rupiah: number;
  /** Jenis kelas yang boleh diikuti — BR-1.4, bagian dari barangnya. */
  kelas: string[];
};

/** Katalog yang sedang dijual. Dipakai layar publik /paket dan A3. */
export async function paketDijual(sql: Sql): Promise<PaketDijual[]> {
  const baris = await sql<(Omit<PaketDijual, "kelas"> & { kelas: string[] | null })[]>`
    select p.id, p.nama, p.jumlah_kredit, p.masa_berlaku_hari, p.harga_rupiah,
           (select array_agg(ct.nama order by ct.nama)
              from package_class_types pct
              join class_types ct on ct.id = pct.class_type_id
             where pct.package_id = p.id) as kelas
      from packages p
     where p.aktif
     order by p.harga_rupiah`;
  return baris.map((b) => ({ ...b, kelas: b.kelas ?? [] }));
}

/**
 * Satu transaksi, dua baris: `member_packages` yang menyimpan masa berlaku,
 * dan baris ledger `beli` sebesar kreditnya. BR-1.7 menghitung sisa dari buku
 * besar, jadi paket tanpa baris ledger adalah paket berisi nol kredit.
 *
 * `hangus_at` dihitung di Postgres (`+ masa_berlaku_hari * interval '1 day'`),
 * bukan di JavaScript — aritmetika tanggal milik lapisan database (BR-7.5).
 */
export async function berikanPaket(
  sql: postgres.Sql,
  args: { user_id: string; package_id: string; pelaku_id: string },
) {
  return sql.begin(async (tx) => {
    const [paket] = await tx<
      { nama: string; jumlah_kredit: number; masa_berlaku_hari: number }[]
    >`select nama, jumlah_kredit, masa_berlaku_hari
        from packages where id = ${args.package_id} and aktif`;
    if (!paket) return null;

    const [mp] = await tx<{ id: string; hangus_at: string | Date }[]>`
      insert into member_packages
        (user_id, package_id, hangus_at, jumlah_kredit_awal)
      values (${args.user_id}, ${args.package_id},
              now() + ${paket.masa_berlaku_hari} * interval '1 day',
              ${paket.jumlah_kredit})
      returning id, hangus_at`;

    await tx`
      insert into credit_ledger (member_package_id, delta, alasan, pelaku_id)
      values (${mp.id}, ${paket.jumlah_kredit}, 'beli', ${args.pelaku_id})`;

    return { ...paket, hangus_at: saat(mp.hangus_at) };
  });
}

/**
 * Calon peserta untuk booking atas nama (UC-A05): member yang masih punya
 * kredit hidup dan belum terdaftar di sesi ini.
 *
 * Yang disaring di sini cuma daftar pilihannya. Kelayakan sesungguhnya tetap
 * diputuskan `bolehBooking()` saat tombolnya ditekan — BR-1.4 (jenis kelas)
 * dan BR-2.5 (bentrok jam) tidak bisa dijawab tanpa tahu sesi mana.
 */
export async function calonPeserta(
  sql: Sql,
  args: { session_id: string; sekarang: Date },
) {
  const kini = ts(args.sekarang);
  return sql<{ id: string; nama: string; sisa_kredit: number }[]>`
    select u.id, u.nama,
           coalesce(sum(cl.delta), 0)::int as sisa_kredit
      from users u
      join member_packages mp on mp.user_id = u.id
                             and mp.hangus_at > ${kini}::timestamptz
      join credit_ledger cl on cl.member_package_id = mp.id
     where u.peran = 'member'
       and not exists (
         select 1 from bookings b
          where b.session_id = ${args.session_id}
            and b.user_id = u.id
            and b.status = 'confirmed')
     group by u.id, u.nama
    having coalesce(sum(cl.delta), 0) > 0
     order by u.nama`;
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
  /** Dibawa untuk penjaga BR-7.6 — layarnya sendiri memakai nama di bawah. */
  class_type_id: string;
  coach_id: string | null;
  kapasitas: number | null;
  /** null = ikut durasi jenis kelas; `durasi_menit` di bawah sudah dipilihkan. */
  durasi_rule: number | null;
  kelas: string;
  kapasitas_default: number;
  /** Durasi yang BERLAKU — punya aturan kalau diisi, kalau tidak punya jenis kelas. */
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
           r.class_type_id, r.coach_id,
           r.durasi_menit as durasi_rule,
           ct.nama as kelas, ct.kapasitas_default,
           coalesce(r.durasi_menit, ct.durasi_menit) as durasi_menit,
           c.nama as coach,
           (select count(*)::int from sessions s
             where s.schedule_rule_id = r.id and s.status = 'scheduled'
               and s.mulai_at > ${ts(sekarang)}::timestamptz) as sesi_mendatang
      from schedule_rules r
      join class_types ct on ct.id = r.class_type_id
      left join users c on c.id = r.coach_id
     order by r.hari, r.jam_mulai`;
}

/**
 * `berlaku_dari` dan `berlaku_sampai` adalah tanggal DINDING WIB, bukan UTC —
 * `current_date` di Postgres UTC salah sehari antara 00.00 dan 07.00 WIB, dan
 * generateSesi() membandingkannya dengan tanggal yang sudah dikonversi ke
 * Asia/Jakarta. Selisihnya memang cuma melonggarkan, tidak pernah menghilangkan
 * sesi, tapi barisnya jadi berbunyi "berlaku sejak kemarin" untuk aturan yang
 * baru diketik — dan itu yang dibaca orang saat menelusuri sengketa (BR-7.5).
 */
export async function buatAturan(
  sql: Sql,
  args: {
    studio_id: string;
    class_type_id: string;
    coach_id: string | null;
    hari: number;
    jam_mulai: string;
    kapasitas: number | null;
    durasi_menit: number | null;
  },
) {
  const [r] = await sql<{ id: string }[]>`
    insert into schedule_rules
      (studio_id, class_type_id, coach_id, hari, jam_mulai, kapasitas,
       durasi_menit, berlaku_dari)
    values (${args.studio_id}, ${args.class_type_id}, ${args.coach_id},
            ${args.hari}, ${args.jam_mulai}, ${args.kapasitas},
            ${args.durasi_menit}, (now() at time zone 'Asia/Jakarta')::date)
    returning id`;
  return r.id;
}

/**
 * Berhentikan aturan tanpa menghapusnya: `berlaku_sampai` kemarin membuat job
 * generate berhenti menerbitkan sesi baru, sementara sesi yang sudah ada —
 * beserta bookingnya — tetap utuh. Menghapus barisnya akan memutus
 * `sessions.schedule_rule_id`.
 */
/**
 * Kebalikan `hentikanAturan()`. Tanpa ini, menekan "Hentikan" sekali adalah
 * jalan satu arah: satu-satunya cara mengembalikannya Reset Demo, yang
 * membuang seluruh data lain sekalian. Menjalankan lagi tidak mengembalikan
 * sesi yang terlanjur dibersihkan — itu dikerjakan penerbitan berikutnya.
 */
export async function jalankanAturan(sql: Sql, id: string) {
  await sql`update schedule_rules set berlaku_sampai = null where id = ${id}`;
}

export async function hentikanAturan(sql: Sql, id: string) {
  await sql`
    update schedule_rules
       set berlaku_sampai = (now() at time zone 'Asia/Jakarta')::date - 1
     where id = ${id}`;
}

/* ── Penerbitan sesi dari aturan — BR-7.1 ────────────────────────────────── */

/**
 * Jangka terbit: berapa minggu ke depan sesi dibangkitkan dari aturan.
 *
 * Batas atasnya bukan hiasan. Satu studio dengan 12 slot mingguan menerbitkan
 * ~12 sesi per minggu; 26 minggu berarti ~312 baris sekali tekan, dan tiap
 * baris itu kursi yang bisa dibooking orang. Menerbitkan setahun ke depan
 * berarti menjanjikan jadwal yang belum tentu ada coach-nya.
 */
export const BATAS_TERBIT = [1, 26] as const;

export type StatusTerbit = {
  /** Sesi dari aturan yang masih akan datang. Sesi manual tidak dihitung. */
  mendatang: number;
  /** Sesi terjauh yang sudah terbit, atau null kalau belum ada. */
  sampai: Date | null;
  minggu: number;
  /**
   * Slot mingguan yang masih berjalan. Nol berarti "Terbitkan sekarang" tidak
   * akan menghasilkan apa pun — bukan karena jadwalnya sudah lengkap, tapi
   * karena tidak ada polanya. Dua sebab itu harus dibedakan di layar.
   */
  aturan_aktif: number;
};

export async function statusTerbit(
  sql: Sql,
  sekarang: Date,
): Promise<StatusTerbit> {
  const [r] = await sql<
    {
      mendatang: number;
      sampai: string | null;
      minggu: number;
      aturan_aktif: number;
    }[]
  >`
    select count(s.id)::int as mendatang,
           max(s.mulai_at) as sampai,
           max(st.generate_weeks_ahead)::int as minggu,
           (select count(*)::int from schedule_rules r
             where r.studio_id = st.id and r.berlaku_sampai is null)
             as aturan_aktif
      from studios st
      left join sessions s
        on s.studio_id = st.id
       and s.schedule_rule_id is not null
       and s.status = 'scheduled'
       and s.mulai_at > ${ts(sekarang)}::timestamptz
     group by st.id`;
  return { ...r, sampai: r.sampai ? saat(r.sampai) : null };
}

/**
 * Menurunkan jangka terbit TIDAK menghapus sesi yang terlanjur terbit di luar
 * jangka baru — sebagian mungkin sudah ada pesertanya, dan menghapusnya
 * membatalkan booking orang tanpa lewat Alur 5. Yang berubah cuma sampai mana
 * penerbitan berikutnya berjalan.
 */
export async function simpanJangkaTerbit(
  sql: Sql,
  studio_id: string,
  minggu: number,
) {
  await sql`
    update studios set generate_weeks_ahead = ${minggu} where id = ${studio_id}`;
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

/* ── Pesan terkirim — UC-A03, UC-S06 ────────────────────────────────────── */

export type Pesan = {
  id: string;
  nama: string;
  telepon: string;
  template: string;
  isi: string;
  created_at: Date;
  mulai_at: Date | null;
};

/**
 * Jejak notifikasi, terbaru di atas.
 *
 * Tabel `notifications` sudah ditulis dari empat tempat sejak awal — booking,
 * pembatalan, promosi antrean, penutupan antrean — dan sampai sekarang tidak
 * pernah dibaca satu layar pun. Di demo kanalnya `layar`, jadi panel inilah
 * satu-satunya tempat pesan itu benar-benar sampai ke manusia.
 *
 * BR-4.3 dan BR-5.3 — dua template mendesak (`waitlist_naik`, `kelas_batal`)
 * dapat tombol kirim-WA, karena kursi terbuang kalau tidak terbaca dalam
 * hitungan jam.
 */
export async function pesanTerkirim(sql: Sql, batas = 60): Promise<Pesan[]> {
  const baris = await sql<Pesan[]>`
    select n.id, n.template, n.isi, n.terkirim_at as created_at,
           u.nama, u.telepon,
           s.mulai_at
      from notifications n
      join users u on u.id = n.user_id
      left join sessions s on s.id = n.session_id
     order by n.terkirim_at desc nulls last, n.id desc
     limit ${batas}`;
  return baris.map((b) => ({
    ...b,
    created_at: saat(b.created_at),
    mulai_at: b.mulai_at ? saat(b.mulai_at) : null,
  }));
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
