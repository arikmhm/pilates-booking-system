"use server";

import { redirect } from "next/navigation";
import { keluar } from "@/lib/masuk";

/** Keluar dari sesi demo. "Ganti Pengguna" justru memasang cookie baru, jadi
 *  tanpa ini tampilan tamu tidak bisa dilihat lagi. Mendarat di `/jadwal` (DS-45). */
export async function keluarAkun() {
  await keluar();
  redirect("/jadwal");
}
