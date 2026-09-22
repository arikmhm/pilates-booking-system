// Query buku transaksi — UC-M14, UC-A17, UC-O09, UC-C03.
//
// Tidak ada tabel baru. Demo belum punya `payments` (BR-8.1–8.2 bertanda R di
// 02-rules.md bagian 5), jadi yang disebut "transaksi" di sini adalah dua hal
// yang memang tercatat: **pembelian paket** (`member_packages` + harga dari
// `packages`) dan **tiap gerak kredit** (`credit_ledger`). Begitu `payments`
// dibangun, berkas ini yang menampungnya — layarnya tidak perlu berubah.
//
// BR-1.7 — semua angka kredit dijumlahkan dari buku besar. Tidak ada kolom
// saldo yang dibaca di mana pun.
//
// BR-9.3 — angka rupiah hanya dipanggil layar pemilik. Fungsi yang
// mengembalikan uang dipisah (`ringkasUang`) supaya layar admin dan coach
// tidak bisa membocorkannya karena kelupaan menghapus satu kolom.

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

/**
 * Riwayat pembelian satu member, lengkap dengan nasib tiap kreditnya.
 *
 * Empat angka terakhir dipecah dari buku besar, bukan disimpan: berapa yang
 * jadi kelas (`dipakai`), berapa yang kembali karena batal tepat waktu
 * (`kembali`), berapa yang mati karena masa berlaku lewat, batal telat, atau
 * no-show (`hangus`), dan sisanya. Member yang menyengketakan tagihan bisa
 * ditunjukkan baris per baris.
 */
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

/**
 * Satu halaman buku transaksi, plus jumlah seluruh barisnya.
 *
 * `count(*) over ()` ikut di query yang sama — dua query terpisah untuk baris
 * dan totalnya bisa membaca dua keadaan berbeda kalau ada pembelian masuk di
 * antaranya, dan halaman terakhir jadi kosong tanpa sebab yang kelihatan.
 */
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
};

/**
 * `user_id` diisi kalau yang membuka pemiliknya sendiri, sehingga kepemilikan
 * ikut diperiksa di dalam query — bukan di pemanggil yang bisa lupa. Pola yang
 * sama dengan `bookingById()` di booking.ts.
 */
export async function transaksiById(
  sql: Sql,
  id: string,
  user_id?: string,
): Promise<DetailTransaksi | null> {
  const [baris] = await sql<DetailTransaksi[]>`
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
     group by mp.id, u.id, u.nama, u.telepon, p.nama, p.harga_rupiah,
              p.masa_berlaku_hari, p.jumlah_kredit`;

  if (!baris) return null;
  return {
    ...baris,
    dibeli_at: saat(baris.dibeli_at),
    hangus_at: saat(baris.hangus_at),
    diperpanjang_at: baris.diperpanjang_at ? saat(baris.diperpanjang_at) : null,
  };
}

export type BarisBuku = {
  id: string;
  created_at: Date;
  delta: number;
  alasan: string;
  catatan: string | null;
  pelaku: string | null;
  kelas: string | null;
  mulai_at: Date | null;
};

/** BR-1.7 — isi transaksi adalah buku besarnya, baris per baris. */
export async function bukuPaket(sql: Sql, id: string): Promise<BarisBuku[]> {
  const baris = await sql<BarisBuku[]>`
    select cl.id, cl.created_at, cl.delta, cl.alasan, cl.catatan,
           pel.nama as pelaku,
           ct.nama  as kelas,
           s.mulai_at
      from credit_ledger cl
      left join users pel on pel.id = cl.pelaku_id
      left join bookings b on b.id = cl.booking_id
      left join sessions s on s.id = b.session_id
      left join class_types ct on ct.id = s.class_type_id
     where cl.member_package_id = ${id}
     order by cl.created_at, cl.id`;

  return baris.map((b) => ({
    ...b,
    created_at: saat(b.created_at),
    mulai_at: b.mulai_at ? saat(b.mulai_at) : null,
  }));
}

/* ── Koreksi manual — UC-A17, jejak BR-1.8 ───────────────────────────────── */

export type Koreksi = {
  id: string;
  created_at: Date;
  delta: number;
  catatan: string | null;
  member: string;
  member_id: string;
  pelaku: string | null;
};

/**
 * Kredit yang berpindah tanpa kelas: koreksi manual staf (BR-1.8) dan
 * perpanjangan karena studio membatalkan kelas (BR-5.2). Justru baris beginilah
 * yang ditanyakan saat angka seorang member terasa aneh — pembelian biasa tidak
 * pernah jadi sengketa.
 */
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

    // Kredit hangus dinilai per paketnya — harga dibagi jumlah kredit. Sama
    // persis dengan cara laporan pemilik menghitungnya (`kelola.ts`), supaya
    // dua layar tidak pernah menyebut dua angka untuk hal yang sama.
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

/**
 * Nilai kredit yang masih menggantung — *unearned revenue* dalam istilah
 * pembukuan studio, dan istilah itu yang dipakai dokumentasi Mindbody
 * (`Outstanding Series report`) serta Glofox (`Scheduled Revenue`).
 * Rujukannya `docs/riset-dashboard-peran.md`.
 *
 * Uang yang sudah masuk kas tapi kelasnya belum diberikan. Laporan pemilik
 * selama ini hanya menghitung kredit yang SUDAH hangus — yang menggantung
 * tidak pernah punya angka, padahal itu kewajiban studio yang masih hidup.
 *
 * Paket yang masa berlakunya sudah lewat TIDAK ikut: sisanya bukan kewajiban
 * lagi, ia sudah jadi pendapatan (dan sudah dihitung sebagai kredit hangus di
 * `ringkasUang()`). Penilaiannya sama — harga paket dibagi jumlah kreditnya.
 * Dua layar tidak boleh menyebut dua angka untuk hal yang sama.
 */
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

/**
 * Coach tidak punya transaksi sendiri — tapi tiap kelas yang ia ajar memakan
 * kredit yang sudah dibayar member, dan itu ukuran yang bisa ia pengaruhi.
 * Tanpa satu pun angka rupiah (BR-9.4 + BR-9.3): yang ditampilkan kredit dan
 * kursi, bukan omzet.
 */
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
