# PRD — Sistem Booking Studio Pilates

> **Status:** Draft · **2026-09-21** · Pemilik: Arik
>
> **Dokumen ini sengaja pendek.** Aturan bisnis, model data, use case, dan alur
> sudah ada di [02-rules.md](02-rules.md), [05-data-model.md](05-data-model.md),
> [03-use-cases.md](03-use-cases.md), [04-flows.md](04-flows.md) — tidak diulang di sini.
> PRD ini hanya memuat yang **belum tertulis di mana pun**: masalah, tujuan,
> ukuran keberhasilan, rilis, komersial, risiko.

---

## 1. Masalah

Studio pilates di Kudus menerima booking lewat WhatsApp dan mencatat kredit member
di kepala atau di spreadsheet. Tiga studio terpantau (Holy, Meze, KARVE) semuanya
begitu, dan semuanya baru buka dalam ~3 bulan terakhir.

Dua akibat yang terukur:

| Masalah | Dampak |
|---|---|
| Booking manual, 6–8 chat per booking | ~150 chat/hari untuk studio 40 kelas/minggu |
| Masa berlaku paket berbeda tiap member | Mustahil diingat di atas ~50 member → salah hitung, sengketa, pendapatan bocor |
| Pembatalan mendadak coach | 40+ chat manual, kredit dikembalikan satu per satu, ada yang terlewat |
| Kursi kosong karena batal mendadak | Hilang begitu saja — tidak ada mekanisme waitlist |

---

## 2. Pengguna

| Peran | Frekuensi pakai | Yang dia pedulikan |
|---|---|---|
| **Owner** — pembeli | Mingguan | Pendapatan, okupansi, member yang mulai jarang datang |
| **Admin/resepsionis** — pemakai harian | Tiap hari, seharian | Kecepatan. Kalau lebih lambat dari WhatsApp, dia balik ke WhatsApp |
| **Member** — pemakai terbanyak | 2–3x/minggu | Sisa sesi, kapan hangus, dapat kursi atau tidak |

Owner yang membeli, tapi **admin yang menentukan sistem ini dipakai atau ditinggalkan.**

---

## 3. Tujuan

1. Booking berjalan tanpa chat — member booking sendiri, admin tidak mengetik apa pun.
2. Sisa kredit dan tanggal hangus terlihat sendiri oleh member dan oleh admin.
3. Kursi yang dilepas karena pembatalan otomatis terjual ke antrean.

## 4. Bukan tujuan

- Bukan aplikasi mobile — web responsive.
- Bukan SaaS multi-studio — satu klien, satu instance, sistem milik klien.
- Bukan pengganti WhatsApp untuk semua komunikasi — hanya untuk booking dan notifikasi.
- Bukan integrasi WhatsApp API di R1 — notifikasi lewat email, ditambah tombol kirim-WA manual di admin.
- Bukan sistem akuntansi, penggajian, atau CRM.
- Tidak menangani kelas private berjadwal bebas (model booking berbeda — fase 2).

---

## 5. Ukuran keberhasilan

### Tahap demo (Okt 2026)

| Metrik | Target |
|---|---|
| DM + video 90 detik terkirim | 20 studio |
| Balasan | 3–5 |
| Meeting/demo | 2 |
| Deal pertama | 1 |

Kalau 20 DM menghasilkan **nol balasan**, masalahnya bukan di produk — hentikan
pembangunan dan perbaiki pesan atau target.

### Tahap produk (3 bulan setelah live)

| Metrik | Target | Cara ukur |
|---|---|---|
| Booking lewat sistem, bukan WA | > 70% | Hitung `bookings.sumber = member` vs `admin` |
| Kursi diselamatkan waitlist | > 10/bulan | Hitung `bookings.sumber = waitlist` |
| Sengketa kredit | ~0 | Tanya admin |
| Admin masih pakai sistem di bulan ke-3 | Ya | Ada tidaknya login admin harian |

Metrik terakhir yang paling jujur. Kalau admin berhenti login, produknya gagal
berapa pun fiturnya.

---

## 6. Rilis

| | Rilis | Isi | Target |
|---|---|---|---|
| **R0** | Demo | 32 dari 45 use case, 12 tabel, seed relatif, tombol reset | ~5 Okt 2026 |
| **R1** | Produksi klien pertama | R0 + login + pembayaran + email + CRUD master data + audit log | 2–3 minggu setelah deal |
| **R2** | Fase 2 | Kelas private, paket unlimited, laporan lanjutan, multi-cabang | Dijual terpisah |

**Outreach dimulai minggu ke-2/ke-3 Oktober**, bukan lebih awal — Holy Pilates baru
buka 26 September dan butuh 2 minggu merasakan sendiri masalahnya lewat WhatsApp.

---

## 7. Komersial

| | |
|---|---|
| Model | Jasa custom, sekali bayar. Sistem milik klien |
| Garansi | Perbaikan bug **3 bulan** sejak serah terima |
| Di luar garansi | Fitur baru, perubahan aturan bisnis, integrasi tambahan — dihitung terpisah |
| Biaya berjalan | Hosting, domain, email — **ditanggung klien**, atas nama klien |
| Serah terima | Kode + database + akses hosting diserahkan ke klien |

Poin "biaya berjalan ditanggung klien" harus tertulis di proposal. Tanpa itu,
sekali bayar berubah jadi menanggung server orang selamanya.

---

## 8. Risiko

| Risiko | Mitigasi |
|---|---|
| Studio belum cukup nyeri untuk membayar | Tunggu sampai minggu 2 Oktober. Riset sosmed dulu sebelum bangun |
| KARVE sudah pakai tool lain | Cek "link in bio" mereka sebelum dikejar |
| Admin kembali ke WhatsApp | Panel admin harus lebih cepat dari mengetik chat. Uji dengan stopwatch |
| Owner minta fitur tak berujung | Lingkup R1 dikunci tertulis, R2 dijual terpisah |
| Pasar Kudus habis setelah 3 klien | Produk sama dipakai ulang di Semarang/Solo/Pati — di luar lingkup PRD ini |
| Member tidak baca email, lewat notifikasi mendesak | Tombol kirim-WA di admin untuk waitlist naik dan kelas batal. Panel admin menandai yang belum dibaca |
| WhatsApp API jadi wajib di kemudian hari | Verifikasi bisnis Meta makan waktu berminggu. Mulai prosesnya begitu klien pertama deal, jangan tunggu dibutuhkan |

---

## 9. Keputusan yang sudah dikunci

Ada di [02-rules.md](02-rules.md) — tidak diulang di sini:

- 9 setelan default (batas batal 12 jam, jendela booking 7 hari, dst.) → 02-rules.md bagian 3
- 53 aturan bisnis `BR-1.1` … `BR-9.5` → 02-rules.md bagian 4
- Peta fitur demo vs real → 02-rules.md bagian 5
- 5 layar demo + seed + skrip presentasi 5 menit → 02-rules.md bagian 6
- 5 pertanyaan yang masih terbuka → 02-rules.md bagian 9
