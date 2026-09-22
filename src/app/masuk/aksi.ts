"use server";

import { redirect } from "next/navigation";
import { keluar } from "@/lib/masuk";

/**
 * Keluar dari sesi demo.
 *
 * Tanpa ini satu-satunya cara meninggalkan peran adalah "Ganti Pengguna" —
 * yang justru memasang cookie baru, jadi tampilan tamu tidak pernah bisa
 * dilihat lagi dari browser yang sama. Mendarat di `/jadwal`, bukan `/masuk`:
 * yang barusan dipilih orang adalah berhenti jadi siapa-siapa, dan jadwal
 * publik memang bisa dibaca tanpa akun (DS-45).
 */
export async function keluarAkun() {
  await keluar();
  redirect("/jadwal");
}
