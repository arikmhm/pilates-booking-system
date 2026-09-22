// Login demo — 05-data-model.md bagian 9: "pilih baris users langsung, tanpa
// password". Cookie httpOnly berisi user_id, tanpa tabel sesi.
//
// Ini BUKAN autentikasi. Saat magic link sungguhan dibangun, berkas ini
// diganti token acak bertabel (05-data-model.md bagian 8) dan pemanggilnya
// tidak berubah.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { pg } from "@/db";
import { penggunaById } from "@/db/admin";

const KUNCI = "demo_user";

export async function userSaatIni(): Promise<string | null> {
  const c = await cookies();
  return c.get(KUNCI)?.value ?? null;
}

export async function masukSebagai(user_id: string) {
  const c = await cookies();
  c.set(KUNCI, user_id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function keluar() {
  (await cookies()).delete(KUNCI);
}

/**
 * Penjaga layar dan aksi admin — BR-9.1/9.2.
 *
 * Dipanggil di halaman DAN di tiap server action. Mengalihkan halaman saja
 * tidak menghentikan POST langsung ke server action; keduanya pintu masuk.
 *
 * Di demo peran owner belum dipisah (02-rules.md bagian 5), jadi admin
 * sekaligus owner.
 */
export async function pastikanAdmin() {
  const user_id = await userSaatIni();
  if (!user_id) redirect("/masuk");
  const pengguna = await penggunaById(pg, user_id);
  if (!pengguna) redirect("/masuk");
  if (pengguna.peran === "member" || pengguna.peran === "coach") redirect("/jadwal");
  return pengguna;
}
