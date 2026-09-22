"use server";

// Pembungkus tipis di atas `src/db/pesanan.ts`. Alur 3 (pembatalan) dan
// Alur 4 (promosi antrean) tinggal di sana karena admin harus bisa melakukan
// hal yang sama atas nama member (UC-A06).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { pg } from "@/db";
import { batalkan, keluarAntrean } from "@/db/pesanan";
import { userSaatIni } from "@/lib/masuk";

function kembali(pesan: string): never {
  redirect(`/akun?kabar=${encodeURIComponent(pesan)}`);
}

export async function batalBooking(formData: FormData) {
  const user_id = await userSaatIni();
  if (!user_id) redirect("/masuk");

  const hasil = await batalkan(pg, {
    booking_id: String(formData.get("booking_id")),
    user_id, // kepemilikan diperiksa di query, bukan di sini
    pelaku_id: user_id,
    sekarang: new Date(),
  });
  if (!hasil.ok) kembali(hasil.pesan);

  revalidatePath("/akun");
  revalidatePath("/jadwal");
  kembali(
    (hasil.kredit_kembali
      ? "Booking dibatalkan, 1 kredit kembali ke paket asalnya."
      : "Booking dibatalkan. Karena sudah lewat batas waktu, kreditnya hangus.") +
      (hasil.naik ? " Satu orang dari daftar tunggu langsung naik." : ""),
  );
}

/** BR-4.7 — keluar dari daftar tunggu. Tidak ada kredit yang bergerak. */
export async function keluarWaitlist(formData: FormData) {
  const user_id = await userSaatIni();
  if (!user_id) redirect("/masuk");

  const keluar = await keluarAntrean(pg, {
    entry_id: String(formData.get("entry_id")),
    user_id,
  });

  revalidatePath("/akun");
  revalidatePath("/jadwal");
  kembali(
    keluar
      ? "Kamu keluar dari daftar tunggu. Kredit tidak terpotong sejak awal."
      : "Antrean itu sudah tidak aktif.",
  );
}
