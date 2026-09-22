"use server";

// Layar jadwal hanya menerjemahkan: baca form, panggil satu operasi, ubah
// hasilnya jadi kalimat. Aturan booking, balapan alat, potongan kredit, dan
// notifikasi semuanya ada di `src/db/pesanan.ts` — dipakai bersama jalur
// admin (UC-A05), supaya tidak ada dua tempat yang bisa lupa memotong kredit.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { pg } from "@/db";
import { setelanStudio } from "@/db/booking";
import { bookingkan } from "@/db/pesanan";
import { bolehIkutWaitlist } from "@/rules";
import { userSaatIni } from "@/lib/masuk";

/** Kode balik lewat URL — halaman yang menerjemahkannya jadi kalimat. */
function kembali(pesan: string): never {
  redirect(`/jadwal?kabar=${encodeURIComponent(pesan)}`);
}

export async function booking(formData: FormData) {
  const user_id = await userSaatIni();
  if (!user_id) redirect("/masuk");

  const hasil = await bookingkan(pg, {
    session_id: String(formData.get("session_id")),
    user_id,
    sumber: "member",
    pelaku_id: user_id,
    sekarang: new Date(),
  });

  revalidatePath("/jadwal");
  revalidatePath("/akun");
  // redirect() bekerja dengan melempar, jadi ia sengaja di luar operasinya.
  kembali(
    hasil.ok
      ? `Terkonfirmasi. Alat nomor ${hasil.nomor_alat}, 1 kredit dipotong.`
      : hasil.pesan,
  );
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
  revalidatePath("/akun");
  kembali(`Masuk daftar tunggu, nomor ${jumlah + 1}. Kredit belum dipotong.`);
}
