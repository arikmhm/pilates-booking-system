// Tombol kirim-WA — 06-architecture.md bagian 5. WhatsApp API resmi ditunda,
// jadi admin mengirim sendiri lewat tautan wa.me.

/** 08xx… → 628xx… WhatsApp menolak format nasional berawalan 0. */
export function nomorWa(telepon: string): string {
  const angka = telepon.replace(/\D/g, "");
  return angka.startsWith("0") ? `62${angka.slice(1)}` : angka;
}

export function tautanWa(telepon: string, pesan: string): string {
  return `https://wa.me/${nomorWa(telepon)}?text=${encodeURIComponent(pesan)}`;
}
