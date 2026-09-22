"use server";

// Aksi layar pengelolaan: layanan/paket dan aturan jadwal.
//
// Semua validasi diulang di sini meski form sudah punya `required`, `min`,
// dan `max`. Atribut HTML itu kenyamanan pengguna, bukan penjaga — server
// action bisa dipanggil tanpa browser sama sekali.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { pg } from "@/db";
import { setelanLengkap } from "@/db/admin";
import {
  BATAS_PAKET,
  BATAS_TERBIT,
  bersihkanSesiKosong,
  buatAturan,
  buatPaket,
  buatSesiManual,
  hentikanAturan,
  jalankanAturan,
  simpanJangkaTerbit,
  ubahAktifPaket,
} from "@/db/kelola";
import { generateSesi } from "@/db/job";
import { pastikanAdmin, pastikanOwner } from "@/lib/masuk";
import { saat } from "@/db/booking";
import { hariWib, jamWib } from "@/lib/waktu";

function keLayanan(pesan: string): never {
  redirect(`/admin/layanan?kabar=${encodeURIComponent(pesan)}`);
}
// Formulir buat-kelas hidup di dua layar: Aturan Jadwal dan kalender M1.
// Daftar putih, bukan path apa adanya dari form — `dari` datang dari klien,
// dan redirect yang menurut saja adalah open redirect.
function keJadwal(pesan: string, dari?: FormDataEntryValue | null): never {
  const tujuan = String(dari ?? "") === "/jadwal" ? "/jadwal" : "/admin/jadwal";
  redirect(`${tujuan}?kabar=${encodeURIComponent(pesan)}`);
}

/** Bilangan bulat dalam rentang, atau null. */
function angka(form: FormData, kunci: string, [min, maks]: readonly [number, number]) {
  const n = Number(form.get(kunci));
  return Number.isInteger(n) && n >= min && n <= maks ? n : null;
}

/* ── Layanan & paket — UC-O03 ──────────────────────────────────────────────
   Kewenangan OWNER. Harga adalah keputusan bisnis: staf meja depan yang bisa
   mencetak paket Rp 0 adalah risiko yang tidak perlu ada. Admin tetap boleh
   MELIHAT katalognya — yang dijaga kemampuannya, bukan layarnya.          */

export async function tambahPaket(formData: FormData) {
  await pastikanOwner();

  const nama = String(formData.get("nama") ?? "").trim();
  if (nama.length < 3 || nama.length > 60)
    keLayanan("Nama paket harus 3–60 karakter.");

  const kredit = angka(formData, "jumlah_kredit", BATAS_PAKET.jumlah_kredit);
  const masa = angka(formData, "masa_berlaku_hari", BATAS_PAKET.masa_berlaku_hari);
  const harga = angka(formData, "harga_rupiah", BATAS_PAKET.harga_rupiah);
  if (kredit === null) keLayanan("Jumlah kredit harus 1–200.");
  if (masa === null) keLayanan("Masa berlaku harus 1–730 hari.");
  if (harga === null) keLayanan("Harga harus bilangan bulat Rupiah, tanpa desimal.");

  // BR-1.4 — paket tanpa jenis kelas tidak bisa dipakai membooking apa pun.
  const kelas = formData.getAll("class_type_ids").map(String).filter(Boolean);
  if (kelas.length === 0)
    keLayanan("Pilih minimal satu jenis kelas, kalau tidak paketnya tidak bisa dipakai.");

  const studio = await setelanLengkap(pg);
  await buatPaket(pg, {
    studio_id: studio.id,
    nama,
    jumlah_kredit: kredit,
    masa_berlaku_hari: masa,
    harga_rupiah: harga,
    class_type_ids: kelas,
  });

  revalidatePath("/admin/layanan");
  revalidatePath("/"); // harga tampil di halaman publik
  keLayanan(`Paket "${nama}" dibuat — ${kredit} kredit, berlaku ${masa} hari.`);
}

export async function setAktifPaket(formData: FormData) {
  await pastikanOwner();

  const id = String(formData.get("id"));
  const aktif = formData.get("aktif") === "1";
  await ubahAktifPaket(pg, id, aktif);

  revalidatePath("/admin/layanan");
  revalidatePath("/");
  keLayanan(
    aktif
      ? "Paket diaktifkan kembali dan muncul lagi di halaman publik."
      : "Paket disembunyikan. Member yang sudah membelinya tidak terpengaruh.",
  );
}

/* ── Aturan jadwal berulang — UC-O01 ───────────────────────────────────────
   Kewenangan OWNER: slot mingguan permanen berarti beban coach dan biaya
   operasional tiap minggu. Kelas tambahan sekali jalan di bawah TETAP milik
   admin — itu operasional, sekali pakai, dan sering mendesak.             */

export async function tambahAturan(formData: FormData) {
  await pastikanOwner();
  const dari = formData.get("dari");

  const hari = angka(formData, "hari", [1, 7]);
  if (hari === null) keJadwal("Hari tidak sah.", dari);

  const jam = String(formData.get("jam_mulai") ?? "");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(jam))
    keJadwal("Jam mulai harus format HH:MM.", dari);

  const class_type_id = String(formData.get("class_type_id") ?? "");
  if (!class_type_id) keJadwal("Pilih jenis kelas.", dari);

  const coach_id = String(formData.get("coach_id") ?? "") || null;
  const kapasitasMentah = String(formData.get("kapasitas") ?? "").trim();
  const kapasitas = kapasitasMentah ? angka(formData, "kapasitas", [1, 60]) : null;
  if (kapasitasMentah && kapasitas === null) keJadwal("Kapasitas harus 1–60.", dari);

  const studio = await setelanLengkap(pg);
  const aturan_id = await buatAturan(pg, {
    studio_id: studio.id,
    class_type_id,
    coach_id,
    hari,
    jam_mulai: jam,
    kapasitas,
  });

  // Aturan baru belum berarti apa-apa sampai jadi sesi. Job harian yang
  // biasanya mengerjakannya (BR-7.1) dipanggil langsung di sini supaya
  // hasilnya terlihat di jadwal detik itu juga — fungsi yang sama persis,
  // bukan salinannya.
  const { dibuat } = await generateSesi(pg, new Date());

  // Job menerbitkan sesi untuk SEMUA aturan sampai batas generate_weeks_ahead,
  // jadi angkanya bisa ratusan kalau penerbitannya sedang tertinggal. Yang
  // ingin dilihat admin adalah slot yang baru saja dia buat.
  //
  // `perdana` ada karena satu pertanyaan yang selalu muncul: "kok jadwalnya
  // tidak tampil?". Slot Selasa yang dibuat Rabu tidak punya sesi minggu ini —
  // Selasanya sudah lewat, dan kalender membuka di minggu ini. Angka "8 sesi
  // terbit" tidak menjawab itu; tanggal sesi pertamanya menjawab.
  const [{ milik_slot, perdana }] = await pg<
    { milik_slot: number; perdana: string | null }[]
  >`
    select count(*)::int as milik_slot, min(mulai_at) as perdana
      from sessions
     where schedule_rule_id = ${aturan_id} and mulai_at > now()`;

  revalidatePath("/admin/jadwal");
  revalidatePath("/jadwal");
  keJadwal(
    `Slot ditambahkan — ${milik_slot} sesi terbit` +
      (perdana ? `, mulai ${hariWib(saat(perdana))}` : "") +
      (dibuat > milik_slot
        ? `, sekalian ${dibuat - milik_slot} sesi slot lain yang belum diterbitkan.`
        : "."),
    dari,
  );
}

export async function berhentikanAturan(formData: FormData) {
  await pastikanOwner();

  const id = String(formData.get("id"));
  await hentikanAturan(pg, id);
  // Sesi mendatang yang sudah punya peserta SENGAJA dibiarkan: menghapusnya
  // membatalkan booking orang tanpa melewati Alur 5 dan tanpa kredit kembali.
  const dihapus = await bersihkanSesiKosong(pg, id);

  revalidatePath("/admin/jadwal");
  revalidatePath("/jadwal");
  keJadwal(
    `Aturan dihentikan. ${dihapus} sesi kosong dibersihkan; sesi yang sudah ada pesertanya dibiarkan — batalkan lewat layar sesi supaya kredit kembali.`,
  );
}

export async function jalankanLagiAturan(formData: FormData) {
  await pastikanOwner();

  const id = String(formData.get("id"));
  await jalankanAturan(pg, id);

  // Sesi yang dibersihkan saat dihentikan tidak kembali sendiri — yang
  // mengembalikannya penerbitan, dan itu dikerjakan di sini supaya slotnya
  // tidak tampak "berjalan" dengan kalender yang masih kosong.
  await generateSesi(pg, new Date());
  const [{ milik_slot, perdana }] = await pg<
    { milik_slot: number; perdana: string | null }[]
  >`
    select count(*)::int as milik_slot, min(mulai_at) as perdana
      from sessions
     where schedule_rule_id = ${id} and mulai_at > now()`;

  revalidatePath("/admin/jadwal");
  revalidatePath("/jadwal");
  keJadwal(
    `Slot dijalankan lagi — ${milik_slot} sesi terbit` +
      (perdana ? `, mulai ${hariWib(saat(perdana))}.` : "."),
    formData.get("dari"),
  );
}

/* ── Sesi sekali jalan — kewenangan admin ────────────────────────────────── */

export async function tambahSesi(formData: FormData) {
  await pastikanAdmin();
  const dari = formData.get("dari");

  const tanggal = String(formData.get("tanggal") ?? "");
  const jam = String(formData.get("jam") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(jam))
    keJadwal("Tanggal atau jam tidak sah.", dari);

  const class_type_id = String(formData.get("class_type_id") ?? "");
  if (!class_type_id) keJadwal("Pilih jenis kelas.", dari);

  const kapasitas = angka(formData, "kapasitas", [1, 60]);
  const durasi = angka(formData, "durasi_menit", [15, 240]);
  if (kapasitas === null) keJadwal("Kapasitas harus 1–60.", dari);
  if (durasi === null) keJadwal("Durasi harus 15–240 menit.", dari);

  const studio = await setelanLengkap(pg);
  const mulai = await buatSesiManual(pg, {
    studio_id: studio.id,
    class_type_id,
    coach_id: String(formData.get("coach_id") ?? "") || null,
    tanggal,
    jam,
    durasi_menit: durasi,
    kapasitas,
  });

  revalidatePath("/admin/jadwal");
  revalidatePath("/jadwal");
  keJadwal(
    `Kelas tambahan dibuat: ${hariWib(mulai)} pukul ${jamWib(mulai)}.`,
    dari,
  );
}

/* ── Terbitkan sesi dari aturan — UC-S01, BR-7.1 ───────────────────────────
   Dulu ini cron harian. Sekarang tombol: studio ingin tahu KAPAN jadwalnya
   bertambah, bukan menemukannya sudah bertambah. Fungsinya sama persis
   (`generateSesi`), yang berubah cuma siapa yang memulai — dan karena ia
   idempoten, menekannya dua kali tidak menerbitkan apa pun dua kali.

   Menekan tombolnya operasional, jadi milik admin. Mengubah jangkanya syarat
   studio, jadi milik owner (DS-35) — 26 minggu ke depan berarti menjanjikan
   jadwal yang belum tentu ada coach-nya.                                  */

export async function terbitkanJadwal(formData: FormData) {
  const pengguna = await pastikanAdmin();
  const dari = formData.get("dari");

  const mentah = String(formData.get("minggu") ?? "").trim();
  let ubah = "";
  if (mentah) {
    if (pengguna.peran !== "owner")
      keJadwal("Jangka terbit hanya bisa diubah pemilik studio.", dari);

    const [min, maks] = BATAS_TERBIT;
    const minggu = angka(formData, "minggu", BATAS_TERBIT);
    if (minggu === null) keJadwal(`Jangka terbit harus ${min}–${maks} minggu.`, dari);

    const studio = await setelanLengkap(pg);
    await simpanJangkaTerbit(pg, studio.id, minggu);
    ubah = `Jangka terbit disimpan: ${minggu} minggu. `;
  }

  const { dibuat } = await generateSesi(pg, new Date());

  revalidatePath("/admin/jadwal");
  revalidatePath("/jadwal");

  // Nol sesi punya DUA sebab yang berlawanan, dan menyamakannya membuat pesan
  // ini berbohong: jadwalnya sudah lengkap, atau tidak ada satu pun slot
  // mingguan yang berjalan. Yang kedua itu keadaan buntu — tombol ini tidak
  // akan pernah menghasilkan apa pun sampai ada aturan yang dijalankan.
  const [{ aktif }] = await pg<{ aktif: number }[]>`
    select count(*)::int as aktif from schedule_rules where berlaku_sampai is null`;

  keJadwal(
    ubah +
      (dibuat > 0
        ? `${dibuat} sesi diterbitkan dari aturan mingguan.`
        : aktif === 0
          ? "Tidak ada yang bisa diterbitkan: semua slot mingguan berstatus Dihentikan. Jalankan lagi salah satunya di daftar sebelah kiri."
          : "Tidak ada sesi baru — jadwal sudah terbit sampai batas jangkanya."),
    dari,
  );
}
