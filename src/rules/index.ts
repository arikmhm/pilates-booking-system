// Aturan bisnis = fungsi murni: input → keputusan, tanpa db dan tanpa async.
// Sumber: docs/04-flows.md (Alur 1-8), docs/02-rules.md (BR-1 … BR-6).
// Titik rawan 1 (kapasitas) dijaga database, bukan di sini — src/db/kapasitas.test.ts.

/* Tipe masukan sengaja bentuk minimal, bukan baris Drizzle: begitu rules
   mengimpor skema, test butuh database lagi. */

export type Setelan = {
  booking_opens_days: number;
  booking_closes_hours: number;
  cancel_window_hours: number;
  waitlist_max: number;
};

export type Sesi = {
  id: string;
  class_type_id: string;
  status: "scheduled" | "cancelled";
  mulai_at: Date;
  durasi_menit: number;
};

/** Satu paket milik member. `sisa_kredit` = SUM(credit_ledger.delta) — BR-1.7. */
export type PaketMember = {
  id: string;
  hangus_at: Date;
  sisa_kredit: number;
  class_type_ids: string[]; // dari package_class_types — BR-1.4
};

export type BookingAktif = {
  session_id: string;
  mulai_at: Date;
  durasi_menit: number;
};

const JAM = 3_600_000;
const HARI = 24 * JAM;

const selisihJam = (a: Date, b: Date) => (a.getTime() - b.getTime()) / JAM;

/** Dua rentang waktu tumpang tindih — BR-2.5. Sentuhan ujung bukan bentrok. */
export function bentrok(
  aMulai: Date,
  aMenit: number,
  bMulai: Date,
  bMenit: number,
): boolean {
  const aSelesai = aMulai.getTime() + aMenit * 60_000;
  const bSelesai = bMulai.getTime() + bMenit * 60_000;
  return aMulai.getTime() < bSelesai && bMulai.getTime() < aSelesai;
}

/* ── Slot mingguan yang saling menabrak — BR-7.6 ──────────────────────────
   Dijaga di sisi jadwal, bukan booking: yang salah jadwalnya, bukan member. */

export type SlotMingguan = {
  /** 1 = Senin … 7 = Minggu. */
  hari: number;
  /** Jam dinding WIB "HH:MM". */
  jam_mulai: string;
  durasi_menit: number;
  class_type_id: string;
  coach_id: string | null;
};

export type Sebab = "kelas" | "coach";

export type Benturan<T> = { ada: false } | { ada: true; sebab: Sebab; lawan: T };

/** Jenis kelas sama = alatnya dipakai dua kali; pelatih sama = orangnya.
 *  `coach_id` null berarti belum ditentukan, jadi tidak pernah menabrak. */
function sebabBentur(
  baru: { class_type_id: string; coach_id: string | null },
  lawan: { class_type_id: string; coach_id: string | null },
): Sebab | null {
  if (lawan.class_type_id === baru.class_type_id) return "kelas";
  if (baru.coach_id && lawan.coach_id === baru.coach_id) return "coach";
  return null;
}

const MENIT_MINGGU = 7 * 24 * 60;

/** Menit sejak Senin 00.00 WIB. */
function menitMinggu(s: SlotMingguan): number {
  const [jam, menit] = s.jam_mulai.split(":").map(Number);
  return (s.hari - 1) * 1440 + jam * 60 + menit;
}

/** Tumpang tindih pada garis waktu minggu yang melingkar. Geser ±1 minggu
 *  menangkap lipatan Minggu 23.30 → Senin 00.00 tanpa cabang khusus. */
function tumpangTindih(a: SlotMingguan, b: SlotMingguan): boolean {
  const aMulai = menitMinggu(a);
  const aSelesai = aMulai + a.durasi_menit;
  const bMulai = menitMinggu(b);
  const bSelesai = bMulai + b.durasi_menit;
  return [-MENIT_MINGGU, 0, MENIT_MINGGU].some(
    (geser) => aMulai < bSelesai + geser && bMulai + geser < aSelesai,
  );
}

/** BR-7.6 — `yangAda` harus sudah disaring ke slot yang masih berlaku; slot
 *  yang dihentikan tidak menerbitkan sesi, jadi tidak boleh memblokir. */
export function slotBentrok(
  baru: SlotMingguan,
  yangAda: SlotMingguan[],
): Benturan<SlotMingguan> {
  for (const lawan of yangAda) {
    if (!tumpangTindih(baru, lawan)) continue;
    const sebab = sebabBentur(baru, lawan);
    if (sebab) return { ada: true, sebab, lawan };
  }
  return { ada: false };
}

export type SesiTerjadwal = {
  mulai_at: Date;
  durasi_menit: number;
  class_type_id: string;
  coach_id: string | null;
};

/** BR-7.6 untuk kelas sekali jalan: tanggalnya pasti, jadi pakai `bentrok()`
 *  biasa. `yangAda` termasuk sesi yang lahir dari slot mingguan. */
export function sesiBentrok(
  baru: SesiTerjadwal,
  yangAda: SesiTerjadwal[],
): Benturan<SesiTerjadwal> {
  for (const lawan of yangAda) {
    if (!bentrok(baru.mulai_at, baru.durasi_menit, lawan.mulai_at, lawan.durasi_menit))
      continue;
    const sebab = sebabBentur(baru, lawan);
    if (sebab) return { ada: true, sebab, lawan };
  }
  return { ada: false };
}

/* ── Titik rawan 2 · pilih kredit yang paling cepat hangus ────────────────
   BR-1.4, BR-1.5, BR-1.7 · Alur 2                                          */

/** Paket mana yang dipakai untuk satu kelas, `null` kalau tidak ada.
 *  Urut `hangus_at` menaik itu wajib: yang hampir hangus dipakai duluan. */
export function pilihPaket(
  paket: PaketMember[],
  class_type_id: string,
  sekarang: Date,
): PaketMember | null {
  const layak = paket.filter(
    (p) =>
      p.hangus_at > sekarang && // BR-1.6 — sudah lewat tanggal hangus, buang
      p.sisa_kredit > 0 && // BR-1.7 — sisa dari buku besar, bukan kolom saldo
      p.class_type_ids.includes(class_type_id), // BR-1.4 — Mat ≠ Reformer
  );
  if (layak.length === 0) return null;

  // Tie-break `id` supaya urutannya sama tiap kali dijalankan.
  return layak.sort(
    (a, b) =>
      a.hangus_at.getTime() - b.hangus_at.getTime() || a.id.localeCompare(b.id),
  )[0];
}

/* ── Alur 1 · boleh booking atau tidak — BR-2.1 … BR-2.7 ──────────────── */

export const KODE_TOLAK = ["X1", "X2", "X3", "X4", "X5", "X7"] as const;
export type KodeTolak = (typeof KODE_TOLAK)[number];

// Teks final — 04-flows.md Alur 1, tabel pesan penolakan.
export const PESAN_TOLAK: Record<KodeTolak, string> = {
  X1: "Kelas ini sudah dibatalkan.",
  X2: "Booking dibuka 7 hari sebelum kelas dan ditutup 1 jam sebelum mulai.",
  X3: "Kamu sudah terdaftar di kelas ini.",
  X4: "Kamu sudah punya kelas lain di jam yang sama.",
  X5: "Kredit kamu habis atau sudah lewat masa berlaku.",
  X7: "Paket kamu tidak berlaku untuk jenis kelas ini.",
};

export type KeputusanBooking =
  | { boleh: true; paket: PaketMember }
  | { boleh: false; kode: KodeTolak; pesan: string };

const tolak = (kode: KodeTolak): KeputusanBooking => ({
  boleh: false,
  kode,
  pesan: PESAN_TOLAK[kode],
});

/** Cek termurah dan paling sering gagal duluan. Kapasitas tidak dicek di
 *  sini sama sekali — BR-2.3 dijaga INSERT atomik di database. */
export function bolehBooking(args: {
  sesi: Sesi;
  setelan: Setelan;
  paket: PaketMember[];
  booking_aktif: BookingAktif[];
  sekarang: Date;
}): KeputusanBooking {
  const { sesi, setelan, paket, booking_aktif, sekarang } = args;

  if (sesi.status !== "scheduled") return tolak("X1");

  // BR-2.1 — jendela booking
  const bukaSejak = new Date(
    sesi.mulai_at.getTime() - setelan.booking_opens_days * HARI,
  );
  const tutupPada = new Date(
    sesi.mulai_at.getTime() - setelan.booking_closes_hours * JAM,
  );
  if (sekarang < bukaSejak || sekarang >= tutupPada) return tolak("X2");

  // BR-2.4 — satu member maks satu booking aktif per sesi
  if (booking_aktif.some((b) => b.session_id === sesi.id)) return tolak("X3");

  // BR-2.5 — bentrok jam dengan booking lain
  const adaBentrok = booking_aktif.some((b) =>
    bentrok(sesi.mulai_at, sesi.durasi_menit, b.mulai_at, b.durasi_menit),
  );
  if (adaBentrok) return tolak("X4");

  // BR-2.7 — tidak punya kredit valid
  const terpilih = pilihPaket(paket, sesi.class_type_id, sekarang);
  if (!terpilih) {
    // X7 dibedakan dari X5: punya kredit hidup tapi jenis kelasnya tidak
    // tercakup (BR-1.4) butuh pesan sendiri, bukan "kredit habis".
    const punyaKreditHidup = paket.some(
      (p) => p.hangus_at > sekarang && p.sisa_kredit > 0,
    );
    return tolak(punyaKreditHidup ? "X7" : "X5");
  }

  return { boleh: true, paket: terpilih };
}

/** BR-4.1 — waitlist penuh (X6 di Alur 1). */
export function bolehIkutWaitlist(
  jumlah_antre: number,
  setelan: Setelan,
): { boleh: boolean; pesan?: string } {
  return jumlah_antre < setelan.waitlist_max
    ? { boleh: true }
    : { boleh: false, pesan: "Daftar tunggu sudah penuh. Coba kelas lain." };
}

/* ── Titik rawan 3 dan 4 · pembatalan oleh member ─────────────────────────
   BR-3.1 … BR-3.5 · Alur 3                                                 */

export type BookingDibatalkan = {
  member_package_id: string;
  /** Diisi kalau kursi ini didapat dari waitlist — penanda BR-3.5. */
  dipromosikan_at: Date | null;
};

export type HasilPembatalan =
  | { boleh: false; pesan: string }
  /** Titik rawan 4: batal telat TIDAK menulis baris ledger apa pun. */
  | { boleh: true; kredit_kembali: false }
  /** Titik rawan 3: kredit kembali ke paket ASAL, hangus_at tidak berubah. */
  | {
      boleh: true;
      kredit_kembali: true;
      ke_paket: string;
      delta: 1;
      alasan: "batal_tepat_waktu";
    };

/** Dua kesalahan termahal: (1) batal telat TIDAK menulis ledger — kredit
 *  sudah dipotong saat booking, menulis −1 lagi memotong dua kali; (2) kredit
 *  kembali ke paket ASAL, kalau paket baru masa berlaku bisa diperpanjang. */
export function hasilPembatalan(args: {
  booking: BookingDibatalkan;
  sesi: Sesi;
  setelan: Setelan;
  sekarang: Date;
}): HasilPembatalan {
  const { booking, sesi, setelan, sekarang } = args;

  // BR-3.4 — lewat jam mulai, tidak bisa batal; job no-show yang mengambil alih
  if (sekarang >= sesi.mulai_at) {
    return {
      boleh: false,
      pesan: "Kelas sudah dimulai. Pembatalan tidak bisa lagi dilakukan.",
    };
  }

  const kembali = (): HasilPembatalan => ({
    boleh: true,
    kredit_kembali: true,
    ke_paket: booking.member_package_id, // ← paket ASAL
    delta: 1,
    alasan: "batal_tepat_waktu",
  });

  // BR-3.5 — diukur dari KAPAN dia naik waitlist, bukan kapan membatalkan.
  if (
    booking.dipromosikan_at &&
    selisihJam(sesi.mulai_at, booking.dipromosikan_at) <
      setelan.cancel_window_hours
  ) {
    return kembali();
  }

  // BR-3.1 — masih di luar jendela
  if (selisihJam(sesi.mulai_at, sekarang) >= setelan.cancel_window_hours) {
    return kembali();
  }

  // BR-3.2 — batal telat: kredit dibiarkan hangus, tanpa baris ledger baru
  return { boleh: true, kredit_kembali: false };
}

/* ── Titik rawan 5 dan 6 · naikkan waitlist ───────────────────────────────
   BR-4.2 … BR-4.4, BR-3.5 · Alur 4                                         */

export type Antre = {
  id: string;
  user_id: string;
  paket: PaketMember[];
};

export type HasilPromosi = {
  /** null = tidak ada yang naik. */
  naik: {
    entry_id: string;
    user_id: string;
    paket_id: string;
    /** Titik rawan 6 — tanpa ini BR-3.5 tidak bisa dihitung. */
    dipromosikan_at: Date;
  } | null;
  /** Titik rawan 5 — ditandai `expired` (BR-4.4), antrean lanjut. */
  dilewati: string[];
};

/** Antrean harus sudah urut `created_at` menaik (BR-4.2, FIFO).
 *  Titik rawan 5: kredit tidak valid DILEWATI, bukan menghentikan antrean. */
export function naikkanWaitlist(args: {
  antrean: Antre[];
  sesi: Sesi;
  setelan: Setelan;
  sekarang: Date;
}): HasilPromosi {
  const { antrean, sesi, setelan, sekarang } = args;

  if (sesi.status !== "scheduled") return { naik: null, dilewati: [] };

  // BR-4.6 — booking sudah ditutup, tidak ada lagi yang dinaikkan
  const tutupPada = new Date(
    sesi.mulai_at.getTime() - setelan.booking_closes_hours * JAM,
  );
  if (sekarang >= tutupPada) return { naik: null, dilewati: [] };

  const dilewati: string[] = [];
  for (const calon of antrean) {
    const paket = pilihPaket(calon.paket, sesi.class_type_id, sekarang);
    if (!paket) {
      dilewati.push(calon.id); // BR-4.4 — tandai expired, lanjut berikutnya
      continue;
    }
    return {
      naik: {
        entry_id: calon.id,
        user_id: calon.user_id,
        paket_id: paket.id,
        dipromosikan_at: sekarang,
      },
      dilewati,
    };
  }
  return { naik: null, dilewati };
}

/* ── Titik rawan 7 · job hanguskan kredit harus idempoten ─────────────────
   BR-1.6 · Alur 7.2                                                        */

export type PaketUntukHangus = {
  id: string;
  hangus_at: Date;
  sisa_kredit: number;
  /** Sudah ada baris ledger `alasan = 'hangus'` untuk paket ini? */
  sudah_dihanguskan: boolean;
};

export type HasilPenghangusan =
  | { tulis: false }
  | { tulis: true; ke_paket: string; delta: number; alasan: "hangus" };

/** `sudah_dihanguskan` yang membuatnya idempoten: tanpa itu dua kali jalan
 *  menulis −sisa dua kali dan saldo member jadi negatif. */
export function hasilPenghangusan(
  paket: PaketUntukHangus,
  sekarang: Date,
): HasilPenghangusan {
  if (paket.sudah_dihanguskan) return { tulis: false }; // ← idempoten
  if (paket.hangus_at > sekarang) return { tulis: false };
  if (paket.sisa_kredit <= 0) return { tulis: false };
  return {
    tulis: true,
    ke_paket: paket.id,
    delta: -paket.sisa_kredit,
    alasan: "hangus",
  };
}

/* ── Titik rawan 8 · webhook pembayaran harus idempoten ───────────────────
   BR-8.1, BR-8.2 · Alur 8                                                  */

export type Pembayaran = {
  status: "pending" | "paid" | "expired" | "failed";
  hold_sampai: Date;
};

export type HasilPembayaran = {
  proses: boolean;
  alasan: "lunas" | "sudah_diproses" | "kedaluwarsa" | "tidak_berlaku";
};

/** Gateway sering mengirim webhook lebih dari sekali — tanpa cek `status`,
 *  member dapat kredit dobel. Tombol "Simulasi Bayar" ganda sama saja. */
export function bolehTerimaPembayaran(
  pembayaran: Pembayaran,
  sekarang: Date,
): HasilPembayaran {
  if (pembayaran.status === "paid")
    return { proses: false, alasan: "sudah_diproses" };
  if (pembayaran.status !== "pending")
    return { proses: false, alasan: "tidak_berlaku" };
  if (sekarang >= pembayaran.hold_sampai)
    return { proses: false, alasan: "kedaluwarsa" }; // BR-8.2
  return { proses: true, alasan: "lunas" };
}
