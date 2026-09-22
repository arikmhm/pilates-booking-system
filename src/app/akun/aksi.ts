"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { pg } from "@/db";
import {
  antreanSesi,
  bookingById,
  paketMember,
  pesanKursi,
  sesiById,
  setelanStudio,
} from "@/db/booking";
import { hasilPembatalan, naikkanWaitlist, type Antre } from "@/rules";
import { userSaatIni } from "@/lib/masuk";

function kembali(pesan: string): never {
  redirect(`/akun?kabar=${encodeURIComponent(pesan)}`);
}

/**
 * Alur 3 — pembatalan oleh member, lalu Alur 4 seketika.
 *
 * BR-3.3: "Kursi dilepas seketika di kedua kasus; waitlist langsung diproses."
 * Membatalkan tanpa memproses waitlist bukan fitur setengah jadi, tapi salah:
 * kursinya kosong padahal ada yang mengantre — persis uang yang mau
 * diselamatkan sistem ini.
 */
export async function batalBooking(formData: FormData) {
  const user_id = await userSaatIni();
  if (!user_id) redirect("/masuk");

  const booking_id = String(formData.get("booking_id"));
  const sekarang = new Date();

  const booking = await bookingById(pg, booking_id, user_id);
  if (!booking) kembali("Booking tidak ditemukan atau sudah dibatalkan.");

  const [sesi, setelan] = await Promise.all([
    sesiById(pg, booking.session_id),
    setelanStudio(pg),
  ]);
  if (!sesi) kembali("Kelas tidak ditemukan.");

  const putusan = hasilPembatalan({ booking, sesi, setelan, sekarang });
  if (!putusan.boleh) kembali(putusan.pesan);

  await pg.begin(async (tx) => {
    await tx`
      update bookings
         set status = 'cancelled', dibatalkan_at = now()
       where id = ${booking_id} and status = 'confirmed'`;

    if (putusan.kredit_kembali) {
      // BR-3.1 — kembali ke paket ASAL, hangus_at tidak berubah.
      await tx`
        insert into credit_ledger (member_package_id, booking_id, delta, alasan, pelaku_id)
        values (${putusan.ke_paket}, ${booking_id}, ${putusan.delta},
                ${putusan.alasan}, ${user_id})`;
    }
    // BR-3.2 — batal telat sengaja TIDAK menulis baris ledger apa pun.
  });

  const naik = await prosesWaitlist(booking.session_id, sekarang);

  revalidatePath("/akun");
  revalidatePath("/jadwal");
  kembali(
    (putusan.kredit_kembali
      ? "Booking dibatalkan, 1 kredit kembali ke paket asalnya."
      : "Booking dibatalkan. Karena sudah lewat batas waktu, kreditnya hangus.") +
      (naik ? " Satu orang dari daftar tunggu langsung naik." : ""),
  );
}

/**
 * Alur 4 — naikkan satu orang dari antrean. Dipakai setelah pembatalan; akan
 * dipakai juga oleh job "tutup waitlist" dan pembatalan oleh studio.
 *
 * Keputusan siapa yang naik diambil naikkanWaitlist() di src/rules/;
 * fungsi ini hanya memuat data dan menuliskan hasilnya.
 */
async function prosesWaitlist(session_id: string, sekarang: Date) {
  const [sesi, setelan, antrean] = await Promise.all([
    sesiById(pg, session_id),
    setelanStudio(pg),
    antreanSesi(pg, session_id),
  ]);
  if (!sesi || antrean.length === 0) return null;

  // Maks `waitlist_max` orang (5), jadi ini paling banyak 5 query kecil.
  // ponytail: N+1 dibatasi aturan bisnis, bukan kebetulan — satu query
  // gabungan kalau batasnya pernah dinaikkan.
  const calon: Antre[] = await Promise.all(
    antrean.map(async (a) => ({
      id: a.id,
      user_id: a.user_id,
      paket: await paketMember(pg, a.user_id),
    })),
  );

  const hasil = naikkanWaitlist({ antrean: calon, sesi, setelan, sekarang });

  return pg.begin(async (tx) => {
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
