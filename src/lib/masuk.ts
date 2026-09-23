// Login demo — 05-data-model.md bagian 9: pilih baris users langsung, tanpa
// password. Cookie httpOnly berisi user_id, tanpa tabel sesi. BUKAN autentikasi:
// saat magic link dibangun, berkas ini diganti dan pemanggilnya tidak berubah.

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

/** Penjaga layar dan aksi admin — BR-9.2. Dipanggil di halaman DAN di tiap
 *  server action: mengalihkan halaman saja tidak menghentikan POST langsung.
 *  Di demo peran owner belum dipisah, jadi admin sekaligus owner. */
export async function pastikanAdmin() {
  const user_id = await userSaatIni();
  if (!user_id) redirect("/masuk");
  const pengguna = await penggunaById(pg, user_id);
  if (!pengguna) redirect("/masuk");
  if (pengguna.peran === "member" || pengguna.peran === "coach") redirect("/jadwal");
  return pengguna;
}

/** Penjaga layar khusus pemilik — BR-9.3. Resepsionis perlu melihat jadwal dan
 *  member, tidak perlu melihat pemasukan. Admin yang salah pintu dilempar ke
 *  dashboard, bukan ke /masuk — dia sudah masuk. */
export async function pastikanOwner() {
  const pengguna = await pastikanAdmin();
  if (pengguna.peran !== "owner") redirect("/admin");
  return pengguna;
}

/** Penjaga layar coach — BR-9.4. Staf boleh ikut melihat, member tidak. */
export async function pastikanCoach() {
  const user_id = await userSaatIni();
  if (!user_id) redirect("/masuk");
  const pengguna = await penggunaById(pg, user_id);
  if (!pengguna) redirect("/masuk");
  if (pengguna.peran === "member") redirect("/jadwal");
  return pengguna;
}
