# Spesifikasi — Sistem Booking Studio Pilates

> **Status:** Draft disepakati · **Terakhir diperbarui:** 2026-09-21
> **Cara pakai file ini:** sumber kebenaran tunggal untuk aturan bisnis dan lingkup.
> Setiap aturan punya ID tetap (`BR-x.y`) — rujuk ID-nya saat menulis kode, test, atau commit.
> Jangan ubah nomor ID yang sudah ada; tambahkan nomor baru di akhir grup.
>
> **Pendamping:** [05-data-model.md](05-data-model.md) — ERD, constraint, query inti · [03-use-cases.md](03-use-cases.md) — peta aktor dan use case · [04-flows.md](04-flows.md) — alur keputusan · [01-product.md](01-product.md) — tujuan, rilis, komersial.

---

## 1. Konteks

Sistem booking kelas untuk studio pilates. Model booking = **class-based**:
member memilih sesi yang sudah dijadwalkan studio (analogi: kursi bioskop),
bukan menentukan jamnya sendiri.

**Pasar:** Kudus, Jawa Tengah. Tiga studio terpantau (Holy Pilates, Meze, KARVE),
semuanya baru buka dalam ~3 bulan terakhir, semuanya menerima booking lewat WhatsApp.
Harga pasar reformer: drop-in 150–165k, paket 10 sesi 1.300–1.350k.
Semua studio memberlakukan **masa berlaku paket** — ini titik nyeri utama.

**Model bisnis:** jasa custom, sekali bayar, sistem milik klien. Garansi bug 3 bulan.

**Temuan lapangan yang membentuk aturan:** satu studio menjadwalkan ~33 dari 43 kelas
mingguannya ke satu coach. Ketergantungan ini yang melahirkan BR-5.4 — pembatalan massal
per coach per hari.

**Dua skenario yang dijual:**

| | Skenario | Nilai bagi owner |
|---|---|---|
| A | Kredit & masa berlaku | Hemat waktu — tidak perlu mengingat sisa sesi puluhan member |
| B | Kelas batal + waitlist otomatis | Hasilkan uang — kursi kosong tetap terjual |

---

## 2. Glosarium

| Istilah | Makna |
|---|---|
| **Jenis kelas** | Template kelas: Reformer, Tower, Chair, Mat. Punya kapasitas default. |
| **Aturan berulang** | Pola jadwal mingguan, mis. "Senin 07:30 Reformer, Coach A". |
| **Sesi** | Instance nyata suatu kelas pada tanggal & jam tertentu. **Ini yang dibooking.** |
| **Paket** | Sekumpulan kredit yang dibeli member, punya tanggal hangus & daftar jenis kelas yang diizinkan. |
| **Kredit** | Hak ikut 1 kelas. Melekat pada paket asalnya. |
| **Buku besar** | Catatan setiap perubahan kredit (±, alasan, waktu, pelaku). Saldo = jumlah buku besar. |
| **Hangus** | Kredit tidak bisa dipakai lagi (masa berlaku habis / batal telat / no-show). |
| **Waitlist** | Antrian member saat sesi penuh. |
| **Naik (promote)** | Member waitlist otomatis mendapat kursi saat ada yang batal. |

---

## 3. Setelan default

| Kunci | Nilai | Owner bisa ubah |
|---|---|:--:|
| `cancel_window_hours` | **12** jam sebelum kelas | ✅ |
| `booking_opens_days` | **7** hari sebelum kelas | ✅ |
| `booking_closes_hours` | **1** jam sebelum kelas mulai | ✅ |
| `studio_cancel_extension_days` | **+7** hari | ✅ |
| `waitlist_max` | **5** orang per sesi | ✅ |
| `noshow_after_hours` | **2** jam setelah kelas selesai | ⬜ |
| `payment_hold_minutes` *(real)* | **15** menit | ⬜ |
| `timezone` | Simpan UTC, tampilkan WIB | ⬜ |
| `generate_weeks_ahead` | **8** minggu | ⬜ |

**Seed demo:** studio "Studio Pilates Kenari" · kapasitas Reformer 8 / Tower 6 / Mat 12 ·
grid 70 menit · harga drop-in 150k, 4 sesi 560k (1 bln), 10 sesi 1.350k (2 bln).

---

## 4. Aturan bisnis

Kolom terakhir: **D** = ditegakkan di demo · **R** = hanya versi real.

### BR-1 · Kredit & paket

| ID | Aturan | |
|---|---|:--:|
| 1.1 | 1 kelas = 1 kredit | D |
| 1.2 | Kredit melekat pada paket; tiap paket punya tanggal hangus sendiri | D |
| 1.3 | Masa berlaku dihitung dari **tanggal pembelian**, bukan pemakaian pertama | D |
| 1.4 | Paket menentukan **jenis kelas yang boleh diikuti** (kredit Mat tidak bisa dipakai di Reformer) | D |
| 1.5 | Punya >1 paket aktif → pakai yang **paling cepat hangus** duluan | D |
| 1.6 | Kredit hangus otomatis pada tanggal hangus; hanya pulih lewat koreksi admin | D |
| 1.7 | Setiap perubahan kredit masuk **buku besar**; saldo = jumlah buku besar, bukan kolom tersimpan | D |
| 1.8 | Admin bisa koreksi manual ±, **wajib isi alasan** | D |
| 1.9 | Kredit tidak bisa dipindah antar member | D |

### BR-2 · Booking

| ID | Aturan | |
|---|---|:--:|
| 2.1 | Hanya bisa booking dalam jendela `booking_opens_days` s/d `booking_closes_hours` | D |
| 2.2 | Kredit dipotong **saat booking**, bukan saat hadir | D |
| 2.3 | **Kapasitas keras** — dijamin di lapisan database, bukan kode aplikasi | D |
| 2.4 | Satu member maks 1 booking aktif per sesi | D |
| 2.5 | Tidak bisa booking dua sesi yang jamnya bentrok | D |
| 2.6 | Member pilih nomor alat; jika tidak memilih, sistem yang menentukan | D |
| 2.7 | Tidak punya kredit valid → booking ditolak, diarahkan beli paket | D |

### BR-3 · Pembatalan oleh member

| ID | Aturan | |
|---|---|:--:|
| 3.1 | Batal **≥ `cancel_window_hours`** → kredit kembali ke **paket asal**, tanggal hangus **tidak berubah** | D |
| 3.2 | Batal **< `cancel_window_hours`** → kredit **hangus** | D |
| 3.3 | Kursi dilepas seketika di kedua kasus; waitlist langsung diproses | D |
| 3.4 | Lewat jam mulai → tidak bisa batal, otomatis jadi no-show | D |
| 3.5 | Member yang **naik dari waitlist** < `cancel_window_hours` sebelum kelas → bebas batal tanpa hangus | D |

> Kredit wajib kembali ke paket asal dengan tanggal hangus asli. Kalau tidak,
> member bisa booking–batal berulang untuk memperpanjang masa berlaku.

### BR-4 · Waitlist

| ID | Aturan | |
|---|---|:--:|
| 4.1 | Aktif saat sesi penuh, maks `waitlist_max` orang | D |
| 4.2 | Urutan murni siapa cepat dia dapat (FIFO) | D |
| 4.3 | Kursi kosong → nomor 1 naik **otomatis**, kredit dipotong, notifikasi terkirim | D |
| 4.4 | Kredit tidak valid saat naik → dilewati, lanjut ke berikutnya | D |
| 4.5 | Selama masih di waitlist, kredit **tidak** dipotong | D |
| 4.6 | Waitlist ditutup bersamaan dengan booking; sisanya dibatalkan + diberi tahu | D |
| 4.7 | Keluar waitlist bebas, tanpa konsekuensi | D |

### BR-5 · Pembatalan oleh studio

| ID | Aturan | |
|---|---|:--:|
| 5.1 | Semua kredit **kembali penuh**, berapa pun jam pembatalannya | D |
| 5.2 | Paket yang hangus dalam < 7 hari → diperpanjang `studio_cancel_extension_days` | D |
| 5.3 | Waitlist ikut dibatalkan dan diberi tahu | D |
| 5.4 | Bisa batal **per sesi** atau **massal** (semua sesi satu coach dalam satu hari) | D |
| 5.5 | Wajib isi alasan; tercatat | D |
| 5.6 | Sesi yang sudah lewat tidak bisa dibatalkan | D |

### BR-6 · Kehadiran

| ID | Aturan | |
|---|---|:--:|
| 6.1 | Admin centang hadir di layar sesi | D |
| 6.2 | Tidak dicentang sampai `noshow_after_hours` setelah selesai → **no-show otomatis** | D |
| 6.3 | No-show → kredit hangus (sudah terpotong saat booking, tidak dikembalikan) | D |
| 6.4 | Admin bisa koreksi no-show, wajib isi alasan | D |

### BR-7 · Jadwal & kapasitas

| ID | Aturan | |
|---|---|:--:|
| 7.1 | Jadwal disimpan sebagai **aturan berulang mingguan**; sesi nyata di-generate `generate_weeks_ahead` ke depan | D |
| 7.2 | Kapasitas berasal dari jenis kelas, bisa ditimpa per sesi | D |
| 7.3 | Ubah aturan berulang **hanya** memengaruhi sesi yang belum ada booking-nya; sesi yang sudah ada booking ditangani manual lewat BR-5 | R |
| 7.4 | Hari libur / blackout → sesi tidak dibuat, atau dibatalkan lewat BR-5 | R |
| 7.5 | Semua waktu disimpan UTC, ditampilkan WIB | D |

### BR-8 · Uang

| ID | Aturan | |
|---|---|:--:|
| 8.1 | Kredit masuk **setelah** pembayaran lunas | R |
| 8.2 | Paket di-hold `payment_hold_minutes`; lewat itu dilepas | R |
| 8.3 | Drop-in = paket 1 sesi berlaku 7 hari (bukan mekanisme terpisah) | D |
| 8.4 | Tidak ada refund uang — hanya kredit | R |
| 8.5 | Semua transaksi tercatat permanen | R |

### BR-9 · Peran & akses

| ID | Peran | Hak | |
|---|---|---|:--:|
| 9.1 | Member | Lihat jadwal, booking, batal, waitlist, lihat kredit sendiri | D |
| 9.2 | Admin | Hak member **atas nama member** + absensi + batalkan sesi + koreksi kredit | D |
| 9.3 | Owner | Hak admin + ubah harga, jadwal, aturan, lihat pendapatan | R |
| 9.4 | Coach | Lihat jadwal & peserta kelasnya sendiri | R |
| 9.5 | — | Semua aksi admin/owner tercatat di audit log | R |

---

## 5. Peta fitur — Demo vs Real

**✅** ada · **◐** dipalsukan · **⬜** tidak ada

| Fitur | Demo | Real | Catatan |
|---|:--:|:--:|---|
| **Inti — dibangun sekali, dipakai dua-duanya** | | | |
| Jadwal kelas (tampilan HP) | ✅ | ✅ | |
| Booking + pilih nomor alat | ✅ | ✅ | BR-2 |
| Waitlist + naik otomatis | ✅ | ✅ | BR-4 |
| Dompet kredit + buku besar | ✅ | ✅ | BR-1 |
| Masa berlaku + hitung mundur | ✅ | ✅ | BR-1.2 |
| Aturan batal 12 jam | ✅ | ✅ | BR-3 |
| Panel "kredit hangus ≤ 7 hari" | ✅ | ✅ | Senjata utama presentasi |
| Batalkan sesi (satuan & massal) | ✅ | ✅ | BR-5 |
| Absensi + no-show otomatis | ✅ | ✅ | BR-6 |
| Detail member + koreksi kredit | ✅ | ✅ | BR-1.8 |
| Dashboard hari ini | ✅ | ✅ | Demo: angka dari seed |
| Kartu setelan aturan | ✅ | ✅ | Demo: 3 setelan saja |
| **Dipalsukan di demo** | | | |
| Login | ◐ | ✅ | Demo: tombol "Masuk sebagai…" · Real: magic link email. Admin bisa terbitkan link login untuk ditempel ke chat |
| Pembayaran | ◐ | ✅ | Demo: QR statis + "Simulasi Bayar" · Real: Midtrans/Xendit QRIS |
| Notifikasi | ◐ | ✅ | Demo: panel "Pesan Terkirim" (A8) dengan tombol kirim-WA untuk yang mendesak · Real: email untuk semua |
| Pendaftaran member baru | ◐ | ✅ | Demo: sudah ada di seed |
| Beli paket sendiri | ◐ | ✅ | Demo: kredit dari seed / ditambah admin |
| **Hanya di real** | | | |
| Kelola jadwal berulang | ✅ | ✅ | **Slot mingguan = owner**, kelas sekali jalan = admin (A7). Mengubah slot yang sudah jalan: hentikan lalu buat baru |
| Kelola paket & harga | ✅ | ✅ | **Kewenangan owner.** Buat paket baru, sembunyikan yang lama (A6); admin hanya melihat katalog. Harga paket lama tidak diubah — yang sudah beli memegang kreditnya |
| Kelola coach, ruang, alat | ◐ | ✅ | Demo: daftar pelatih & staf terlihat beserta bebannya (A5). Menambah orang butuh undangan email, satu paket dengan magic link |
| Hari libur / blackout | ⬜ | ✅ | BR-7.4 |
| Laporan pendapatan & okupansi | ✅ | ✅ | Pendapatan per bulan, okupansi, kehadiran, nilai kredit hangus (O1). Belum ada ekspor dan biaya operasional |
| Audit log | ⬜ | ✅ | BR-9.5 |
| Ekspor data & backup | ⬜ | ✅ | |
| Peran owner & coach terpisah | ✅ | ✅ | Owner memegang **syarat studio** — harga, batas pembatalan, jendela booking, slot mingguan — dan satu-satunya yang melihat Laporan (BR-9.1). Admin menjalankan sisanya. Coach punya layar sendiri, hanya baca (BR-9.4) |
| **Hanya di demo** | | | |
| Tombol Reset Demo | ✅ | ⬜ | Wajib — skenario diulang puluhan kali. Ada di A1, hanya muncul di database demo |
| Ganti identitas studio cepat | ✅ | ⬜ | Nama, logo, warna — personalisasi per prospek |

---

## 6. Lingkup demo

### 6.1 Layar

**Member (tampilan HP)**

| ID | Layar | Isi |
|---|---|---|
| M1 | Jadwal | Kalender mingguan di laptop, daftar per hari di HP · sisa kursi · blok jadi tombol "Booking" / "Penuh — Antre" · bisa geser minggu — `src/app/jadwal/` |
| M2 | Konfirmasi *(panel geser)* | Pilih nomor alat · info "1 kredit dipotong" · aturan batal tertulis |
| M3 | Akun Saya | **Sisa kredit + tanggal hangus + hitung mundur** · booking aktif · **daftar tunggu + tombol keluar** (BR-4.7) · riwayat kredit — `src/app/akun/` |

**Admin (tampilan laptop)**

| ID | Layar | Isi |
|---|---|---|
| A1 | Dashboard hari ini | Sesi hari ini + okupansi · **panel "kredit hangus ≤ 7 hari"** + tombol kirim-WA · kartu setelan — `src/app/admin/` |
| A2 | Detail sesi | Peserta · **daftarkan member** · **batalkan booking satu orang** · waitlist · centang kehadiran · tombol **Batalkan Kelas** — `src/app/admin/sesi/[id]/` |
| A3 | Detail member | Satu kartu profil (kontak, kredit aktif, paket yang masih hidup) · berikan paket · koreksi manual · buku besar lengkap — `src/app/admin/member/[id]/` |
| A4 | Direktori member | Tabel 7 kolom + cari, halaman, dan jumlah baris lewat URL · bulatan status kredit bertooltip (DS-36, DS-37) · panel tindak lanjut: kredit hangus ≤ 7 hari dan member yang lama tak datang — `src/app/admin/member/` |
| A5 | Pelatih & staf | Beban mengajar 7 hari · tombol chat-WA coach · siapa punya peran apa — `src/app/admin/tim/` |
| A6 | Layanan & paket | Jenis kelas · katalog paket + harga · **buat paket baru** · sembunyikan paket lama — `src/app/admin/layanan/` |
| A7 | Aturan jadwal | Slot mingguan *(owner)* · **kelas tambahan sekali jalan** *(admin)* — `src/app/admin/jadwal/` |
| A8 | Pesan terkirim | Jejak semua notifikasi · tombol kirim-WA untuk yang mendesak (BR-4.3, BR-5.3) — `src/app/admin/pesan/` |

**Owner (tampilan laptop)** — admin tidak melihat layar ini (BR-9.1)

| ID | Layar | Isi |
|---|---|---|
| O1 | Laporan | Pendapatan per bulan · okupansi · tingkat kehadiran · **nilai rupiah kredit yang hangus** — `src/app/admin/laporan/` |

**Coach (tampilan HP)** — hanya baca, absensi tetap milik admin (BR-9.4)

| ID | Layar | Isi |
|---|---|---|
| C1 | Kelas saya | Jadwal mengajar sendiri · daftar peserta tiap kelas + status kehadiran — `src/app/pelatih/` |

M3 adalah jantung skenario A. Panel kredit hangus di A1 = daftar orang yang harus di-chat hari ini.

### 6.2 Seed data

Diterapkan di `src/db/seed.mts` — `npm run db:seed`. Hasilnya deterministik (PRNG
berbenih tetap): demo yang tampil beda tiap reset adalah demo yang tidak bisa dilatih.

Semua tanggal **relatif terhadap hari ini**, bukan tanggal mati. Wajib ada:

- ~40 member (nama Jawa), sisa kredit bervariasi
- 3 member dengan kredit hangus dalam **2–6 hari** → untuk panel A1
- 1 sesi **besok pagi** yang **penuh 8/8 + waitlist 3 orang** → untuk skenario B
- 1 sesi **nanti malam** → untuk mendemokan batas 12 jam
- Riwayat campuran: hadir, no-show, batal tepat waktu, batal telat
- 2 coach, jadwal 4 minggu dengan okupansi bervariasi (penuh / hampir penuh / sepi)
- **Orang di daftar tunggu wajib punya kredit valid.** BR-4.4 melewati antrean yang
  kreditnya mati, jadi antrean tanpa kredit membuat pembatalan tidak menaikkan siapa
  pun — skenario B mati diam-diam. Seed menolak jalan kalau ini tidak terpenuhi.

Booking **hanya** dibuat untuk sesi dalam jendela `booking_opens_days` (7 hari). Mengisi
sesi tiga minggu lagi akan menampilkan keadaan yang BR-2.1 tidak izinkan terjadi —
sesi di luar jendela memang harus kosong.

### 6.3 Skrip demo — 5 menit

| Menit | Layar | Isi |
|---|---|---|
| 0–0:45 | *laptop tertutup* | "Member beli paket 10 sesi berlaku 2 bulan. Tiap orang tanggalnya beda. Kalau 80 member, siapa yang ingat 80 tanggal itu?" — **diam, tunggu jawaban** |
| 0:45–1:30 | M3 | "Ini yang dilihat member: sisa 6 sesi, hangus 14 Nov, 24 hari lagi. Tidak perlu tanya admin." |
| 1:30–2:15 | M1→M2→M3 | Booking kelas besok, pilih reformer no. 3. Kredit 6→5, riwayat bertambah. "Nol chat." |
| 2:15–3:00 | A1 | Tunjuk panel kredit hangus: "5 orang habis minggu ini. Sistemnya yang cari, bukan Kakak." |
| 3:00–4:15 | A2→M3 | **Momen uang.** Sesi penuh 8/8 + waitlist 3. Satu member batal → #1 naik otomatis, kredit terpotong, notifikasi terkirim. "Kursi itu tadinya hilang." |
| 4:15–4:45 | A2 | "Coach sakit." Klik Batalkan Kelas → 8 kredit kembali, 8 notifikasi. "Menggantikan 8 chat dan 8 hitungan manual." |
| 4:45–5:00 | A1 | "Batas 12 jam ini bisa Kakak ubah sendiri. Ini aturan Kakak." |

Menit pertama **tanpa laptop**. Buka dengan masalah mereka, bukan dengan layar.

---

## 7. Invarian — wajib benar walau cuma demo

Tiga invarian ada di [../AGENTS.md](../AGENTS.md). Ringkasnya: kapasitas dijaga index
database, kredit pakai buku besar, waktu disimpan UTC.

Selain ketiganya, boleh seadanya. Kelebihan booking di depan owner = kepercayaan habis
dalam 3 detik; sengketa kredit tanpa buku besar tidak bisa dibuktikan.

---

## 8. Di luar lingkup (fase 2, dijual terpisah)

Kelas private (booking jam bebas — model booking berbeda) · paket unlimited bulanan ·
multi-cabang · aplikasi mobile · penggajian coach · loyalty/referral · sinkronisasi kalender.

> Siapkan kolom `studio_id` di setiap tabel sejak awal. Satu kolom, hampir gratis sekarang,
> menyelamatkan penulisan ulang total kalau nanti perlu multi-cabang.

---

## 9. Keputusan terbuka

| # | Pertanyaan | Cara dapat jawabannya |
|---|---|---|
| 1 | Kapasitas nyata tiap studio (jumlah reformer) | Hitung dari foto interior di feed Instagram |
| 2 | "Link in bio" KARVE mengarah ke mana | Buka langsung — menentukan apakah KARVE layak dikejar |
| 3 | Isi trial pack KARVE 390k (berapa sesi) | Instagram / tanya langsung |
| 4 | Aturan pembatalan yang berlaku sekarang di tiap studio | Tanya saat meeting |
| 5 | Siapa pegang WhatsApp: owner atau admin | Tanya saat meeting |
| 6 | Berapa persen member punya email aktif | Tanya saat meeting — menentukan kapan WhatsApp API jadi wajib |

**Catatan waktu:** Holy Pilates sedang pre-sale (16–25 Sep 2026), kelas mulai 26 Sep.
Jangan datang minggu pembukaan. Target outreach: **minggu ke-2/ke-3 Oktober 2026**,
setelah mereka merasakan sendiri 2 minggu menangani booking lewat WhatsApp.

---

## 10. Etika kompetitor

Ketiga studio bersaing di kota yang sama. **Jangan pernah** mendemokan sistem berisi
data studio lain. Demo netral memakai "Studio Pilates Kenari"; personalisasi hanya
dengan data publik milik prospek itu sendiri, dan dihapus setelah presentasi.
