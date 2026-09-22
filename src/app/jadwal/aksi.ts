"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { pg } from "@/db";
import {
  ALAT_BENTROK,
  SUDAH_TERDAFTAR,
  bookingAktif,
  paketMember,
  pesanKursi,
  sesiById,
  setelanStudio,
} from "@/db/booking";
import { bolehBooking, bolehIkutWaitlist } from "@/rules";
import { userSaatIni } from "@/lib/masuk";

/** Kode balik lewat URL — halaman yang menerjemahkannya jadi kalimat. */
function kembali(pesan: string): never {
  redirect(`/jadwal?kabar=${encodeURIComponent(pesan)}`);
}

export async function booking(formData: FormData) {
  const user_id = await userSaatIni();
  if (!user_id) redirect("/masuk");

  const session_id = String(formData.get("session_id"));
  const sekarang = new Date();

  const [setelan, paket, aktif] = await Promise.all([
    setelanStudio(pg),
    paketMember(pg, user_id),
    bookingAktif(pg, user_id),
  ]);

  const sesi = await sesiById(pg, session_id);
  if (!sesi) kembali("Kelas tidak ditemukan.");

  // Keputusan diambil fungsi murni; berkas ini hanya baca–tulis database.
  const putusan = bolehBooking({ sesi, setelan, paket, booking_aktif: aktif, sekarang });
  if (!putusan.boleh) kembali(putusan.pesan);

  // Balapan alat terakhir: unique index menolak yang kalah, dia mencoba alat
  // berikutnya. Bukan gagal — hanya kalah cepat. Batas percobaan = kapasitas.
  let kabar: string | null = null;
  for (let coba = 0; coba < 12; coba++) {
    try {
      const hasil = await pg.begin(async (tx) => {
        const kursi = await pesanKursi(tx, {
          session_id,
          user_id,
          member_package_id: putusan.paket.id,
        });
        if (!kursi) return null; // kelas penuh

        // BR-2.2 — kredit dipotong saat booking, bukan saat hadir.
        // Satu transaksi dengan INSERT kursi: kursi tanpa potongan kredit
        // adalah kursi gratis.
        await tx`
          insert into credit_ledger (member_package_id, booking_id, delta, alasan, pelaku_id)
          values (${putusan.paket.id}, ${kursi.id}, -1, 'booking', ${user_id})`;

        await tx`
          insert into notifications (user_id, kanal, template, isi, session_id)
          values (${user_id}, 'layar', 'booking_ok',
                  ${`Booking terkonfirmasi. Alat nomor ${kursi.nomor_alat}. 1 kredit dipotong.`},
                  ${session_id})`;
        return kursi;
      });

      revalidatePath("/jadwal");
      kabar = hasil
        ? `Terkonfirmasi. Alat nomor ${hasil.nomor_alat}, 1 kredit dipotong.`
        : "Kelas ini baru saja penuh. Kamu bisa ikut daftar tunggu.";
      break;
    } catch (e) {
      const galat = e as { code?: string; constraint_name?: string };
      if (galat.code !== "23505") throw e;
      // Dua constraint, dua arti yang berlawanan — membedakannya wajib,
      // kalau tidak yang satu diulang selamanya.
      if (galat.constraint_name === SUDAH_TERDAFTAR)
        kembali("Kamu sudah terdaftar di kelas ini.");
      if (galat.constraint_name !== ALAT_BENTROK) throw e;
    }
  }
  // redirect() sengaja di luar try: ia bekerja dengan melempar, dan catch di
  // atas sedang memeriksa kode error Postgres.
  kembali(kabar ?? "Kelas sedang ramai diperebutkan. Coba sekali lagi.");
}

export async function ikutWaitlist(formData: FormData) {
  const user_id = await userSaatIni();
  if (!user_id) redirect("/masuk");

  const session_id = String(formData.get("session_id"));
  const setelan = await setelanStudio(pg);

  const [{ jumlah }] = await pg<{ jumlah: number }[]>`
    select count(*)::int as jumlah from waitlist_entries
     where session_id = ${session_id} and status = 'waiting'`;

  const putusan = bolehIkutWaitlist(jumlah, setelan);
  if (!putusan.boleh) kembali(putusan.pesan!);

  try {
    // BR-4.5 — kredit TIDAK dipotong selama masih mengantre.
    await pg`
      insert into waitlist_entries (session_id, user_id)
      values (${session_id}, ${user_id})`;
  } catch (e) {
    if ((e as { code?: string }).code !== "23505") throw e;
    kembali("Kamu sudah ada di daftar tunggu kelas ini."); // BR-4.1
  }
  revalidatePath("/jadwal");
  kembali(`Masuk daftar tunggu, nomor ${jumlah + 1}. Kredit belum dipotong.`);
}
