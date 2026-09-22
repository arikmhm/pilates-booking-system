// Login demo — 05-data-model.md bagian 9: "pilih baris users langsung, tanpa
// password". Cookie httpOnly berisi user_id, tanpa tabel sesi.
//
// Ini BUKAN autentikasi. Saat magic link sungguhan dibangun, berkas ini
// diganti token acak bertabel (05-data-model.md bagian 8) dan pemanggilnya
// tidak berubah.

import { cookies } from "next/headers";

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
