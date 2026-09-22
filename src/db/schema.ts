// Skema Drizzle — 12 tabel inti.
// Definisi lengkap (kolom, constraint, index) ada di docs/05-data-model.md.
// Belum ditulis: lihat STATUS.md "Berikutnya".
//
// Dua hal yang tidak boleh hilang saat menulisnya:
//   BR-2.3 — kapasitas dijaga partial unique index, bukan cek-lalu-insert
//   BR-1.7 — tidak ada kolom saldo; sisa kredit = SUM(credit_ledger.delta)
export {};
