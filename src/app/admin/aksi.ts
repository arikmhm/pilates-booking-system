"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { pg } from "@/db";
import {
  BATAS_SETELAN,
  batalkanSesi,
  detailSesi,
  koreksiNoShow,
  sesiSekelompok,
  setelanLengkap,
  simpanSetelan,
  tandaiHadir,
  type KunciSetelan,
} from "@/db/admin";
import { pastikanAdmin } from "@/lib/masuk";

function kembali(pesan: string): never {
  redirect(`/admin?kabar=${encodeURIComponent(pesan)}`);
}

export async function ubahSetelan(formData: FormData) {
  await pastikanAdmin();

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

/* ── Layar A2 ─────────────────────────────────────────────────────────── */

function keSesi(id: string, pesan: string): never {
  redirect(`/admin/sesi/${id}?kabar=${encodeURIComponent(pesan)}`);
}

/** Alur 5 — pembatalan oleh studio. BR-5.1 … BR-5.6. */
export async function batalkanKelas(formData: FormData) {
  const admin = await pastikanAdmin();
  const session_id = String(formData.get("session_id"));
  const alasan = String(formData.get("alasan") ?? "").trim();
  const massal = formData.get("massal") === "ya";

  // BR-5.5 — wajib isi alasan; tercatat dan ikut terkirim ke member.
  if (alasan.length < 3)
    keSesi(session_id, "Alasan pembatalan wajib diisi, minimal 3 huruf.");

  const sesi = await detailSesi(pg, session_id);
  if (!sesi) keSesi(session_id, "Kelas tidak ditemukan.");
  if (sesi.status === "cancelled")
    keSesi(session_id, "Kelas ini sudah dibatalkan.");
  // BR-5.6 — sesi yang sudah lewat tidak bisa dibatalkan.
  if (sesi.mulai_at < new Date())
    keSesi(session_id, "Kelas yang sudah lewat tidak bisa dibatalkan.");

  const setelan = await setelanLengkap(pg);
  const ids = await sesiSekelompok(pg, session_id, massal);

  const hasil = await batalkanSesi(pg, {
    ids,
    alasan,
    pelaku_id: admin.id,
    perpanjang_hari: setelan.studio_cancel_extension_days,
    isiPeserta: `Kelas ${sesi.kelas} dibatalkan studio. Alasan: ${alasan}. 1 kredit sudah dikembalikan ke paketmu.`,
    isiAntre: `Kelas ${sesi.kelas} dibatalkan studio. Alasan: ${alasan}. Daftar tunggu ikut dibatalkan.`,
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/sesi/${session_id}`);
  revalidatePath("/jadwal");
  revalidatePath("/akun");

  // Angka ini yang ditunjuk saat presentasi menit 4:15.
  keSesi(
    session_id,
    `${hasil.sesi} kelas dibatalkan · ${hasil.kredit} kredit kembali · ` +
      `${hasil.diperpanjang} paket diperpanjang · ${hasil.antre} antrean dibatalkan · ` +
      `${hasil.pesan} pesan terkirim.`,
  );
}

/** BR-6.1 — centang hadir. Tidak menyentuh ledger. */
export async function hadir(formData: FormData) {
  await pastikanAdmin();
  const session_id = String(formData.get("session_id"));
  const ok = await tandaiHadir(pg, String(formData.get("booking_id")));
  revalidatePath(`/admin/sesi/${session_id}`);
  keSesi(session_id, ok ? "Ditandai hadir." : "Status booking sudah berubah.");
}

/** BR-6.4 — koreksi no-show, wajib isi alasan, kredit dikembalikan. */
export async function koreksiHadir(formData: FormData) {
  const admin = await pastikanAdmin();
  const session_id = String(formData.get("session_id"));
  const catatan = String(formData.get("catatan") ?? "").trim();

  // BR-1.8 — koreksi kredit selalu wajib beralasan; itu yang membuat buku
  // besar bisa dipertanggungjawabkan saat ada sengketa.
  if (catatan.length < 3)
    keSesi(session_id, "Alasan koreksi wajib diisi, minimal 3 huruf.");

  const ok = await koreksiNoShow(pg, {
    booking_id: String(formData.get("booking_id")),
    catatan,
    pelaku_id: admin.id,
  });
  revalidatePath(`/admin/sesi/${session_id}`);
  revalidatePath("/akun");
  keSesi(
    session_id,
    ok ? "Dikoreksi jadi hadir, 1 kredit dikembalikan." : "Booking itu bukan no-show.",
  );
}
