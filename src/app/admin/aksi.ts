"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { pg } from "@/db";
import {
  BATAS_KOREKSI,
  BATAS_SETELAN,
  batalkanSesi,
  koreksiKredit,
  detailSesi,
  koreksiNoShow,
  sesiSekelompok,
  setelanLengkap,
  simpanSetelan,
  tandaiHadir,
  type KunciSetelan,
} from "@/db/admin";
import { batalkan, bookingkan } from "@/db/pesanan";
import { berikanPaket } from "@/db/kelola";
import { hariWib } from "@/lib/waktu";
import { resetJadwal, seed } from "@/db/seed";
import { pastikanAdmin, pastikanOwner } from "@/lib/masuk";

function kembali(pesan: string): never {
  redirect(`/admin?kabar=${encodeURIComponent(pesan)}`);
}
const keAdmin = kembali;

/**
 * Kewenangan OWNER, bukan admin — 02-rules.md bagian 5.
 *
 * Mengubah batas pembatalan dari 12 jam jadi 2 jam memindahkan kerugian kursi
 * kosong ke pemilik studio, dan berlaku untuk semua member sekaligus. Yang
 * menanggung akibatnya, yang memutuskan. Kartunya juga disembunyikan dari
 * admin di layar, tapi penjaga sebenarnya ada di sini — kartu tersembunyi
 * bukan kartu yang tidak bisa dikirim.
 */
export async function ubahSetelan(formData: FormData) {
  await pastikanOwner();

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

/* ── Layar A3 ─────────────────────────────────────────────────────────── */

function keMember(id: string, pesan: string): never {
  redirect(`/admin/member/${id}?kabar=${encodeURIComponent(pesan)}`);
}

/** BR-1.8 — koreksi kredit manual. Alasan wajib; itu yang membuat buku besar
 *  bisa dipertanggungjawabkan saat member protes bulan depan. */
export async function koreksiKreditManual(formData: FormData) {
  const admin = await pastikanAdmin();
  const user_id = String(formData.get("user_id"));
  const member_package_id = String(formData.get("member_package_id"));
  const delta = Number(formData.get("delta"));
  const catatan = String(formData.get("catatan") ?? "").trim();

  if (!Number.isInteger(delta) || delta === 0)
    keMember(user_id, "Jumlah koreksi harus bilangan bulat dan tidak boleh 0.");
  if (Math.abs(delta) > BATAS_KOREKSI)
    keMember(user_id, `Koreksi maksimal ${BATAS_KOREKSI} kredit sekali jalan.`);
  if (catatan.length < 3)
    keMember(user_id, "Alasan koreksi wajib diisi, minimal 3 huruf.");

  const hasil = await koreksiKredit(pg, {
    member_package_id,
    delta,
    catatan,
    pelaku_id: admin.id,
  });

  revalidatePath(`/admin/member/${user_id}`);
  revalidatePath("/admin");
  revalidatePath("/akun");

  keMember(
    user_id,
    hasil.ok
      ? `Koreksi ${delta > 0 ? "+" : ""}${delta} tercatat. Sisa paket sekarang ${hasil.sisa}.`
      : `Ditolak — sisa paket cuma ${hasil.sisa}, koreksi itu membuatnya minus.`,
  );
}

/* ── Atas nama member — UC-A05, UC-A06, UC-A13 ────────────────────────────
   BR-9.2. Meja depan melakukan untuk member apa yang member bisa lakukan
   sendiri — dengan aturan yang sama persis. Admin tidak menembus jendela
   booking, tidak menembus kapasitas, dan batal telat tetap hangus (BR-3.2).
   Kalau studio mau mengampuni, jalannya koreksi kredit yang wajib beralasan. */

export async function bookingAtasNama(formData: FormData) {
  const admin = await pastikanAdmin();
  const session_id = String(formData.get("session_id"));
  const user_id = String(formData.get("user_id"));
  if (!user_id) keSesi(session_id, "Pilih member dulu.");

  const hasil = await bookingkan(pg, {
    session_id,
    user_id,
    sumber: "admin",
    pelaku_id: admin.id,
    sekarang: new Date(),
  });

  revalidatePath(`/admin/sesi/${session_id}`);
  revalidatePath("/jadwal");
  revalidatePath("/akun");
  keSesi(
    session_id,
    hasil.ok
      ? `Didaftarkan. Alat nomor ${hasil.nomor_alat}, 1 kredit member dipotong.`
      : hasil.pesan,
  );
}

export async function batalkanBookingMember(formData: FormData) {
  const admin = await pastikanAdmin();
  const session_id = String(formData.get("session_id"));

  const hasil = await batalkan(pg, {
    booking_id: String(formData.get("booking_id")),
    // Tanpa user_id: ini jalur admin, kepemilikan sengaja tidak dipakai
    // sebagai filter. Penjaganya pastikanAdmin() di baris pertama.
    pelaku_id: admin.id,
    sekarang: new Date(),
  });
  if (!hasil.ok) keSesi(session_id, hasil.pesan);

  revalidatePath(`/admin/sesi/${session_id}`);
  revalidatePath("/jadwal");
  revalidatePath("/akun");
  keSesi(
    session_id,
    (hasil.kredit_kembali
      ? "Booking dibatalkan, 1 kredit kembali ke paket member."
      : "Booking dibatalkan. Sudah lewat batas waktu, jadi kreditnya hangus (BR-3.2).") +
      (hasil.naik ? " Satu orang dari daftar tunggu langsung naik." : ""),
  );
}

/**
 * UC-A13 — berikan paket ke member. Di demo ini pengganti pembayaran; di
 * versi nyata yang memanggilnya webhook QRIS, bukan tombol.
 *
 * Dua baris sekaligus dalam satu transaksi: `member_packages` yang menyimpan
 * masa berlaku, dan satu baris ledger `beli` sebesar kreditnya. Paket tanpa
 * baris ledger berarti kredit yang tidak pernah ada — BR-1.7 menghitung sisa
 * dari buku besar, bukan dari kolom.
 */
export async function beriPaket(formData: FormData) {
  const admin = await pastikanAdmin();
  const user_id = String(formData.get("user_id"));
  const package_id = String(formData.get("package_id"));
  if (!package_id) keMember(user_id, "Pilih paket dulu.");

  const hasil = await berikanPaket(pg, { user_id, package_id, pelaku_id: admin.id });
  if (!hasil) keMember(user_id, "Paket itu sudah tidak dijual.");

  revalidatePath(`/admin/member/${user_id}`);
  revalidatePath("/admin");
  revalidatePath("/jadwal");
  revalidatePath("/akun");
  keMember(
    user_id,
    `Paket "${hasil.nama}" ditambahkan — ${hasil.jumlah_kredit} kredit, hangus ${hariWib(hasil.hangus_at)}.`,
  );
}

/* ── Reset Demo ───────────────────────────────────────────────────────────
   02-rules.md bagian 5 menandainya "wajib": skenario diulang puluhan kali,
   dan tiap pengulangan butuh data yang sama persis.                      */

export async function resetDemo() {
  await pastikanAdmin();

  // seed() sendiri menolak jalan kalau menemukan studio yang bukan studio
  // demo. Tombolnya juga disembunyikan di layar, tapi penjaga sebenarnya ada
  // di sana — tombol tersembunyi bukan tombol yang tidak bisa ditekan.
  //
  // Satu transaksi: gagal di tengah presentasi tidak boleh meninggalkan
  // database separuh terisi. Kalau meledak, demo yang lama tetap utuh.
  const r = await pg.begin((tx) => seed(tx));

  for (const jalur of ["/admin", "/jadwal", "/akun"]) revalidatePath(jalur);

  // Id user sengaja tetap antar reset, jadi cookie login presenter selamat.
  keAdmin(
    `Demo direset · ${r.member} member · ${r.sesi} sesi · ${r.booking} booking · ` +
      `panel A1 ${r.panel_a1} orang · antrean berkredit ${r.antrean_berkredit}.`,
  );
}

/**
 * Kosongkan panggungnya saja.
 *
 * Bedanya dengan Reset Demo: yang ini TIDAK menulis ulang apa pun. Studio,
 * orang-orangnya, katalog paket, aturan mingguan, dan paket yang sudah dibeli
 * tetap di tempatnya; yang hilang cuma jadwal beserta seluruh jejak
 * pemesanannya. Dipakai untuk memperagakan penerbitan jadwal dari nol —
 * kalender kosong, tekan "Terbitkan sekarang", lalu booking di depan klien.
 *
 * Penjaganya ada di `resetJadwal()` sendiri, sama seperti `seed()`: tombol
 * tersembunyi bukan tombol yang tidak bisa ditekan.
 */
export async function resetJadwalDemo() {
  await pastikanAdmin();

  // Satu transaksi. Gagal di tengah tidak boleh meninggalkan sesi yang
  // bookingnya sudah hilang — itu keadaan yang tidak bisa dijelaskan ke klien.
  const r = await pg.begin((tx) => resetJadwal(tx));

  for (const jalur of ["/admin", "/admin/jadwal", "/admin/pesan", "/jadwal", "/akun"])
    revalidatePath(jalur);

  keAdmin(
    `Jadwal dikosongkan · ${r.sesi} sesi, ${r.booking} booking, ${r.waitlist} antrean, ` +
      `dan ${r.pesan} pesan dihapus. Aturan mingguan dan kredit member tetap — ` +
      `terbitkan lagi dari layar Aturan Jadwal.`,
  );
}
