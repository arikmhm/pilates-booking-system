# Sistem Booking Studio Pilates

Sistem booking kelas pilates untuk studio di Kudus, Jawa Tengah. Model booking
**class-based** — member memilih sesi yang sudah dijadwalkan studio, seperti memilih
kursi di bioskop.

**Tahap:** perancangan selesai, siap dibangun. Target pertama adalah **demo** untuk
presentasi ke pemilik studio, bukan produk jadi.

## Dokumen

| File | Isi |
|---|---|
| [docs/01-product.md](docs/01-product.md) | Masalah, pengguna, tujuan, ukuran keberhasilan, rilis, komersial, risiko |
| [docs/02-rules.md](docs/02-rules.md) | Konteks pasar, setelan default, 53 aturan bisnis, peta fitur demo vs real, lingkup demo |
| [docs/03-use-cases.md](docs/03-use-cases.md) | 44 use case per aktor, state diagram, sequence diagram |
| [docs/04-flows.md](docs/04-flows.md) | 12 alur keputusan: booking, pembatalan, waitlist, job otomatis |
| [docs/05-data-model.md](docs/05-data-model.md) | ERD, 12 tabel inti, constraint wajib, query kunci |
| [docs/06-architecture.md](docs/06-architecture.md) | Stack, alasan tiap pilihan, hosting, notifikasi, yang sengaja tidak dipakai |
| [AGENTS.md](AGENTS.md) | Invarian, konvensi penamaan, stack, aturan merawat dokumen — dibaca AI tiap sesi |
| [STATUS.md](STATUS.md) | Tahap sekarang, langkah berikutnya, keputusan terbuka, log perubahan |

Mulai dari `02-rules.md` kalau ingin tahu **apa** yang dibangun, `01-product.md` kalau
ingin tahu **kenapa**.

Keempat dokumen `docs/` saling merujuk lewat ID tetap: `BR-3.2`, `UC-S05`, `Alur 4`.

## Dua skenario yang dijual

| | Skenario | Nilai |
|---|---|---|
| A | Kredit dan masa berlaku | Hemat waktu — tidak perlu mengingat sisa sesi puluhan member |
| B | Kelas batal dan waitlist otomatis | Hasilkan uang — kursi kosong tetap terjual |

Skrip presentasi 5 menit ada di [docs/02-rules.md](docs/02-rules.md) bagian 6.3.
