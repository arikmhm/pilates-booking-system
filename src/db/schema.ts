// Skema Drizzle — 12 tabel inti. Sumber: docs/05-data-model.md.
//
// Tiga invarian yang dijaga di berkas ini, bukan di kode aplikasi:
//   BR-2.3 — kapasitas keras: partial unique index (session_id, nomor_alat)
//   BR-2.4 — satu member satu kursi per sesi
//   BR-1.7 — tidak ada kolom saldo; sisa kredit = SUM(credit_ledger.delta)
//
// Nama properti TS sengaja sama persis dengan nama kolom database, supaya
// dokumen, SQL mentah, dan kode memakai satu kosakata.

import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid().primaryKey().defaultRandom();
const saat = () => timestamp({ withTimezone: true }); // BR-7.5 — selalu UTC

/* ── 1. studios ─ identitas + semua setelan sebagai kolom biasa ───────────── */
// 02-rules.md bagian 3. Setelan jadi kolom, bukan tabel key-value: jumlahnya
// tetap, tipenya jelas, dan tidak perlu di-cast tiap dibaca.
export const studios = pgTable("studios", {
  id: id(),
  nama: text().notNull(),
  logo_url: text(),
  warna_utama: text(),
  cancel_window_hours: integer().notNull().default(12),
  booking_opens_days: integer().notNull().default(7),
  booking_closes_hours: integer().notNull().default(1),
  studio_cancel_extension_days: integer().notNull().default(7), // BR-5.2
  waitlist_max: integer().notNull().default(5),
  noshow_after_hours: integer().notNull().default(2), // BR-6.2
  generate_weeks_ahead: integer().notNull().default(8), // BR-7.1
});

/* ── 2. users ─ member, admin, owner, coach dalam satu tabel ─────────────── */
export const PERAN = ["member", "admin", "owner", "coach"] as const;

export const users = pgTable(
  "users",
  {
    id: id(),
    studio_id: uuid()
      .notNull()
      .references(() => studios.id),
    nama: text().notNull(),
    // Telepon wajib: studio menghubungi member lewat WA. Email opsional —
    // belum tentu tiap member punya (02-rules.md bagian 8, pertanyaan 6).
    telepon: text().notNull(),
    email: text(),
    peran: text({ enum: PERAN }).notNull().default("member"),
    foto_url: text(),
    created_at: saat().notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_studio_telepon_key").on(t.studio_id, t.telepon),
    // Magic link mencari user lewat email — 06-architecture.md bagian 5
    uniqueIndex("users_studio_email_key").on(t.studio_id, t.email),
  ],
);

/* ── 3. class_types ─ template kelas ─────────────────────────────────────── */
export const class_types = pgTable("class_types", {
  id: id(),
  studio_id: uuid()
    .notNull()
    .references(() => studios.id),
  nama: text().notNull(), // Reformer · Tower · Chair · Mat
  kapasitas_default: integer().notNull(), // BR-7.2
  durasi_menit: integer().notNull().default(60),
  warna: text(),
});

/* ── 4. schedule_rules ─ pola mingguan, BUKAN sesi nyata ─────────────────── */
export const LEVEL = ["beginner", "intermediate"] as const;

export const schedule_rules = pgTable(
  "schedule_rules",
  {
    id: id(),
    studio_id: uuid()
      .notNull()
      .references(() => studios.id),
    class_type_id: uuid()
      .notNull()
      .references(() => class_types.id),
    coach_id: uuid().references(() => users.id),
    hari: integer().notNull(), // 1=Senin … 7=Minggu
    jam_mulai: time().notNull(), // jam dinding WIB, bukan timestamp
    kapasitas: integer(), // null = pakai kapasitas_default
    // null = pakai durasi_menit jenis kelasnya. Sama polanya dengan kapasitas:
    // Sabtu boleh 45 menit walau Reformer biasanya 70, tanpa memaksa membuat
    // jenis kelas kembar hanya untuk membedakan durasinya.
    durasi_menit: integer(),
    level: text({ enum: LEVEL }),
    berlaku_dari: date().notNull(),
    berlaku_sampai: date(), // null = selamanya
  },
  (t) => [check("schedule_rules_hari_check", sql`${t.hari} between 1 and 7`)],
);

/* ── 5. sessions ─ instance nyata yang dibooking ─────────────────────────── */
export const SESSION_STATUS = ["scheduled", "cancelled"] as const;

export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    studio_id: uuid()
      .notNull()
      .references(() => studios.id),
    // null kalau sesi dibuat manual, bukan hasil generate
    schedule_rule_id: uuid().references(() => schedule_rules.id),
    class_type_id: uuid()
      .notNull()
      .references(() => class_types.id),
    coach_id: uuid().references(() => users.id),
    mulai_at: saat().notNull(),
    durasi_menit: integer().notNull(),
    // BR-7.3 — kapasitas DISALIN saat generate, tidak di-join ke class_types.
    // Kapasitas jenis kelas boleh berubah tanpa mengusik sesi yang sudah terisi.
    kapasitas: integer().notNull(),
    status: text({ enum: SESSION_STATUS }).notNull().default("scheduled"),
    alasan_batal: text(),
    dibatalkan_at: saat(),
  },
  (t) => [
    index("sessions_studio_mulai_idx").on(t.studio_id, t.mulai_at),
    // BR-7.1 — job generate sesi boleh dijalankan berkali-kali sehari.
    // NULL dianggap berbeda oleh Postgres, jadi sesi manual (tanpa aturan)
    // tidak pernah ikut terjaring; WHERE-nya ditulis eksplisit supaya niat
    // itu terbaca, bukan disimpulkan dari perilaku NULL.
    uniqueIndex("sessions_rule_mulai_key")
      .on(t.schedule_rule_id, t.mulai_at)
      .where(sql`schedule_rule_id is not null`),
  ],
);

/* ── 6. packages ─ katalog produk ────────────────────────────────────────── */
export const packages = pgTable("packages", {
  id: id(),
  studio_id: uuid()
    .notNull()
    .references(() => studios.id),
  nama: text().notNull(),
  jumlah_kredit: integer().notNull(),
  masa_berlaku_hari: integer().notNull(),
  harga_rupiah: integer().notNull(), // integer Rupiah, tanpa desimal
  aktif: boolean().notNull().default(true),
});

/* ── 7. package_class_types ─ BR-1.4 ─────────────────────────────────────── */
// Kredit Mat tidak bisa dipakai di Reformer. Tanpa tabel ini aturan itu
// tidak punya tempat tinggal.
export const package_class_types = pgTable(
  "package_class_types",
  {
    package_id: uuid()
      .notNull()
      .references(() => packages.id),
    class_type_id: uuid()
      .notNull()
      .references(() => class_types.id),
  },
  (t) => [primaryKey({ columns: [t.package_id, t.class_type_id] })],
);

/* ── 8. member_packages ─ paket yang sudah dibeli ────────────────────────── */
export const member_packages = pgTable(
  "member_packages",
  {
    id: id(),
    user_id: uuid()
      .notNull()
      .references(() => users.id),
    package_id: uuid()
      .notNull()
      .references(() => packages.id),
    dibeli_at: saat().notNull().defaultNow(),
    hangus_at: saat().notNull(), // dibeli_at + masa_berlaku_hari
    // Disalin dari packages: harga dan isi paket boleh berubah kapan saja
    // tanpa merusak riwayat pembelian lama.
    jumlah_kredit_awal: integer().notNull(),
    diperpanjang_at: saat(), // jejak BR-5.2
  },
  (t) => [
    check("member_packages_masa_check", sql`${t.hangus_at} > ${t.dibeli_at}`),
    index("member_packages_user_hangus_idx").on(t.user_id, t.hangus_at),
  ],
);

/* ── 9. bookings ─ kursi yang dipesan ────────────────────────────────────── */
export const BOOKING_STATUS = [
  "confirmed",
  "cancelled",
  "attended",
  "no_show",
] as const;
export const BOOKING_SUMBER = ["member", "admin", "waitlist"] as const;

export const bookings = pgTable(
  "bookings",
  {
    id: id(),
    session_id: uuid()
      .notNull()
      .references(() => sessions.id),
    user_id: uuid()
      .notNull()
      .references(() => users.id),
    // BR-3.1 — wajib diisi. Saat batal tepat waktu kredit kembali ke paket
    // ASALNYA dengan tanggal hangus asli, bukan jadi kredit baru.
    member_package_id: uuid()
      .notNull()
      .references(() => member_packages.id),
    nomor_alat: integer().notNull(), // 1..sessions.kapasitas
    status: text({ enum: BOOKING_STATUS }).notNull().default("confirmed"),
    sumber: text({ enum: BOOKING_SUMBER }).notNull().default("member"),
    dipromosikan_at: saat(), // null kalau bukan dari waitlist — BR-3.5
    created_at: saat().notNull().defaultNow(),
    dibatalkan_at: saat(),
  },
  (t) => [
    // ══ INVARIAN BR-2.3 ══ Dua orang menyerbu alat terakhir, satu pasti gagal.
    // Partial: baris cancelled tetap tersimpan sebagai riwayat dan tidak
    // menahan kursinya.
    uniqueIndex("bookings_sesi_alat_key")
      .on(t.session_id, t.nomor_alat)
      .where(sql`status = 'confirmed'`),
    // ══ INVARIAN BR-2.4 ══ satu member maksimal satu kursi per sesi
    uniqueIndex("bookings_sesi_user_key")
      .on(t.session_id, t.user_id)
      .where(sql`status = 'confirmed'`),
    check("bookings_nomor_alat_check", sql`${t.nomor_alat} >= 1`),
  ],
);

/* ── 10. credit_ledger ─ BR-1.7, satu-satunya sumber sisa kredit ─────────── */
// Tidak ada kolom saldo di mana pun. Sisa = SUM(delta). Sengketa kredit harus
// bisa dibuktikan baris per baris.
// `alasan` memakai Bahasa Indonesia karena tampil apa adanya di layar M3.
export const ALASAN = [
  "beli",
  "booking",
  "batal_tepat_waktu",
  "batal_telat",
  "no_show",
  "hangus",
  "koreksi",
  "batal_studio",
] as const;

export const credit_ledger = pgTable(
  "credit_ledger",
  {
    id: id(),
    member_package_id: uuid()
      .notNull()
      .references(() => member_packages.id),
    booking_id: uuid().references(() => bookings.id), // null untuk beli/hangus/koreksi
    delta: integer().notNull(), // +10 | -1 | +1
    alasan: text({ enum: ALASAN }).notNull(),
    pelaku_id: uuid().references(() => users.id),
    catatan: text(), // wajib diisi untuk alasan 'koreksi' — dijaga di src/rules/
    created_at: saat().notNull().defaultNow(),
  },
  (t) => [
    check("credit_ledger_delta_check", sql`${t.delta} <> 0`),
    index("credit_ledger_member_package_idx").on(t.member_package_id),
    // BR-1.6 — satu paket hanya boleh dihanguskan sekali. 04-flows.md 7.2
    // membuat job ini idempoten lewat "cek dulu baru tulis", dan pola itu
    // bocor persis seperti pada kapasitas: dua cron yang tumpang tindih
    // membaca "belum" bersamaan lalu menulis dua-duanya. Di sini yang
    // ditegakkan database, bukan urutan pembacaan.
    uniqueIndex("credit_ledger_hangus_key")
      .on(t.member_package_id)
      .where(sql`alasan = 'hangus'`),
  ],
);

/* ── 11. waitlist_entries ─ antrean sesi penuh ───────────────────────────── */
// Tidak ada kolom posisi. Urutan = ORDER BY created_at, yang tidak pernah
// perlu di-renumber saat ada yang keluar.
export const WAITLIST_STATUS = [
  "waiting",
  "promoted",
  "expired",
  "left",
] as const;

export const waitlist_entries = pgTable(
  "waitlist_entries",
  {
    id: id(),
    session_id: uuid()
      .notNull()
      .references(() => sessions.id),
    user_id: uuid()
      .notNull()
      .references(() => users.id),
    status: text({ enum: WAITLIST_STATUS }).notNull().default("waiting"),
    created_at: saat().notNull().defaultNow(), // urutan antrean
  },
  (t) => [
    // BR-4.1 — tidak bisa antre dua kali di sesi yang sama
    uniqueIndex("waitlist_sesi_user_key")
      .on(t.session_id, t.user_id)
      .where(sql`status = 'waiting'`),
  ],
);

/* ── 12. notifications ───────────────────────────────────────────────────── */
// Demo: kanal 'layar', tampil di panel "Pesan Terkirim".
// Real: jejak email + antrean tombol kirim-WA di admin.
export const KANAL = ["layar", "email", "wa_link"] as const;
export const TEMPLATE = [
  "booking_ok",
  "waitlist_naik",
  "kelas_batal",
  "kredit_mau_hangus",
  "waitlist_tutup",
] as const;

export const notifications = pgTable("notifications", {
  id: id(),
  user_id: uuid()
    .notNull()
    .references(() => users.id),
  kanal: text({ enum: KANAL }).notNull(),
  template: text({ enum: TEMPLATE }).notNull(),
  isi: text().notNull(), // teks final Bahasa Indonesia
  session_id: uuid().references(() => sessions.id),
  // Kanal 'layar' sampai ke penerimanya begitu barisnya ditulis, jadi
  // waktunya diisi di sini — bukan diingat di empat tempat yang menulisnya.
  // Saat email sungguhan dibangun, jalur itu harus mengirim NULL eksplisit:
  // 'terkirim' untuk email berarti SMTP sudah menerimanya, bukan barisnya ada.
  terkirim_at: saat().defaultNow(),
});
