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

/**
 * Kembali ke layar jadwal membawa satu kalimat — halaman yang menampilkannya.
 *
 * `ke` membawa minggu dan saringan jenis kelas yang sedang dibuka. Tanpa itu, booking
 * kelas minggu depan melemparkan orang kembali ke minggu ini dan blok yang
 * baru saja dipesannya tidak kelihatan. Nilainya datang dari formulir, jadi
 * ia disaring: hanya path layar ini, tanpa host, tanpa `//` pembuka —
 * `redirect()` akan menurut saja ke mana pun ia diarahkan.
 */
function kembali(pesan: string, ke = "/jadwal"): never {
  const aman = /^\/jadwal(\?[^#]*)?$/.test(ke) ? ke : "/jadwal";
  const [path, kueri] = aman.split("?");
  const q = new URLSearchParams(kueri);
  q.delete("pilih"); // panelnya selesai; jangan dibuka lagi
  q.set("kabar", pesan);
  redirect(`${path}?${q}`);
}

export async function booking(formData: FormData) {
  const user_id = await userSaatIni();
  if (!user_id) redirect("/masuk");

  // BR-2.6 — kosong berarti member tidak memilih; sistem yang menentukan.
  const pilihan = Math.trunc(Number(formData.get("nomor_alat"))) || null;
  const ke = String(formData.get("kembali") ?? "/jadwal");

  const hasil = await bookingkan(pg, {
    session_id: String(formData.get("session_id")),
    user_id,
    sumber: "member",
    pelaku_id: user_id,
    sekarang: new Date(),
    alat_pilihan: pilihan,
  });

  revalidatePath("/jadwal");
  revalidatePath("/akun");
  if (!hasil.ok) kembali(hasil.pesan, ke);

  // Alat yang diminta bisa keburu diambil orang lain di detik yang sama.
  // Menyebutkannya penting: member yang menutup layar sambil mengira dapat
  // alat 3 akan berdiri di depan alat yang salah.
  kembali(
    pilihan && pilihan !== hasil.nomor_alat
      ? `Alat ${pilihan} keburu terisi. Kamu dapat alat ${hasil.nomor_alat}, 1 kredit dipotong.`
      : `Terkonfirmasi. Alat nomor ${hasil.nomor_alat}, 1 kredit dipotong.`,
    ke,
  );
}

export async function ikutWaitlist(formData: FormData) {
  const user_id = await userSaatIni();
  if (!user_id) redirect("/masuk");

  const session_id = String(formData.get("session_id"));
  const ke = String(formData.get("kembali") ?? "/jadwal");
  const setelan = await setelanStudio(pg);

  const [{ jumlah }] = await pg<{ jumlah: number }[]>`
    select count(*)::int as jumlah from waitlist_entries
     where session_id = ${session_id} and status = 'waiting'`;

  const putusan = bolehIkutWaitlist(jumlah, setelan);
  if (!putusan.boleh) kembali(putusan.pesan!, ke);

  try {
    // BR-4.5 — kredit TIDAK dipotong selama masih mengantre.
    await pg`
      insert into waitlist_entries (session_id, user_id)
      values (${session_id}, ${user_id})`;
  } catch (e) {
    if ((e as { code?: string }).code !== "23505") throw e;
    kembali("Kamu sudah ada di daftar tunggu kelas ini.", ke); // BR-4.1
  }
  revalidatePath("/jadwal");
  revalidatePath("/akun");
  kembali(`Masuk daftar tunggu, nomor ${jumlah + 1}. Kredit belum dipotong.`, ke);
}
