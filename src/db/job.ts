// Empat job terjadwal — 04-flows.md bagian 7, 05-data-model.md bagian 6.
//
// Isinya fungsi biasa yang menerima klien database sebagai argumen, persis
// seperti booking.ts. Endpoint HTTP di `src/app/api/cron/` cuma pembungkus
// tipis: penjaga secret, panggil, kembalikan hitungannya. Pemisahan itu yang
// membuat keempatnya bisa diuji tanpa server (`job.test.ts`).
//
// Syarat yang mengikat keempatnya: **idempoten**. Cron bisa dijalankan ulang,
// bisa telat, bisa tumpang tindih dengan dirinya sendiri saat satu jalannya
// kelamaan. Tiga job menjamin itu lewat filter status — baris yang sudah
// diproses tidak lagi cocok. Yang keempat (hanguskan kredit) tidak bisa,
// karena menulis baris baru; ia dijaga partial unique index di schema.ts.

import {
  hasilPenghangusan,
  type HasilPenghangusan,
  type PaketUntukHangus,
} from "@/rules";
import { saat, ts, type Sql } from "./booking";
import { hariPendekWib, jamWib } from "@/lib/waktu";

/* ── 1. Generate sesi — harian · BR-7.1 · Alur 7.3 ───────────────────────── */

/**
 * Buat sesi nyata dari `schedule_rules` sampai `generate_weeks_ahead` minggu
 * ke depan. Satu pernyataan, tanpa loop: jumlah barisnya kecil tapi
 * perbandingan "sudah ada atau belum" harus atomik, dan itu yang dikerjakan
 * `on conflict` terhadap index `sessions_rule_mulai_key`.
 *
 * `jam_mulai` disimpan sebagai `time` — jam dinding WIB, bukan timestamp.
 * `(tanggal + jam) at time zone 'Asia/Jakarta'` yang mengubahnya jadi
 * timestamptz UTC yang benar (BR-7.5). Menghitungnya di JavaScript berarti
 * menebak offset sendiri.
 *
 * Kapasitas dan durasi DISALIN dari aturan atau jenis kelas, tidak di-join
 * (BR-7.3): setelan jenis kelas boleh berubah tanpa mengusik sesi yang sudah
 * terisi. Keduanya `null` di aturan berarti "pakai bawaan jenis kelas".
 */
export async function generateSesi(sql: Sql, sekarang: Date) {
  const baris = await sql<{ id: string }[]>`
    insert into sessions
      (studio_id, schedule_rule_id, class_type_id, coach_id,
       mulai_at, durasi_menit, kapasitas, status)
    select r.studio_id,
           r.id,
           r.class_type_id,
           r.coach_id,
           (tgl::date + r.jam_mulai) at time zone 'Asia/Jakarta',
           coalesce(r.durasi_menit, ct.durasi_menit),
           coalesce(r.kapasitas, ct.kapasitas_default),
           'scheduled'
      from studios s
      join schedule_rules r on r.studio_id = s.id
      join class_types ct on ct.id = r.class_type_id
      cross join lateral generate_series(
             (${ts(sekarang)}::timestamptz at time zone 'Asia/Jakarta')::date,
             (${ts(sekarang)}::timestamptz at time zone 'Asia/Jakarta')::date
               + (s.generate_weeks_ahead * 7),
             interval '1 day') as tgl
     where extract(isodow from tgl) = r.hari
       and tgl::date >= r.berlaku_dari
       and (r.berlaku_sampai is null or tgl::date <= r.berlaku_sampai)
       -- Jangan bangkitkan kelas yang jamnya sudah lewat hari ini.
       and (tgl::date + r.jam_mulai) at time zone 'Asia/Jakarta'
             > ${ts(sekarang)}::timestamptz
    on conflict (schedule_rule_id, mulai_at) where schedule_rule_id is not null
      do nothing
    returning id`;

  return { dibuat: baris.length };
}

/* ── 2. Hanguskan kredit — harian · BR-1.6 · Alur 7.2 ────────────────────── */

/**
 * Paket yang lewat `hangus_at` dengan sisa > 0 → satu baris ledger `-sisa`.
 *
 * Keputusannya diambil `hasilPenghangusan()` di src/rules/ (titik rawan 7),
 * bukan di SQL. Barisnya sedikit — paket yang hangus dalam sehari — jadi
 * harganya nol, dan imbalannya: yang berjalan di produksi persis fungsi yang
 * diuji, bukan terjemahan SQL-nya yang mirip.
 *
 * BR-1.7 — tidak ada kolom saldo, jadi sisa kredit dijumlahkan dari ledger.
 */
export async function hanguskanKredit(sql: Sql, sekarang: Date) {
  const kandidat = await sql<
    {
      id: string;
      hangus_at: string | Date;
      sisa_kredit: number;
      sudah_dihanguskan: boolean;
    }[]
  >`
    select mp.id,
           mp.hangus_at,
           coalesce(sum(cl.delta), 0)::int as sisa_kredit,
           coalesce(bool_or(cl.alasan = 'hangus'), false) as sudah_dihanguskan
      from member_packages mp
      left join credit_ledger cl on cl.member_package_id = mp.id
     where mp.hangus_at <= ${ts(sekarang)}::timestamptz
     group by mp.id, mp.hangus_at`;

  const tulis = kandidat
    .map((p): PaketUntukHangus => ({ ...p, hangus_at: saat(p.hangus_at) }))
    .map((p) => hasilPenghangusan(p, sekarang))
    .filter((h): h is Extract<HasilPenghangusan, { tulis: true }> => h.tulis);

  if (tulis.length === 0) return { dihanguskan: 0, kredit: 0 };

  const baris: Record<string, unknown>[] = tulis.map((h) => ({
    member_package_id: h.ke_paket,
    delta: h.delta,
    alasan: h.alasan,
  }));

  // Kolom disebut eksplisit: sql(array) menyimpulkan daftar kolom dari objek
  // PERTAMA, dan kolom yang hilang tidak menimbulkan galat apa pun.
  const ditulis = await sql<{ id: string }[]>`
    insert into credit_ledger ${sql(baris, "member_package_id", "delta", "alasan")}
    on conflict (member_package_id) where alasan = 'hangus' do nothing
    returning id`;

  return {
    dihanguskan: ditulis.length,
    kredit: tulis.reduce((t, h) => t + Math.abs(h.delta), 0),
  };
}

/* ── 3. No-show otomatis — tiap jam · BR-6.2 · Alur 7.1 ──────────────────── */

/**
 * Booking `confirmed` yang kelasnya selesai lebih dari `noshow_after_hours`
 * lalu → `no_show`.
 *
 * BR-6.3 — TIDAK ada baris ledger baru. Kreditnya sudah terpotong saat
 * booking dan memang tidak dikembalikan; menulis ledger di sini akan
 * menghitungnya dua kali.
 *
 * Idempoten tanpa penjaga tambahan: `status = 'confirmed'` berhenti cocok
 * begitu barisnya diubah.
 */
export async function tandaiNoShow(sql: Sql, sekarang: Date) {
  const baris = await sql<{ id: string }[]>`
    update bookings b
       set status = 'no_show'
      from sessions s
      join studios st on st.id = s.studio_id
     where s.id = b.session_id
       and b.status = 'confirmed'
       and s.status = 'scheduled'
       and s.mulai_at
             + make_interval(mins => s.durasi_menit)
             + make_interval(hours => st.noshow_after_hours)
           <= ${ts(sekarang)}::timestamptz
    returning b.id`;

  return { ditandai: baris.length };
}

/* ── 4. Tutup waitlist — tiap jam · BR-4.6 · Alur 7.4 ────────────────────── */

/**
 * Antrean yang sesinya sudah lewat batas tutup booking → `expired`, dan
 * orangnya diberi tahu.
 *
 * Pesannya disusun di JavaScript, bukan `to_char`: nama hari dan bulan
 * Bahasa Indonesia datang dari `Intl` di `src/lib/waktu.ts`, satu-satunya
 * tempat zona waktu dan pelokalan disebut (BR-7.5).
 *
 * BR-4.5 — kredit tidak pernah terpotong selama mengantre, jadi tidak ada
 * yang perlu dikembalikan di sini.
 */
export async function tutupWaitlist(sql: Sql, sekarang: Date) {
  const kena = await sql<
    { user_id: string; session_id: string; mulai_at: string | Date; kelas: string }[]
  >`
    update waitlist_entries w
       set status = 'expired'
      from sessions s
      join studios st on st.id = s.studio_id
      join class_types ct on ct.id = s.class_type_id
     where s.id = w.session_id
       and w.status = 'waiting'
       and s.mulai_at - make_interval(hours => st.booking_closes_hours)
           <= ${ts(sekarang)}::timestamptz
    returning w.user_id, w.session_id, s.mulai_at, ct.nama as kelas`;

  if (kena.length === 0) return { ditutup: 0 };

  const pesan: Record<string, unknown>[] = kena.map((k) => {
    const mulai = saat(k.mulai_at);
    return {
      user_id: k.user_id,
      kanal: "layar",
      template: "waitlist_tutup",
      isi:
        `Kelas ${k.kelas} ${hariPendekWib(mulai)} ${jamWib(mulai)} sudah ditutup. ` +
        "Kamu tidak mendapat kursi. Kredit kamu tidak terpotong.",
      session_id: k.session_id,
    };
  });

  await sql`
    insert into notifications ${sql(
      pesan,
      "user_id",
      "kanal",
      "template",
      "isi",
      "session_id",
    )}`;

  return { ditutup: kena.length };
}
