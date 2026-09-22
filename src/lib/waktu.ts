// BR-7.5 — timestamptz disimpan UTC, ditampilkan WIB. Satu-satunya tempat
// zona waktu disebut. Tidak ada tanggal bertipe string di mana pun.

const WIB = "Asia/Jakarta";

const fmt = (opsi: Intl.DateTimeFormatOptions, lokal = "id-ID") =>
  new Intl.DateTimeFormat(lokal, { timeZone: WIB, ...opsi });

const jamFmt = fmt({ hour: "2-digit", minute: "2-digit", hour12: false });
const hariFmt = fmt({ weekday: "long", day: "numeric", month: "long" });
const hariPendekFmt = fmt({ weekday: "short", day: "numeric", month: "short" });
// en-CA memberi YYYY-MM-DD — kunci pengelompokan per hari WIB, bukan per hari UTC.
const kunciFmt = fmt({ year: "numeric", month: "2-digit", day: "2-digit" }, "en-CA");

export const jamWib = (d: Date) => jamFmt.format(d);
export const hariWib = (d: Date) => hariFmt.format(d);
export const hariPendekWib = (d: Date) => hariPendekFmt.format(d);
export const kunciHariWib = (d: Date) => kunciFmt.format(d);

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
