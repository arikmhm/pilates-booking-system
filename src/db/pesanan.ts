// Siklus hidup satu kursi: dipesan, dibatalkan, dan antrean yang menyusul.
//
// Sebelumnya isi berkas ini tersebar di dua server action — `booking()` di
// layar member dan `batalBooking()` di layar akun. Begitu admin harus bisa
// melakukan hal yang sama atas nama member (UC-A05, UC-A06), menyalinnya jadi
// dua pasang berarti dua tempat yang harus ingat memotong kredit, dua tempat
// yang harus ingat menaikkan antrean, dan dua tempat yang bisa lupa.
//
// Antarmukanya sengaja sempit: siapa, kursi mana, atas nama siapa. Yang
// mengembang ada di dalam — jendela booking, pemilihan paket, balapan alat
// terakhir, potongan kredit, promosi antrean, notifikasi.
//
// Fungsi di sini **tidak** melakukan redirect dan tidak tahu soal URL. Ia
// mengembalikan hasil; server action yang menerjemahkannya jadi kalimat.
// Itu yang membuat jalur member dan jalur admin benar-benar berbagi kode,
// bukan cuma mirip.

import type postgres from "postgres";
import {
  ALAT_BENTROK,
  SUDAH_TERDAFTAR,
  antreanSesi,
  bookingAktif,
  bookingById,
  paketMember,
  pesanKursi,
  sesiById,
  setelanStudio,
} from "./booking";
import {
  bolehBooking,
  hasilPembatalan,
  naikkanWaitlist,
  type Antre,
} from "@/rules";

export type HasilPesan =
  | { ok: true; nomor_alat: number }
  | { ok: false; pesan: string };

export type HasilBatal =
  | { ok: true; kredit_kembali: boolean; naik: boolean }
  | { ok: false; pesan: string };

/** Berapa kali mencoba alat berikutnya saat kalah balapan. */
const MAKS_COBA = 12;

/**
 * Pesan satu kursi untuk `user_id`.
 *
 * `sumber` membedakan siapa yang menekan tombolnya — `member` dari layar
 * jadwal, `admin` dari meja depan (BR-9.2), `waitlist` dari promosi otomatis.
 * Kolom itu yang nanti menjawab "kenapa saya terdaftar di kelas ini?".
 *
 * Aturan booking-nya identik untuk semua: admin TIDAK menembus jendela
 * booking, tidak menembus kapasitas, dan tidak membuat kredit dari udara.
 * Kalau studio mau mengampuni sesuatu, jalannya koreksi kredit BR-1.8 yang
 * wajib beralasan — bukan pintu belakang diam-diam di sini.
 */
export async function bookingkan(
  sql: postgres.Sql,
  args: {
    session_id: string;
    user_id: string;
    sumber: "member" | "admin";
    /** Siapa yang menekan tombol; sama dengan user_id kalau member sendiri. */
    pelaku_id: string;
    sekarang: Date;
  },
): Promise<HasilPesan> {
  const { session_id, user_id, sumber, pelaku_id, sekarang } = args;

  const [setelan, paket, aktif, sesi] = await Promise.all([
    setelanStudio(sql),
    paketMember(sql, user_id),
    bookingAktif(sql, user_id),
    sesiById(sql, session_id),
  ]);
  if (!sesi) return { ok: false, pesan: "Kelas tidak ditemukan." };

  const putusan = bolehBooking({
    sesi,
    setelan,
    paket,
    booking_aktif: aktif,
    sekarang,
  });
  if (!putusan.boleh) return { ok: false, pesan: putusan.pesan };

  // Balapan alat terakhir: unique index menolak yang kalah, dia mencoba alat
  // berikutnya. Bukan gagal — hanya kalah cepat.
  for (let coba = 0; coba < MAKS_COBA; coba++) {
    try {
      const kursi = await sql.begin(async (tx) => {
        const k = await pesanKursi(tx, {
          session_id,
          user_id,
          member_package_id: putusan.paket.id,
          sumber,
        });
        if (!k) return null; // kelas penuh

        // BR-2.2 — kredit dipotong saat booking, bukan saat hadir. Satu
        // transaksi dengan INSERT kursi: kursi tanpa potongan kredit adalah
        // kursi gratis.
        await tx`
          insert into credit_ledger (member_package_id, booking_id, delta, alasan, pelaku_id)
          values (${putusan.paket.id}, ${k.id}, -1, 'booking', ${pelaku_id})`;

        await tx`
          insert into notifications (user_id, kanal, template, isi, session_id)
          values (${user_id}, 'layar', 'booking_ok',
                  ${`Booking terkonfirmasi. Alat nomor ${k.nomor_alat}. 1 kredit dipotong.`},
                  ${session_id})`;
        return k;
      });

      return kursi
        ? { ok: true, nomor_alat: kursi.nomor_alat }
        : { ok: false, pesan: "Kelas ini baru saja penuh." };
    } catch (e) {
      const galat = e as { code?: string; constraint_name?: string };
      if (galat.code !== "23505") throw e;
      // Dua constraint, dua arti yang berlawanan — membedakannya wajib,
      // kalau tidak yang satu diulang selamanya.
      if (galat.constraint_name === SUDAH_TERDAFTAR)
        return { ok: false, pesan: "Sudah terdaftar di kelas ini." };
      if (galat.constraint_name !== ALAT_BENTROK) throw e;
    }
  }
  return { ok: false, pesan: "Kelas sedang ramai diperebutkan. Coba sekali lagi." };
}

/**
 * Alur 3 — batalkan satu kursi, lalu Alur 4 seketika.
 *
 * BR-3.3: "Kursi dilepas seketika di kedua kasus; waitlist langsung diproses."
 * Membatalkan tanpa memproses antrean bukan fitur setengah jadi, tapi salah:
 * kursinya kosong padahal ada yang menunggu — persis uang yang mau
 * diselamatkan sistem ini.
 *
 * `user_id` diisi kalau yang membatalkan si pemilik kursi (jadi kepemilikan
 * ikut diperiksa query), dan dibiarkan kosong kalau admin yang membatalkan
 * atas nama orang. Keputusan kreditnya sama persis — BR-3.2 tetap berlaku,
 * batal telat tetap hangus, siapa pun yang menekan tombolnya.
 */
export async function batalkan(
  sql: postgres.Sql,
  args: {
    booking_id: string;
    user_id?: string;
    pelaku_id: string;
    sekarang: Date;
  },
): Promise<HasilBatal> {
  const { booking_id, user_id, pelaku_id, sekarang } = args;

  const booking = await bookingById(sql, booking_id, user_id);
  if (!booking)
    return { ok: false, pesan: "Booking tidak ditemukan atau sudah dibatalkan." };

  const [sesi, setelan] = await Promise.all([
    sesiById(sql, booking.session_id),
    setelanStudio(sql),
  ]);
  if (!sesi) return { ok: false, pesan: "Kelas tidak ditemukan." };

  const putusan = hasilPembatalan({ booking, sesi, setelan, sekarang });
  if (!putusan.boleh) return { ok: false, pesan: putusan.pesan };

  await sql.begin(async (tx) => {
    await tx`
      update bookings
         set status = 'cancelled', dibatalkan_at = now()
       where id = ${booking_id} and status = 'confirmed'`;

    if (putusan.kredit_kembali) {
      // BR-3.1 — kembali ke paket ASAL, hangus_at tidak berubah.
      await tx`
        insert into credit_ledger (member_package_id, booking_id, delta, alasan, pelaku_id)
        values (${putusan.ke_paket}, ${booking_id}, ${putusan.delta},
                ${putusan.alasan}, ${pelaku_id})`;
    }
    // BR-3.2 — batal telat sengaja TIDAK menulis baris ledger apa pun.
  });

  const naik = await prosesWaitlist(sql, booking.session_id, sekarang);

  return { ok: true, kredit_kembali: putusan.kredit_kembali, naik: Boolean(naik) };
}

/**
 * Alur 4 — naikkan satu orang dari antrean.
 *
 * Keputusan siapa yang naik diambil `naikkanWaitlist()` di src/rules/;
 * fungsi ini hanya memuat data dan menuliskan hasilnya.
 */
export async function prosesWaitlist(
  sql: postgres.Sql,
  session_id: string,
  sekarang: Date,
) {
  const [sesi, setelan, antrean] = await Promise.all([
    sesiById(sql, session_id),
    setelanStudio(sql),
    antreanSesi(sql, session_id),
  ]);
  if (!sesi || antrean.length === 0) return null;

  // Maks `waitlist_max` orang (5), jadi ini paling banyak 5 query kecil.
  // ponytail: N+1 dibatasi aturan bisnis, bukan kebetulan — satu query
  // gabungan kalau batasnya pernah dinaikkan.
  const calon: Antre[] = await Promise.all(
    antrean.map(async (a) => ({
      id: a.id,
      user_id: a.user_id,
      paket: await paketMember(sql, a.user_id),
    })),
  );

  const hasil = naikkanWaitlist({ antrean: calon, sesi, setelan, sekarang });

  return sql.begin(async (tx) => {
    // BR-4.4 — kredit tidak valid: ditandai expired, antrean lanjut.
    if (hasil.dilewati.length) {
      await tx`
        update waitlist_entries set status = 'expired'
         where id = any(${hasil.dilewati})`;
    }
    if (!hasil.naik) return null;

    const kursi = await pesanKursi(tx, {
      session_id,
      user_id: hasil.naik.user_id,
      member_package_id: hasil.naik.paket_id,
      sumber: "waitlist",
      // Titik rawan 6 — tanpa ini BR-3.5 tidak bisa dihitung dan orang yang
      // baru naik 3 jam sebelum kelas ikut kena aturan hangus.
      dipromosikan_at: hasil.naik.dipromosikan_at,
    });
    if (!kursi) return null; // kursi keburu terisi lagi

    await tx`
      insert into credit_ledger (member_package_id, booking_id, delta, alasan)
      values (${hasil.naik.paket_id}, ${kursi.id}, -1, 'booking')`;

    await tx`
      update waitlist_entries set status = 'promoted'
       where id = ${hasil.naik.entry_id}`;

    await tx`
      insert into notifications (user_id, kanal, template, isi, session_id)
      values (${hasil.naik.user_id}, 'layar', 'waitlist_naik',
              ${`Kamu dapat kursi! Alat nomor ${kursi.nomor_alat}. 1 kredit dipotong.`},
              ${session_id})`;

    return kursi;
  });
}

/** BR-4.7 — keluar dari antrean atas kemauan sendiri. Kredit tak pernah dipotong. */
export async function keluarAntrean(
  sql: postgres.Sql,
  args: { entry_id: string; user_id: string },
) {
  const baris = await sql<{ id: string }[]>`
    update waitlist_entries set status = 'left'
     where id = ${args.entry_id}
       and user_id = ${args.user_id}
       and status = 'waiting'
    returning id`;
  return baris.length > 0;
}
