// Query buku transaksi — UC-M14, UC-A17, UC-O09, UC-C03.
//
// Demo belum punya `payments` (BR-8.1-8.2 bertanda R), jadi "transaksi" di sini
// = pembelian paket (`member_packages` + harga `packages`) dan tiap gerak
// kredit (`credit_ledger`). BR-1.7: semua angka dari buku besar, tanpa kolom
// saldo. BR-9.3: yang mengembalikan rupiah dipisah (`ringkasUang`) supaya layar
// admin dan coach tidak bisa membocorkannya karena kelupaan satu kolom.

import { saat, ts, type Sql } from "./booking";

/* ── Transaksi seorang member — UC-M14 ───────────────────────────────────── */

export type Pembelian = {
  id: string;
  dibeli_at: Date;
  hangus_at: Date;
  diperpanjang_at: Date | null;
  paket: string;
  harga_rupiah: number;
  kredit_awal: number;
  sisa: number;
  dipakai: number;
  kembali: number;
  hangus: number;
};

/** Riwayat pembelian satu member + nasib tiap kreditnya. Empat angka terakhir
 *  dipecah dari buku besar, bukan disimpan — sengketa tagihan bisa ditunjukkan
 *  baris per baris. */
export async function pembelianMember(
  sql: Sql,
  user_id: string,
): Promise<Pembelian[]> {
  const baris = await sql<Pembelian[]>`
    select mp.id,
           mp.dibeli_at,
           mp.hangus_at,
           mp.diperpanjang_at,
           p.nama as paket,
           p.harga_rupiah,
           mp.jumlah_kredit_awal as kredit_awal,
           coalesce(sum(cl.delta), 0)::int as sisa,
           coalesce(-sum(cl.delta) filter (where cl.alasan = 'booking'), 0)::int
             as dipakai,
           coalesce(sum(cl.delta) filter (
             where cl.delta > 0 and cl.alasan <> 'beli'), 0)::int as kembali,
           coalesce(-sum(cl.delta) filter (
             where cl.alasan in ('hangus', 'batal_telat', 'no_show')), 0)::int
             as hangus
      from member_packages mp
      join packages p on p.id = mp.package_id
      left join credit_ledger cl on cl.member_package_id = mp.id
     where mp.user_id = ${user_id}
     group by mp.id, p.nama, p.harga_rupiah
     order by mp.dibeli_at desc`;

  return baris.map((b) => ({
    ...b,
    dibeli_at: saat(b.dibeli_at),
    hangus_at: saat(b.hangus_at),
    diperpanjang_at: b.diperpanjang_at ? saat(b.diperpanjang_at) : null,
  }));
}

/* ── Buku transaksi studio — UC-A17 ──────────────────────────────────────── */

export type BarisTransaksi = Pembelian & { member: string; member_id: string };

/** Satu halaman buku transaksi + jumlah seluruh barisnya. `count(*) over ()`
 *  ikut di query yang sama: dua query terpisah bisa membaca dua keadaan. */
export async function bukuTransaksi(
  sql: Sql,
  args: { sejak: Date; per: number; lewati: number },
): Promise<{ baris: BarisTransaksi[]; total: number }> {
  const baris = await sql<(BarisTransaksi & { total: string })[]>`
    select mp.id,
           mp.dibeli_at,
           mp.hangus_at,
           mp.diperpanjang_at,
           u.id   as member_id,
           u.nama as member,
           p.nama as paket,
           p.harga_rupiah,
           mp.jumlah_kredit_awal as kredit_awal,
           coalesce(sum(cl.delta), 0)::int as sisa,
           coalesce(-sum(cl.delta) filter (where cl.alasan = 'booking'), 0)::int
             as dipakai,
           coalesce(sum(cl.delta) filter (
             where cl.delta > 0 and cl.alasan <> 'beli'), 0)::int as kembali,
           coalesce(-sum(cl.delta) filter (
             where cl.alasan in ('hangus', 'batal_telat', 'no_show')), 0)::int
             as hangus,
           count(*) over ()::int as total
      from member_packages mp
      join users u on u.id = mp.user_id
      join packages p on p.id = mp.package_id
      left join credit_ledger cl on cl.member_package_id = mp.id
     where mp.dibeli_at >= ${ts(args.sejak)}::timestamptz
     group by mp.id, u.id, u.nama, p.nama, p.harga_rupiah
     order by mp.dibeli_at desc, mp.id
     limit ${args.per} offset ${args.lewati}`;

  return {
    total: baris.length ? Number(baris[0].total) : 0,
    baris: baris.map(({ total: _, ...b }) => ({
      ...b,
      dibeli_at: saat(b.dibeli_at),
      hangus_at: saat(b.hangus_at),
      diperpanjang_at: b.diperpanjang_at ? saat(b.diperpanjang_at) : null,
    })),
  };
}

/* ── Satu transaksi — layar detail ───────────────────────────────────────── */

export type DetailTransaksi = BarisTransaksi & {
  telepon: string;
  masa_berlaku_hari: number;
  jumlah_kredit_paket: number;
  /** Jenis kelas yang boleh diikuti kreditnya — BR-1.4. Bagian dari barangnya. */
  kelas: string[];
};

/** `user_id` diisi kalau yang membuka pemiliknya sendiri, jadi kepemilikan
 *  diperiksa di dalam query. Pola sama dengan `bookingById()`. */
export async function transaksiById(
  sql: Sql,
  id: string,
  user_id?: string,
): Promise<DetailTransaksi | null> {
  const [baris] = await sql<
    (Omit<DetailTransaksi, "kelas"> & { kelas: string[] | null })[]
  >`
    select mp.id,
           mp.dibeli_at,
           mp.hangus_at,
           mp.diperpanjang_at,
           u.id   as member_id,
           u.nama as member,
           u.telepon,
           p.nama as paket,
           p.harga_rupiah,
           p.masa_berlaku_hari,
           p.jumlah_kredit as jumlah_kredit_paket,
           (select array_agg(ct.nama order by ct.nama)
              from package_class_types pct
              join class_types ct on ct.id = pct.class_type_id
             where pct.package_id = p.id) as kelas,
           mp.jumlah_kredit_awal as kredit_awal,
           coalesce(sum(cl.delta), 0)::int as sisa,
           coalesce(-sum(cl.delta) filter (where cl.alasan = 'booking'), 0)::int
             as dipakai,
           coalesce(sum(cl.delta) filter (
             where cl.delta > 0 and cl.alasan <> 'beli'), 0)::int as kembali,
           coalesce(-sum(cl.delta) filter (
             where cl.alasan in ('hangus', 'batal_telat', 'no_show')), 0)::int
             as hangus
      from member_packages mp
      join users u on u.id = mp.user_id
      join packages p on p.id = mp.package_id
      left join credit_ledger cl on cl.member_package_id = mp.id
     where mp.id = ${id}
       and (${user_id ?? null}::uuid is null or mp.user_id = ${user_id ?? null}::uuid)
     -- p.id ikut dikelompokkan, bukan kolom-kolomnya satu per satu: subquery
     -- jenis kelas menyebut p.id, dan Postgres hanya menganggap kolom lain
     -- bergantung fungsional setelah kunci primernya ada di GROUP BY.
     group by mp.id, u.id, u.nama, u.telepon, p.id`;

  if (!baris) return null;
  return {
    ...baris,
    kelas: baris.kelas ?? [],
    dibeli_at: saat(baris.dibeli_at),
    hangus_at: saat(baris.hangus_at),
    diperpanjang_at: baris.diperpanjang_at ? saat(baris.diperpanjang_at) : null,
  };
}

/* ── Koreksi manual — UC-A17, jejak BR-1.8 ──────────────────────────────── */

export type Koreksi = {
  id: string;
  created_at: Date;
  delta: number;
  catatan: string | null;
  member: string;
  member_id: string;
  pelaku: string | null;
};

/** Kredit yang berpindah tanpa kelas: koreksi manual staf (BR-1.8) dan
 *  perpanjangan karena studio membatalkan (BR-5.2) — baris beginilah yang
 *  ditanyakan saat angka seorang member terasa aneh. */
export async function koreksiTerakhir(
  sql: Sql,
  batas = 20,
): Promise<Koreksi[]> {
  const baris = await sql<Koreksi[]>`
    select cl.id, cl.created_at, cl.delta, cl.catatan,
           u.id   as member_id,
           u.nama as member,
           pel.nama as pelaku
      from credit_ledger cl
      join member_packages mp on mp.id = cl.member_package_id
      join users u on u.id = mp.user_id
      left join users pel on pel.id = cl.pelaku_id
     where cl.alasan in ('koreksi', 'batal_studio')
     order by cl.created_at desc, cl.id desc
     limit ${batas}`;

  return baris.map((b) => ({ ...b, created_at: saat(b.created_at) }));
}

/* ── Angka uang — UC-O09, hanya dipanggil layar pemilik (BR-9.3) ─────────── */

export type RingkasUang = {
  omzet: number;
  jumlah: number;
  rata: number;
  hangus_rupiah: number;
  hangus_kredit: number;
};

export async function ringkasUang(
  sql: Sql,
  args: { sejak: Date },
): Promise<RingkasUang> {
  const sejak = ts(args.sejak);

  const [[jual], [mati]] = await Promise.all([
    sql<{ omzet: string; jumlah: number }[]>`
      select coalesce(sum(p.harga_rupiah), 0)::bigint as omzet,
             count(*)::int as jumlah
        from member_packages mp
        join packages p on p.id = mp.package_id
       where mp.dibeli_at >= ${sejak}::timestamptz`,

    // Kredit hangus dinilai per paket: harga dibagi jumlah kredit. Sama persis
    // dengan laporan pemilik di kelola.ts — dua layar, satu angka.
    sql<{ rupiah: string; kredit: number }[]>`
      select coalesce(sum(-cl.delta * p.harga_rupiah
                          / nullif(p.jumlah_kredit, 0)), 0)::bigint as rupiah,
             coalesce(sum(-cl.delta), 0)::int as kredit
        from credit_ledger cl
        join member_packages mp on mp.id = cl.member_package_id
        join packages p on p.id = mp.package_id
       where cl.alasan = 'hangus'
         and cl.created_at >= ${sejak}::timestamptz`,
  ]);

  const omzet = Number(jual.omzet);
  return {
    omzet,
    jumlah: jual.jumlah,
    rata: jual.jumlah ? Math.round(omzet / jual.jumlah) : 0,
    hangus_rupiah: Number(mati.rupiah),
    hangus_kredit: mati.kredit,
  };
}

/** Nilai kredit yang masih menggantung (*unearned revenue*) — uang yang sudah
 *  masuk kas tapi kelasnya belum diberikan; lihat docs/riset-dashboard-peran.md.
 *  Paket yang masa berlakunya lewat TIDAK ikut: sisanya sudah jadi pendapatan
 *  dan sudah dihitung sebagai kredit hangus di `ringkasUang()`. */
export async function kreditMenggantung(
  sql: Sql,
  args: { sekarang: Date },
): Promise<{ rupiah: number; kredit: number; paket: number }> {
  const [r] = await sql<{ rupiah: string; kredit: number; paket: number }[]>`
    select coalesce(sum(x.sisa * x.harga_rupiah
                        / nullif(x.jumlah_kredit, 0)), 0)::bigint as rupiah,
           coalesce(sum(x.sisa), 0)::int as kredit,
           count(*)::int as paket
      from (
        select coalesce(sum(cl.delta), 0)::int as sisa,
               p.harga_rupiah, p.jumlah_kredit
          from member_packages mp
          join packages p on p.id = mp.package_id
          left join credit_ledger cl on cl.member_package_id = mp.id
         where mp.hangus_at > ${ts(args.sekarang)}::timestamptz
         group by mp.id, p.harga_rupiah, p.jumlah_kredit
        having coalesce(sum(cl.delta), 0) > 0
      ) x`;
  return { rupiah: Number(r.rupiah), kredit: r.kredit, paket: r.paket };
}

/* ── Kredit yang terpakai di kelas seorang coach — UC-C03 ────────────────── */

export type KelasTerpakai = {
  id: string;
  mulai_at: Date;
  kelas: string;
  kapasitas: number;
  kursi: number;
  kredit: number;
};

/** Coach tidak punya transaksi sendiri; yang ditampilkan kredit dan kursi dari
 *  kelas yang ia ajar, tanpa satu pun angka rupiah (BR-9.3, BR-9.4). */
export async function kelasTerpakaiCoach(
  sql: Sql,
  args: { coach_id: string; sejak: Date; sampai: Date },
): Promise<KelasTerpakai[]> {
  const baris = await sql<KelasTerpakai[]>`
    select s.id, s.mulai_at, s.kapasitas,
           ct.nama as kelas,
           count(distinct b.id) filter (
             where b.status in ('confirmed', 'attended', 'no_show'))::int as kursi,
           -- Netto, bukan hanya baris 'booking': kursi yang dibatalkan tepat
           -- waktu menulis −1 lalu +1, dan menghitung yang −1 saja membuat
           -- kelas berkursi nol tetap tampak memakan kredit. Batal telat dan
           -- no-show memang tidak menulis baris balasan (BR-3.2, BR-6.2), jadi
           -- kreditnya tetap terhitung terpakai — dan itu benar.
           coalesce(-sum(cl.delta), 0)::int as kredit
      from sessions s
      join class_types ct on ct.id = s.class_type_id
      left join bookings b on b.session_id = s.id
      left join credit_ledger cl on cl.booking_id = b.id
     where s.coach_id = ${args.coach_id}
       and s.mulai_at >= ${ts(args.sejak)}::timestamptz
       and s.mulai_at <  ${ts(args.sampai)}::timestamptz
     group by s.id, ct.nama
     order by s.mulai_at desc`;

  return baris.map((b) => ({ ...b, mulai_at: saat(b.mulai_at) }));
}
