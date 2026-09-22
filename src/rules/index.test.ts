// Delapan titik rawan — docs/04-flows.md bagian 9.
// Titik 1 (INSERT booking atomik) dijaga database, diuji di
// src/db/kapasitas.test.ts. Tujuh sisanya keputusan murni, diuji di sini:
// tanpa database, tanpa server, tanpa seed.

import { describe, expect, test } from "vitest";
import {
  bentrok,
  bolehBooking,
  bolehIkutWaitlist,
  bolehTerimaPembayaran,
  hasilPembatalan,
  hasilPenghangusan,
  naikkanWaitlist,
  pilihPaket,
  type Antre,
  type PaketMember,
  type Sesi,
  type Setelan,
} from "./index";

const SEKARANG = new Date("2026-09-22T03:00:00Z"); // 10.00 WIB
const jam = (n: number) => new Date(SEKARANG.getTime() + n * 3_600_000);
const hari = (n: number) => jam(n * 24);

const SETELAN: Setelan = {
  booking_opens_days: 7,
  booking_closes_hours: 1,
  cancel_window_hours: 12,
  waitlist_max: 5,
};

const REFORMER = "ct-reformer";
const MAT = "ct-mat";

const sesi = (ubah: Partial<Sesi> = {}): Sesi => ({
  id: "ses-1",
  class_type_id: REFORMER,
  status: "scheduled",
  mulai_at: hari(2),
  durasi_menit: 70,
  ...ubah,
});

const paket = (ubah: Partial<PaketMember> = {}): PaketMember => ({
  id: "mp-1",
  hangus_at: hari(30),
  sisa_kredit: 5,
  class_type_ids: [REFORMER],
  ...ubah,
});

/* ══ Titik rawan 2 — urutan pakai kredit paling cepat hangus ════════════ */
describe("titik 2 · pilihPaket (BR-1.4, BR-1.5, BR-1.7)", () => {
  test("paket yang paling cepat hangus dipakai duluan", () => {
    const lama = paket({ id: "mp-lama", hangus_at: hari(60) });
    const dekat = paket({ id: "mp-dekat", hangus_at: hari(3) });
    // Urutan masukan sengaja terbalik — fungsinya yang harus mengurutkan.
    expect(pilihPaket([lama, dekat], REFORMER, SEKARANG)?.id).toBe("mp-dekat");
  });

  test("kredit Mat tidak bisa dipakai di kelas Reformer (BR-1.4)", () => {
    const mat = paket({ class_type_ids: [MAT] });
    expect(pilihPaket([mat], REFORMER, SEKARANG)).toBeNull();
  });

  test("paket yang sudah lewat hangus_at dibuang, walau sisanya banyak", () => {
    const mati = paket({ hangus_at: jam(-1), sisa_kredit: 99 });
    expect(pilihPaket([mati], REFORMER, SEKARANG)).toBeNull();
  });

  test("paket bersisa nol dibuang — sisa dari buku besar, bukan kolom saldo", () => {
    expect(pilihPaket([paket({ sisa_kredit: 0 })], REFORMER, SEKARANG)).toBeNull();
  });

  test("dua paket hangus di detik yang sama → hasilnya tetap sama tiap kali", () => {
    const a = paket({ id: "mp-a" });
    const b = paket({ id: "mp-b" });
    expect(pilihPaket([b, a], REFORMER, SEKARANG)?.id).toBe("mp-a");
    expect(pilihPaket([a, b], REFORMER, SEKARANG)?.id).toBe("mp-a");
  });
});

/* ══ Alur 1 — boleh booking ═════════════════════════════════════════════ */
describe("Alur 1 · bolehBooking (BR-2.1 … BR-2.7)", () => {
  const dasar = {
    sesi: sesi(),
    setelan: SETELAN,
    paket: [paket()],
    booking_aktif: [],
    sekarang: SEKARANG,
  };

  test("jalur normal → boleh, dengan paket terpilih", () => {
    const hasil = bolehBooking(dasar);
    expect(hasil.boleh).toBe(true);
    if (hasil.boleh) expect(hasil.paket.id).toBe("mp-1");
  });

  test("X1 kelas sudah dibatalkan", () => {
    const h = bolehBooking({ ...dasar, sesi: sesi({ status: "cancelled" }) });
    expect(h).toMatchObject({ boleh: false, kode: "X1" });
  });

  test("X2 booking belum dibuka — lebih dari 7 hari sebelum kelas", () => {
    const h = bolehBooking({ ...dasar, sesi: sesi({ mulai_at: hari(8) }) });
    expect(h).toMatchObject({ boleh: false, kode: "X2" });
  });

  test("X2 booking sudah ditutup — kurang dari 1 jam sebelum mulai", () => {
    const h = bolehBooking({
      ...dasar,
      sesi: sesi({ mulai_at: jam(0.5) }),
    });
    expect(h).toMatchObject({ boleh: false, kode: "X2" });
  });

  test("tepat 1 jam sebelum mulai sudah ditutup, 1 jam 1 menit masih boleh", () => {
    expect(
      bolehBooking({ ...dasar, sesi: sesi({ mulai_at: jam(1) }) }).boleh,
    ).toBe(false);
    expect(
      bolehBooking({ ...dasar, sesi: sesi({ mulai_at: jam(1.02) }) }).boleh,
    ).toBe(true);
  });

  test("X3 sudah terdaftar di sesi ini (BR-2.4)", () => {
    const h = bolehBooking({
      ...dasar,
      booking_aktif: [
        { session_id: "ses-1", mulai_at: hari(2), durasi_menit: 70 },
      ],
    });
    expect(h).toMatchObject({ boleh: false, kode: "X3" });
  });

  test("X4 bentrok jam dengan kelas lain (BR-2.5)", () => {
    const h = bolehBooking({
      ...dasar,
      booking_aktif: [
        // sesi lain, mulai 30 menit setelah sesi target → tumpang tindih
        {
          session_id: "ses-lain",
          mulai_at: new Date(hari(2).getTime() + 30 * 60_000),
          durasi_menit: 70,
        },
      ],
    });
    expect(h).toMatchObject({ boleh: false, kode: "X4" });
  });

  test("kelas yang mulai tepat saat kelas lain selesai bukan bentrok", () => {
    const h = bolehBooking({
      ...dasar,
      booking_aktif: [
        {
          session_id: "ses-lain",
          mulai_at: new Date(hari(2).getTime() - 70 * 60_000),
          durasi_menit: 70,
        },
      ],
    });
    expect(h.boleh).toBe(true);
  });

  test("X5 tidak punya kredit valid (BR-2.7)", () => {
    const h = bolehBooking({ ...dasar, paket: [] });
    expect(h).toMatchObject({ boleh: false, kode: "X5" });
  });

  test("X7 punya kredit hidup, tapi paketnya tidak mencakup kelas ini (BR-1.4)", () => {
    // Sebab yang sama sekali berbeda dengan X5, dan jalan keluarnya juga:
    // yang ini beli paket lain, bukan isi ulang. Menyebutnya "kredit habis"
    // mengirim member ke admin untuk menanyakan kredit yang jelas-jelas ada.
    const h = bolehBooking({ ...dasar, paket: [paket({ class_type_ids: [MAT] })] });
    expect(h).toMatchObject({ boleh: false, kode: "X7" });
  });

  test("kredit yang semuanya sudah hangus tetap X5, bukan X7", () => {
    // Batas antara keduanya adalah kredit HIDUP. Paket Mat yang sudah lewat
    // tanggal hangus tidak membuktikan member punya apa-apa untuk dipakai.
    const h = bolehBooking({
      ...dasar,
      paket: [paket({ class_type_ids: [MAT], hangus_at: jam(-1) })],
    });
    expect(h).toMatchObject({ boleh: false, kode: "X5" });
  });

  test("sesi batal dicek lebih dulu daripada kredit habis", () => {
    // Urutan pengecekan itu bagian dari spesifikasi: yang paling murah duluan.
    const h = bolehBooking({
      ...dasar,
      sesi: sesi({ status: "cancelled" }),
      paket: [],
    });
    expect(h).toMatchObject({ kode: "X1" });
  });

  test("bentrok() — sentuhan ujung ke ujung tidak dihitung tumpang tindih", () => {
    const a = new Date("2026-09-24T01:00:00Z");
    const b = new Date("2026-09-24T02:10:00Z");
    expect(bentrok(a, 70, b, 70)).toBe(false);
    expect(bentrok(a, 71, b, 70)).toBe(true);
  });

  test("X6 waitlist penuh (BR-4.1)", () => {
    expect(bolehIkutWaitlist(4, SETELAN).boleh).toBe(true);
    expect(bolehIkutWaitlist(5, SETELAN).boleh).toBe(false);
  });
});

/* ══ Titik rawan 3 dan 4 — pembatalan ═══════════════════════════════════ */
describe("titik 3 dan 4 · hasilPembatalan (BR-3.1 … BR-3.5)", () => {
  const booking = { member_package_id: "mp-asal", dipromosikan_at: null };

  test("titik 3 · kredit kembali ke paket ASAL, bukan paket baru", () => {
    const h = hasilPembatalan({
      booking,
      sesi: sesi({ mulai_at: hari(2) }),
      setelan: SETELAN,
      sekarang: SEKARANG,
    });
    expect(h).toEqual({
      boleh: true,
      kredit_kembali: true,
      ke_paket: "mp-asal", // ← kalau ini paket lain, masa berlaku bisa diakali
      delta: 1,
      alasan: "batal_tepat_waktu",
    });
  });

  test("titik 4 · batal telat TIDAK menulis baris ledger apa pun", () => {
    const h = hasilPembatalan({
      booking,
      sesi: sesi({ mulai_at: jam(5) }), // 5 jam lagi, jendela 12 jam
      setelan: SETELAN,
      sekarang: SEKARANG,
    });
    // Tidak ada `delta`, tidak ada `ke_paket`. Kredit sudah dipotong saat
    // booking; menulis −1 lagi memotong dua kali.
    expect(h).toEqual({ boleh: true, kredit_kembali: false });
  });

  test("tepat 12 jam masih kembali, 11 jam 59 menit sudah hangus", () => {
    const pada = (j: number) =>
      hasilPembatalan({
        booking,
        sesi: sesi({ mulai_at: jam(j) }),
        setelan: SETELAN,
        sekarang: SEKARANG,
      });
    expect(pada(12)).toMatchObject({ kredit_kembali: true });
    expect(pada(11.98)).toMatchObject({ kredit_kembali: false });
  });

  test("BR-3.4 · lewat jam mulai tidak bisa batal", () => {
    const h = hasilPembatalan({
      booking,
      sesi: sesi({ mulai_at: jam(-1) }),
      setelan: SETELAN,
      sekarang: SEKARANG,
    });
    expect(h.boleh).toBe(false);
  });

  test("BR-3.5 · naik dari waitlist 3 jam sebelum kelas → bebas batal", () => {
    const h = hasilPembatalan({
      booking: { member_package_id: "mp-asal", dipromosikan_at: jam(1) },
      sesi: sesi({ mulai_at: jam(4) }), // naik 3 jam sebelum kelas
      setelan: SETELAN,
      sekarang: jam(2),
    });
    expect(h).toMatchObject({ kredit_kembali: true, ke_paket: "mp-asal" });
  });

  test("BR-3.5 tidak berlaku kalau naiknya jauh sebelum jendela batal", () => {
    // Naik 3 hari sebelum kelas: dia punya banyak waktu untuk batal awal,
    // jadi batal telat tetap hangus.
    const h = hasilPembatalan({
      booking: { member_package_id: "mp-asal", dipromosikan_at: hari(-1) },
      sesi: sesi({ mulai_at: jam(5) }),
      setelan: SETELAN,
      sekarang: SEKARANG,
    });
    expect(h).toMatchObject({ kredit_kembali: false });
  });
});

/* ══ Titik rawan 5 dan 6 — naikkan waitlist ═════════════════════════════ */
describe("titik 5 dan 6 · naikkanWaitlist (BR-4.2 … BR-4.4)", () => {
  const antre = (id: string, p: PaketMember[]): Antre => ({
    id,
    user_id: `u-${id}`,
    paket: p,
  });

  test("titik 5 · kredit tidak valid dilewati, antrean lanjut ke berikutnya", () => {
    const hasil = naikkanWaitlist({
      antrean: [
        antre("w1", [paket({ sisa_kredit: 0 })]), // habis
        antre("w2", [paket({ hangus_at: jam(-1) })]), // hangus
        antre("w3", [paket({ class_type_ids: [MAT] })]), // jenis salah
        antre("w4", [paket()]), // ini yang naik
      ],
      sesi: sesi(),
      setelan: SETELAN,
      sekarang: SEKARANG,
    });
    // Berhenti di w1 berarti kursi kosong padahal antreannya empat orang.
    expect(hasil.naik?.entry_id).toBe("w4");
    expect(hasil.dilewati).toEqual(["w1", "w2", "w3"]);
  });

  test("titik 6 · dipromosikan_at diisi — tanpa ini BR-3.5 tidak bisa dihitung", () => {
    const hasil = naikkanWaitlist({
      antrean: [antre("w1", [paket()])],
      sesi: sesi(),
      setelan: SETELAN,
      sekarang: SEKARANG,
    });
    expect(hasil.naik?.dipromosikan_at).toEqual(SEKARANG);
  });

  test("semua antrean kreditnya mati → tidak ada yang naik, semua dilewati", () => {
    const hasil = naikkanWaitlist({
      antrean: [antre("w1", []), antre("w2", [])],
      sesi: sesi(),
      setelan: SETELAN,
      sekarang: SEKARANG,
    });
    expect(hasil.naik).toBeNull();
    expect(hasil.dilewati).toEqual(["w1", "w2"]);
  });

  test("sesi batal → tidak ada yang naik dan tidak ada yang ditandai expired", () => {
    const hasil = naikkanWaitlist({
      antrean: [antre("w1", [paket()])],
      sesi: sesi({ status: "cancelled" }),
      setelan: SETELAN,
      sekarang: SEKARANG,
    });
    expect(hasil).toEqual({ naik: null, dilewati: [] });
  });

  test("BR-4.6 · booking sudah ditutup → tidak ada promosi", () => {
    const hasil = naikkanWaitlist({
      antrean: [antre("w1", [paket()])],
      sesi: sesi({ mulai_at: jam(0.5) }),
      setelan: SETELAN,
      sekarang: SEKARANG,
    });
    expect(hasil.naik).toBeNull();
  });
});

/* ══ Titik rawan 7 — job hanguskan kredit idempoten ═════════════════════ */
describe("titik 7 · hasilPenghangusan (BR-1.6)", () => {
  const dasar = {
    id: "mp-1",
    hangus_at: jam(-1),
    sisa_kredit: 3,
    sudah_dihanguskan: false,
  };

  test("paket lewat tanggal dengan sisa 3 → tulis ledger −3", () => {
    expect(hasilPenghangusan(dasar, SEKARANG)).toEqual({
      tulis: true,
      ke_paket: "mp-1",
      delta: -3,
      alasan: "hangus",
    });
  });

  test("jalan kedua kalinya tidak menulis apa-apa", () => {
    // Inilah yang membuat cron ganda, retry, dan admin iseng tidak berbahaya.
    expect(
      hasilPenghangusan({ ...dasar, sudah_dihanguskan: true }, SEKARANG),
    ).toEqual({ tulis: false });
  });

  test("belum lewat tanggal hangus → tidak ditulis", () => {
    expect(hasilPenghangusan({ ...dasar, hangus_at: jam(1) }, SEKARANG)).toEqual(
      { tulis: false },
    );
  });

  test("sisa nol → tidak ditulis, tidak ada baris delta 0", () => {
    // credit_ledger punya CHECK (delta <> 0); menulis 0 akan ditolak database.
    expect(hasilPenghangusan({ ...dasar, sisa_kredit: 0 }, SEKARANG)).toEqual({
      tulis: false,
    });
  });
});

/* ══ Titik rawan 8 — webhook pembayaran idempoten ══════════════════════ */
describe("titik 8 · bolehTerimaPembayaran (BR-8.1, BR-8.2)", () => {
  test("pending dan masih dalam hold → diproses", () => {
    expect(
      bolehTerimaPembayaran(
        { status: "pending", hold_sampai: jam(0.2) },
        SEKARANG,
      ),
    ).toEqual({ proses: true, alasan: "lunas" });
  });

  test("webhook diulang pada pembayaran yang sudah paid → diabaikan", () => {
    // Tanpa ini member dapat kredit dobel tiap gateway mengirim ulang.
    expect(
      bolehTerimaPembayaran({ status: "paid", hold_sampai: jam(0.2) }, SEKARANG),
    ).toEqual({ proses: false, alasan: "sudah_diproses" });
  });

  test("hold 15 menit sudah lewat → tidak diproses (BR-8.2)", () => {
    expect(
      bolehTerimaPembayaran(
        { status: "pending", hold_sampai: jam(-0.1) },
        SEKARANG,
      ),
    ).toEqual({ proses: false, alasan: "kedaluwarsa" });
  });

  test("status expired atau failed tidak pernah diproses", () => {
    for (const status of ["expired", "failed"] as const) {
      expect(
        bolehTerimaPembayaran({ status, hold_sampai: jam(1) }, SEKARANG).proses,
      ).toBe(false);
    }
  });
});
