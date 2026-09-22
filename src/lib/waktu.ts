// BR-7.5 — timestamptz disimpan UTC, ditampilkan WIB. Satu-satunya tempat
// zona waktu disebut. Tidak ada tanggal bertipe string di mana pun.

const WIB = "Asia/Jakarta";

const fmt = (opsi: Intl.DateTimeFormatOptions, lokal = "id-ID") =>
  new Intl.DateTimeFormat(lokal, { timeZone: WIB, ...opsi });

const jamFmt = fmt({ hour: "2-digit", minute: "2-digit", hour12: false });
const hariFmt = fmt({ weekday: "long", day: "numeric", month: "long" });
const hariPendekFmt = fmt({ weekday: "short", day: "numeric", month: "short" });
const namaHariFmt = fmt({ weekday: "short" });
const tanggalFmt = fmt({ day: "numeric", month: "short" });
// "22 Sep 2026" — dipakai kolom tabel. Nama hari sengaja tidak ikut: di
// sebuah kolom tanggal, "Sen," cuma menambah lebar tanpa menambah jawaban.
const ringkasFmt = fmt({ day: "numeric", month: "short", year: "numeric" });
// en-CA memberi YYYY-MM-DD — kunci pengelompokan per hari WIB, bukan per hari UTC.
const kunciFmt = fmt({ year: "numeric", month: "2-digit", day: "2-digit" }, "en-CA");

export const jamWib = (d: Date) => jamFmt.format(d);
export const hariWib = (d: Date) => hariFmt.format(d);
export const hariPendekWib = (d: Date) => hariPendekFmt.format(d);
export const kunciHariWib = (d: Date) => kunciFmt.format(d);
export const namaHariWib = (d: Date) => namaHariFmt.format(d);
export const tanggalWib = (d: Date) => tanggalFmt.format(d);
export const tanggalRingkasWib = (d: Date) => ringkasFmt.format(d);

/* ── Aritmetika hari WIB ───────────────────────────────────────────────────
   Dipakai kalender mingguan untuk menempatkan blok dan menggeser minggu.
   Asia/Jakarta tetap UTC+7 sepanjang tahun — tidak ada DST sejak 1964 — jadi
   pergeseran 7 jam boleh ditulis sebagai konstanta. Jangan salin pola ini ke
   zona lain. */
const WIB_OFFSET = 7 * 3_600_000;

/** Menit sejak tengah malam WIB. */
export function menitHariWib(d: Date): number {
  const [jam, menit] = jamWib(d).split(/\D+/).map(Number);
  return (jam % 24) * 60 + menit;
}

/** Tengah malam WIB dari hari yang memuat `d`. */
export function awalHariWib(d: Date): Date {
  const [y, b, t] = kunciHariWib(d).split("-").map(Number);
  return new Date(Date.UTC(y, b - 1, t) - WIB_OFFSET);
}

/** Senin pukul 00.00 WIB dari minggu yang memuat `d`. */
export function awalMingguWib(d: Date): Date {
  const [y, b, t] = kunciHariWib(d).split("-").map(Number);
  const tengahMalamUtc = Date.UTC(y, b - 1, t);
  // getUTCDay(): 0 = Minggu. Kita mau 0 = Senin.
  const geser = (new Date(tengahMalamUtc).getUTCDay() + 6) % 7;
  return new Date(tengahMalamUtc - geser * 86_400_000 - WIB_OFFSET);
}

/** "dalam 3 jam" · "4 hari lagi" · "lewat". Untuk hitung mundur hangus. */
export function selisihManusiawi(target: Date, sekarang = new Date()): string {
  const menit = Math.round((target.getTime() - sekarang.getTime()) / 60_000);
  if (menit < 0) return "lewat";
  if (menit < 60) return `${menit} menit lagi`;
  const jam = Math.round(menit / 60);
  if (jam < 24) return `${jam} jam lagi`;
  return `${Math.round(jam / 24)} hari lagi`;
}

export const rupiah = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;
