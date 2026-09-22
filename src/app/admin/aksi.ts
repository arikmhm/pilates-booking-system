"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { pg } from "@/db";
import {
  BATAS_SETELAN,
  penggunaById,
  setelanLengkap,
  simpanSetelan,
  type KunciSetelan,
} from "@/db/admin";
import { userSaatIni } from "@/lib/masuk";

function kembali(pesan: string): never {
  redirect(`/admin?kabar=${encodeURIComponent(pesan)}`);
}

export async function ubahSetelan(formData: FormData) {
  const user_id = await userSaatIni();
  if (!user_id) redirect("/masuk");

  // BR-9.2 — hanya admin. Di demo peran owner belum terpisah (02-rules.md
  // bagian 5), jadi admin sekaligus owner.
  const pengguna = await penggunaById(pg, user_id);
  if (!pengguna || pengguna.peran === "member" || pengguna.peran === "coach")
    redirect("/jadwal");

  // Batas divalidasi di sini, bukan hanya lewat atribut min/max di input:
  // form bisa dikirim tanpa browser sama sekali.
  const nilai = {} as Record<KunciSetelan, number>;
  for (const [kunci, [min, maks]] of Object.entries(BATAS_SETELAN)) {
    const angka = Number(formData.get(kunci));
    if (!Number.isInteger(angka) || angka < min || angka > maks)
      kembali(`Nilai ${kunci.replace(/_/g, " ")} harus bilangan ${min}–${maks}.`);
    nilai[kunci as KunciSetelan] = angka;
  }

  const studio = await setelanLengkap(pg);
  await simpanSetelan(pg, studio.id, nilai);

  // Setelan menyentuh keputusan di tiap layar member, bukan cuma halaman ini.
  revalidatePath("/admin");
  revalidatePath("/jadwal");
  revalidatePath("/akun");
  kembali(
    `Setelan tersimpan. Batas pembatalan sekarang ${nilai.cancel_window_hours} jam.`,
  );
}
