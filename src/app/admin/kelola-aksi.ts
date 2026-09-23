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
  BATAS_JENIS,
  BATAS_PAKET,
  BATAS_TERBIT,
  bersihkanSesiKosong,
  buatAturan,
  buatJenisKelas,
  buatPaket,
  buatSesiManual,
  daftarAturan,
  hapusJenisKelas,
  HARI,
  hentikanAturan,
  jalankanAturan,
  jenisKelasById,
  sesiSekitar,
  NAMA_JENIS_GANDA,
  simpanJangkaTerbit,
  ubahAktifPaket,
} from "@/db/kelola";
import { generateSesi } from "@/db/job";
import { pastikanAdmin, pastikanOwner } from "@/lib/masuk";
import { saat } from "@/db/booking";
import { sesiBentrok, slotBentrok, type SlotMingguan } from "@/rules";
import { hariWib, jamWib, kunciHariWib } from "@/lib/waktu";

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

/**
 * Jam dinding WIB dari dua `<select>` — "14" + "30" jadi "14:30".
 *
 * Bukan `<input type="time">`: tampilannya mengikuti locale browser, jadi
 * sebagian orang melihat 02:30 PM dan sebagian 14:30 untuk berkas yang sama.
 * Dua select selalu 24 jam di mana pun, dan tidak ada yang bisa mengetik jam
 * yang tidak ada (DS-41).
 */
function jamDinding(form: FormData, kunciJam: string, kunciMenit: string) {
  const j = Number(form.get(kunciJam));
  const m = Number(form.get(kunciMenit));
  if (!Number.isInteger(j) || j < 0 || j > 23) return null;
  if (!Number.isInteger(m) || m < 0 || m > 59) return null;
  return `${String(j).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Bilangan bulat dalam rentang, atau null. */
function angka(form: FormData, kunci: string, [min, maks]: readonly [number, number]) {
  const n = Number(form.get(kunci));
  return Number.isInteger(n) && n >= min && n <= maks ? n : null;
}

/**
 * Kursi dan durasi di formulir jadwal boleh dikosongkan — artinya "ikut jenis
 * kelasnya" (BR-7.2). Tiga keadaan, jadi tiga nilai kembalian:
 *
 * - `null`      dikosongkan, pakai bawaan jenis kelasnya
 * - `number`    diisi dan sah
 * - `undefined` diisi tapi di luar rentang — itu galat, bukan "ikut bawaan"
 */
function angkaOpsional(
  form: FormData,
  kunci: string,
  [min, maks]: readonly [number, number],
) {
  const mentah = String(form.get(kunci) ?? "").trim();
  if (!mentah) return null;
  const n = Number(mentah);
  return Number.isInteger(n) && n >= min && n <= maks ? n : undefined;
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

/* ── Jenis kelas — UC-O02 ──────────────────────────────────────────────────
   Kewenangan OWNER, sekelompok dengan paket: jenis kelas adalah katalog yang
   sama. Daftar inilah yang muncul sebagai "berlaku untuk" di kartu paket
   (BR-1.4) dan sebagai saringan di layar jadwal — satu sumber, tiga tempat. */

export async function tambahJenisKelas(formData: FormData) {
  await pastikanOwner();

  const nama = String(formData.get("nama") ?? "").trim();
  if (nama.length < 2 || nama.length > 40)
    keLayanan("Nama jenis kelas harus 2–40 karakter.");

  const kapasitas = angka(formData, "kapasitas_default", BATAS_JENIS.kapasitas_default);
  const durasi = angka(formData, "durasi_menit", BATAS_JENIS.durasi_menit);
  if (kapasitas === null) keLayanan("Kapasitas bawaan harus 1–60.");
  if (durasi === null) keLayanan("Durasi harus 15–240 menit.");

  const studio = await setelanLengkap(pg);
  try {
    await buatJenisKelas(pg, {
      studio_id: studio.id,
      nama,
      kapasitas_default: kapasitas,
      durasi_menit: durasi,
    });
  } catch (e) {
    // Nama ganda ditangkap dari index, bukan dari cek-dulu-baru-insert.
    const galat = e as { constraint_name?: string };
    if (galat.constraint_name !== NAMA_JENIS_GANDA) throw e;
    keLayanan(`Jenis kelas "${nama}" sudah ada.`);
  }

  revalidatePath("/admin/layanan");
  revalidatePath("/admin/jadwal");
  revalidatePath("/jadwal");
  keLayanan(
    `Jenis kelas "${nama}" dibuat — ${kapasitas} kursi, ${durasi} menit. ` +
      "Tinggal dijadwalkan di Aturan Jadwal dan dimasukkan ke paket.",
  );
}

export async function buangJenisKelas(formData: FormData) {
  await pastikanOwner();

  const id = String(formData.get("id"));
  const nama = String(formData.get("nama") ?? "jenis kelas");
  const terhapus = await hapusJenisKelas(pg, id);
  if (!terhapus)
    keLayanan(
      `"${nama}" sudah dipakai slot mingguan, sesi, atau paket — jadi tidak bisa dihapus. ` +
        "Hentikan slotnya dulu kalau memang mau berhenti menjualnya.",
    );

  revalidatePath("/admin/layanan");
  revalidatePath("/jadwal");
  keLayanan(`Jenis kelas "${nama}" dihapus.`);
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

  const jam = jamDinding(formData, "jam", "menit");
  if (jam === null) keJadwal("Jam mulai tidak sah.", dari);

  const class_type_id = String(formData.get("class_type_id") ?? "");
  if (!class_type_id) keJadwal("Pilih jenis kelas.", dari);

  const coach_id = String(formData.get("coach_id") ?? "") || null;

  // BR-7.2 — kursi dan durasi bawaannya milik jenis kelas; yang disimpan di
  // slot hanya kalau sengaja ditimpa. Formulir yang mengisi angka duluan
  // membuat keputusan itu diambil dua kali, dan yang kedua diam-diam menang:
  // "Private 1 kursi" terbit 8 kursi karena kolomnya sudah terlanjur terisi.
  const kapasitas = angkaOpsional(formData, "kapasitas", [1, 60]);
  if (kapasitas === undefined) keJadwal("Kursi harus 1–60, atau dikosongkan.", dari);
  const durasi = angkaOpsional(formData, "durasi_menit", [15, 240]);
  if (durasi === undefined)
    keJadwal("Durasi harus 15–240 menit, atau dikosongkan.", dari);

  const jenis = await jenisKelasById(pg, class_type_id);
  if (!jenis) keJadwal("Jenis kelas tidak ditemukan.", dari);
  // Yang BERLAKU — dipakai penjaga bentrok dan disebut di pesan hasilnya.
  const kursiBerlaku = kapasitas ?? jenis.kapasitas_default;
  const durasiBerlaku = durasi ?? jenis.durasi_menit;

  // Jangka terbit ikut di formulir ini (DS-41): membuat kelas mingguan dan
  // memutuskan sampai kapan ia terbit adalah satu keputusan, bukan dua.
  const minggu = angka(formData, "minggu", BATAS_TERBIT);
  if (minggu === null)
    keJadwal(`Jangka terbit harus ${BATAS_TERBIT[0]}–${BATAS_TERBIT[1]} minggu.`, dari);

  // BR-7.6 — slot baru tidak boleh menabrak slot yang masih berjalan kalau
  // jenis kelasnya sama (alatnya dipakai dua kali) atau pelatihnya sama.
  // Dijaga di sini, bukan saat booking: yang salah jadwalnya, bukan pesanan
  // membernya. Slot yang sudah dihentikan dilewati — ia tidak menerbitkan
  // sesi apa pun, jadi menolak karenanya berarti memblokir jam yang kosong.
  const hariIni = kunciHariWib(new Date());
  const berjalan: SlotMingguan[] = (await daftarAturan(pg, new Date()))
    .filter((a) => a.berlaku_sampai === null || a.berlaku_sampai >= hariIni)
    .map((a) => ({
      hari: a.hari,
      jam_mulai: a.jam_mulai,
      durasi_menit: a.durasi_menit,
      class_type_id: a.class_type_id,
      coach_id: a.coach_id,
    }));

  const benturan = slotBentrok(
    { hari, jam_mulai: jam, durasi_menit: durasiBerlaku, class_type_id, coach_id },
    berjalan,
  );
  if (benturan.ada) {
    const l = benturan.lawan;
    // "06:00:00" dari kolom `time` jadi "06.00" — titik, seperti jam di
    // seluruh layar lain (DS-28).
    const kapan = `${HARI[l.hari - 1]} ${l.jam_mulai.slice(0, 5).replace(":", ".")}`;
    keJadwal(
      benturan.sebab === "kelas"
        ? `Bentrok dengan slot ${kapan} yang jenis kelasnya sama. Dua kelas serentak berarti alatnya dipakai dua kali, dan kursinya terjual dua kali lipat.`
        : `Bentrok dengan slot ${kapan} yang pelatihnya sama. Satu orang tidak bisa mengajar dua kelas sekaligus.`,
      dari,
    );
  }

  const studio = await setelanLengkap(pg);
  await simpanJangkaTerbit(pg, studio.id, minggu);

  const aturan_id = await buatAturan(pg, {
    studio_id: studio.id,
    class_type_id,
    coach_id,
    hari,
    jam_mulai: jam,
    kapasitas,
    durasi_menit: durasi,
  });

  // Aturan baru belum berarti apa-apa sampai jadi sesi, jadi penerbitannya
  // dijalankan di sini juga — satu tombol, satu hasil yang kelihatan.
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
  // Pesannya menyebut kursi dan durasi yang BERLAKU, bukan yang diketik.
  // Sesudah kolomnya boleh dikosongkan, satu-satunya cara tahu angka mana
  // yang jadi adalah dengan membacanya kembali di sini.
  keJadwal(
    `${jenis.nama} ${HARI[hari - 1]} ${jam.replace(":", ".")} — ` +
      `${kursiBerlaku} kursi, ${durasiBerlaku} menit. ` +
      `${milik_slot} sesi terbit` +
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
  const jam = jamDinding(formData, "jam", "menit");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || jam === null)
    keJadwal("Tanggal atau jam tidak sah.", dari);

  const class_type_id = String(formData.get("class_type_id") ?? "");
  if (!class_type_id) keJadwal("Pilih jenis kelas.", dari);

  // BR-7.2 — sama seperti slot mingguan: kosong berarti ikut jenis kelasnya.
  // Bedanya di sini nilainya tidak boleh tersimpan null — `sessions.kapasitas`
  // dan `durasi_menit` NOT NULL karena sesi yang sudah terbit tidak boleh
  // berubah saat jenis kelasnya diedit (BR-7.3). Jadi bawaannya diselesaikan
  // di sini, bukan ditunda ke query.
  const kapasitas = angkaOpsional(formData, "kapasitas", [1, 60]);
  if (kapasitas === undefined) keJadwal("Kursi harus 1–60, atau dikosongkan.", dari);
  const durasi = angkaOpsional(formData, "durasi_menit", [15, 240]);
  if (durasi === undefined)
    keJadwal("Durasi harus 15–240 menit, atau dikosongkan.", dari);

  const jenis = await jenisKelasById(pg, class_type_id);
  if (!jenis) keJadwal("Jenis kelas tidak ditemukan.", dari);
  const kursiBerlaku = kapasitas ?? jenis.kapasitas_default;
  const durasiBerlaku = durasi ?? jenis.durasi_menit;

  const studio = await setelanLengkap(pg);

  // BR-7.6 untuk kelas sekali jalan. Jam dindingnya baru jadi timestamptz di
  // dalam Postgres (BR-7.5), jadi tanggal + jam diubah lebih dulu lewat query
  // yang sama polanya — menebak offset di JavaScript adalah cara paling rapi
  // untuk meleset satu jam dua kali setahun di zona yang punya DST.
  const [{ mulai_rencana }] = await pg<{ mulai_rencana: string | Date }[]>`
    select (${tanggal}::date + ${jam}::time) at time zone 'Asia/Jakarta'
             as mulai_rencana`;
  const rencana = saat(mulai_rencana);

  const benturan = sesiBentrok(
    {
      mulai_at: rencana,
      durasi_menit: durasiBerlaku,
      class_type_id,
      coach_id: String(formData.get("coach_id") ?? "") || null,
    },
    await sesiSekitar(pg, rencana, durasiBerlaku),
  );
  if (benturan.ada) {
    const l = benturan.lawan;
    const kapan = `${hariWib(l.mulai_at)} pukul ${jamWib(l.mulai_at)}`;
    keJadwal(
      benturan.sebab === "kelas"
        ? `Bentrok dengan kelas ${kapan} yang jenis kelasnya sama. Dua kelas serentak berarti alatnya dipakai dua kali — di kelas berkursi satu, dua orang akan datang untuk kursi yang sama.`
        : `Bentrok dengan kelas ${kapan} yang pelatihnya sama. Satu orang tidak bisa mengajar dua kelas sekaligus.`,
      dari,
    );
  }

  const mulai = await buatSesiManual(pg, {
    studio_id: studio.id,
    class_type_id,
    coach_id: String(formData.get("coach_id") ?? "") || null,
    tanggal,
    jam,
    durasi_menit: durasiBerlaku,
    kapasitas: kursiBerlaku,
  });

  revalidatePath("/admin/jadwal");
  revalidatePath("/jadwal");
  keJadwal(
    `${jenis.nama} ${hariWib(mulai)} pukul ${jamWib(mulai)} — ` +
      `${kursiBerlaku} kursi, ${durasiBerlaku} menit.`,
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
