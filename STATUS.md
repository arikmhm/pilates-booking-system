# Status Proyek

> Baca ini **lebih dulu** tiap sesi baru. Perbarui di akhir tiap sesi yang mengubah apa pun.

**Tahap:** 12 layar + 4 job terjadwal selesai · sisa latihan presentasi dan deploy
**Terakhir diperbarui:** 2026-09-22

---

## Sedang dikerjakan

Belum ada. Demo lengkap — enam layar dan empat job jalan. Berikutnya latihan
presentasi dan deploy.

## Berikutnya — tiga langkah pertama

1. Latihan skrip presentasi 5 menit dari ujung ke ujung, rekam video 90 detik
2. Deploy demo ke Vercel — `DATABASE_URL` sudah menunjuk Neon, `vercel.json` sudah
   memuat jadwal cron. `CRON_SECRET` harus diisi di environment Vercel
3. M2 panel konfirmasi (pemilih nomor alat) — sekarang alat masih ditentukan sistem

## Selesai

- [x] Riset pasar — 3 studio di Kudus, harga dan jadwal terpetakan
- [x] Model booking dipilih: class-based
- [x] 53 aturan bisnis `BR-1.1`–`BR-9.5`
- [x] Model data — 12 tabel inti, constraint, 4 query kunci
- [x] 46 use case, 12 alur keputusan
- [x] Lingkup demo: 38 dari 46 use case nyata, 11 layar
- [x] Stack dan arsitektur diputuskan
- [x] Notifikasi: email + tombol kirim-WA, WhatsApp API ditunda
- [x] Sistem desain — token, tipografi, komponen, status, pemetaan 6 layar
- [x] Scaffold Next.js 16 + Tailwind v4 + Drizzle + Postgres Docker, token desain terpasang
- [x] Halaman profil publik `/` — 10 pita, skala pemasaran, harga dari seed demo
- [x] Skema 12 tabel + migrasi pertama, 3 partial unique index dan 4 CHECK terpasang
- [x] Test integrasi kapasitas hijau — 20 booking paralel ke 8 kursi, tepat 8 berhasil
- [x] `src/rules/` — 8 titik rawan tertutup, 38 test, diverifikasi lewat mutasi
- [x] Seed demo deterministik — 40 member, 168 sesi, sesi penuh 8/8 + 3 antre, panel A1 5 orang
- [x] Layar M1 Jadwal + server action booking & waitlist, diuji ujung ke ujung di browser
- [x] Layar M3 Akun Saya + pembatalan → promosi waitlist otomatis (Alur 3 + Alur 4)
- [x] Layar A1 Dashboard — okupansi hari ini, panel kredit hangus + tombol WA, setelan bisa diubah
- [x] Layar A2 Detail sesi — kehadiran, koreksi no-show, Batalkan Kelas satuan & massal (Alur 5)
- [x] Layar A3 Detail member — dompet kredit, buku besar lengkap, koreksi manual (BR-1.8)
- [x] **Keenam layar demo selesai** — M1 M2* M3 A1 A2 A3 (*M2 masih ditentukan sistem)
- [x] Tombol Reset Demo — satu transaksi, id user tetap, presenter tidak terlempar keluar
- [x] Navigasi sidebar shadcn + kalender mingguan M1 (DS-31–DS-34)
- [x] **Lima layar pengelolaan**: direktori member (A4), pelatih & staf (A5),
      layanan & paket (A6), aturan jadwal (A7), laporan pemilik (O1), kelas coach (C1)
- [x] Peran owner dan coach dipisah dari admin — owner lihat omzet, admin tidak
- [x] Audit peran: 6 use case bertanda ✅ ternyata tanpa kode, semuanya ditutup
- [x] Booking & batal atas nama member (A2), berikan paket (A3), daftar tunggu di
      Akun Saya + tombol keluar, panel pesan terkirim (A8)
- [x] Syarat studio pindah ke owner: harga, setelan aturan, slot mingguan
- [x] **Empat job terjadwal** sebagai endpoint HTTP berpenjaga `CRON_SECRET` —
      idempotensinya diuji dengan menjalankan tiap job dua kali, dua penjaga baru
      pindah ke database

## Keputusan terbuka

| # | Hal | Memblokir apa | Cara selesaikan |
|---|---|---|---|
| 1 | Kapasitas reformer tiap studio | Angka seed yang meyakinkan | Hitung dari foto interior di Instagram |
| 2 | "Link in bio" KARVE mengarah ke mana | Apakah KARVE layak dikejar | Buka langsung |
| 3 | Batas batal 12 jam belum divalidasi | Tidak ada — default aman | Pertanyaan meeting pertama |
| 4 | Provider VPS | Baru perlu setelah deal | Bandingkan Biznet / IDCloudHost |
| 5 | API key Neon ber-scope akun ditulis ke 7 config agent | Tidak ada | Cabut yang tak terpakai: `neon api-keys revoke 3355921` |
| 6 | Pesan X5 dipakai untuk dua sebab berbeda | Tidak ada — kosmetik | Member berkredit 3 yang membuka kelas Mat dibilang "kredit kamu habis", padahal sebabnya BR-1.4. Perlu kode X7 sendiri? |

Tidak ada yang memblokir pembangunan demo.

## Jadwal

| Kapan | Apa |
|---|---|
| ~5 Okt 2026 | Demo selesai, video 90 detik direkam |
| Minggu 2–3 Okt 2026 | Mulai outreach — 20 DM |
| 2–3 minggu setelah deal | R1 produksi |

---

## Log

Terbaru di atas. Satu baris per perubahan.

| Tanggal | Perubahan |
|---|---|
| 2026-09-23 | Pesan setelah menambah slot mingguan sekarang menyebut **tanggal sesi pertamanya** — "8 sesi terbit, mulai Selasa, 29 September". Slot Selasa yang dibuat hari Rabu tidak punya sesi minggu ini, kalender membuka di minggu ini, dan "8 sesi terbit" saja terbaca sebagai gagal. Sekalian `berlaku_dari`/`berlaku_sampai` dipindah ke tanggal dinding WIB: `current_date` Postgres berjalan di UTC dan salah sehari antara 00.00–07.00 WIB (BR-7.5) |
| 2026-09-23 | Tombol **Reset Jadwal** di samping Reset Demo (A1): jadwal, booking, antrean, pesan, dan jejak ledger-nya dihapus, sementara aturan mingguan, katalog, dan paket member tetap — panggung kosong untuk memperagakan penerbitan jadwal dari nol. Kredit member kembali seperti saat dibeli tanpa kolom saldo yang perlu disetel (BR-1.7). Penjaganya sama dengan `seed()`: menolak jalan kalau studionya bukan studio demo. `reset.test.ts` menguji kelimanya, dan tiga mutasi sengaja dipasang untuk membuktikan testnya tidak hampa |
| 2026-09-22 | Penerbitan sesi berhenti jadi cron harian: `generate-sesi` dikeluarkan dari `vercel.json` dan dipicu tombol "Terbitkan sekarang" di kaki kartu Buat kelas (A7), lengkap dengan keadaan sekarang — berapa sesi terbit, sampai tanggal berapa. Jangka terbit (`generate_weeks_ahead`, 1–26 minggu) bisa diubah owner dari situ; admin hanya menekan tombolnya (DS-40). Endpoint-nya dibiarkan hidup supaya klien yang mau kembali ke otomatis cukup menambah satu baris crontab. Kolom kanan A7 melebar 26rem → 30rem |
| 2026-09-22 | Kalender jadwal (M1) ditata ulang: rentang tanggal, geser minggu, dan saringan alat jadi satu bilah di kiri atas; kalender memakai 8 dari 12 kolom dengan panel buat-kelas di sisanya; gulung mendatar dan menurun berhenti di tepi kalender, baris hari dan lajur jam menempel (DS-40). Saringan alat menjawab studio berlantai banyak — satu alat per ruang, dua sesi di jam yang sama. Formulir kelas sekali jalan dan slot mingguan digabung jadi satu komponen `BuatKelas` yang dipakai M1 dan A7, ~180 baris salinan di A7 dihapus |
| 2026-09-22 | Remah roti shadcn dipasang di bilah atas untuk semua layar, dihitung dari menu yang aktif supaya tidak bisa berbeda dengan sidebar (DS-38). Judul A4 yang cuma mengulang nama menu dihapus. Tombol kembali jadi `< Kembali` dan pulang ke halaman sebelumnya, bukan selalu dashboard (DS-39). Detail member ditata ulang: satu kartu profil di atas, lalu Berikan paket, Koreksi manual, dan Buku besar |
| 2026-09-22 | Direktori member (A4) dirapikan jadi tabel sungguhan: satu kolom satu atribut, tanggal ringkas `22 Okt 2026`, cari/halaman/jumlah-baris lewat URL tanpa JavaScript klien, kisi 8/4 dengan panel tindak lanjut di kanan, dan status kredit jadi bulatan warna bertooltip (DS-36, DS-37). Percobaan memakai TanStack data table untuk semua layar dibatalkan sebelum sempat di-commit — terlalu banyak sekaligus, dan satu layar dulu lebih benar |
| 2026-09-22 | Enam use case yang selama ini bertanda ✅ tanpa kode akhirnya dibangun: UC-A05/A06 (booking & batal atas nama member), UC-A13 (berikan paket), UC-A03/S06 (panel pesan terkirim — tabel `notifications` ditulis 4 tempat dan belum pernah dibaca layar mana pun), UC-M08 (keluar daftar tunggu; status `left` tidak pernah ditulis). Siklus hidup kursi dipindah ke `src/db/pesanan.ts` supaya jalur member dan admin benar-benar berbagi kode. Syarat studio — harga, setelan aturan, slot mingguan — pindah ke `pastikanOwner()` (DS-35) |
| 2026-09-22 | Menu dilengkapi jadi sistem utuh: direktori member (A4), pelatih & staf (A5), layanan & paket dengan pembuatan paket (A6), aturan jadwal + kelas sekali jalan (A7), laporan pemilik (O1), dan kelas coach (C1). Peran owner dipisah dari admin — omzet hanya untuk owner (BR-9.1), coach hanya baca (BR-9.4). Halaman Publik dikeluarkan dari menu member dan coach. Lima baris di peta Demo vs Real pindah dari ⬜ ke ✅/◐. Tidak ada tabel baru — semua layar ini membaca 12 tabel yang sudah ada, yang hilang cuma pintunya |
| 2026-09-22 | Empat job terjadwal jadi endpoint HTTP di `src/app/api/cron/`, logikanya di `src/db/job.ts`. Idempotensi diuji dengan menjalankan tiap job dua kali, dan dua penjaga baru dipindah ke database: `credit_ledger_hangus_key` (BR-1.6) dan `sessions_rule_mulai_key` (BR-7.1) — cek-lalu-tulis bocor di cron yang tumpang tindih, persis seperti pada kapasitas. Mutasi membuktikan testnya tidak kosong. Test integrasi dijalankan berurutan: dua berkas berbagi satu database dan saling menghapus fixture |
| 2026-09-22 | M1 jadi kalender mingguan ala Google Calendar (DS-32) — hari jadi kolom, jam jadi sumbu tegak, bisa geser ke minggu mana pun; daftar per hari tetap dipakai di HP. Layar tiga peran: member dapat tombol booking, staf dapat tautan ke detail sesi, coach hanya melihat. Isi dilebarkan penuh dan bilah atas dimepetkan kiri (DS-27), menu sidebar dipangkas per peran (DS-33). UC-A15 baru; aritmetika hari WIB pindah ke `waktu.ts` + test |
| 2026-09-22 | Navigasi pindah ke sidebar shadcn (`ui/sidebar.tsx`, sheet di HP). Token `--sidebar-*` dialiaskan ke palet sendiri, butir aktif pakai `primary` supaya tidak tertukar dengan hover, tinggi butir 48px (DS-11), teks pembaca layar diterjemahkan. `use-mobile` ditulis ulang pakai `useSyncExternalStore` dan `SidebarMenuSkeleton` dibuang — keduanya ditolak `react-hooks` lint. DS-31 |
| 2026-09-22 | **Bug tata letak besar diperbaiki**: nama token `--spacing-lg` dll. bertabrakan dengan skala container Tailwind, sehingga `max-w-lg` = 60px dan `max-w-md` = 40px. Semua layar member dan halaman masuk selama ini selebar 40–60px. Token diganti nama Indonesia, lebar isi jadi nilai eksplisit, ditambah test penjaga (DS-29, DS-30) |
| 2026-09-22 | Pembenahan tampilan kelima layar aplikasi: kerangka bersama (bilah atas + latar muted + kartu putih), primitif `Kartu`/`Tombol`/`Chip`/`Angka`, DS-26–DS-28. Sesi demo batas 12 jam tidak lagi dibuat manual — dulu bisa mendarat pukul 01.18 di jadwal |
| 2026-09-22 | Reset Demo jadi. Seed dipecah: `seed.ts` fungsi murni, `seed-cli.mts` pembungkus CLI. Id user dibuat tetap supaya reset tidak melempar presenter keluar. Paket jadi ESM (`"type": "module"`) — menghilangkan peringatan Node tiap seed dijalankan |
| 2026-09-22 | Layar A3 selesai — enam layar demo lengkap. Seed: kolom ditulis eksplisit di semua insert massal setelah bug yang sama menggigit kedua kali, dan satu bug laten ketahuan — sesi "dalam 8 jam" terpilih ganda sebagai "sesi penuh besok pagi" kalau seed dijalankan setelah ~16.00 WIB |
| 2026-09-22 | Layar A2 + Alur 5 lengkap (BR-5.1–5.6) sebagai satu pernyataan CTE. Ditemukan seed diam-diam membuang kolom `booking_id`: postgres.js menyimpulkan daftar kolom dari objek pertama, dan baris pertama tidak punya kolom itu. 405 baris ledger kehilangan tautannya tanpa galat apa pun |
| 2026-09-22 | Layar A1 Dashboard: okupansi hari ini, panel "kredit hangus ≤ 7 hari" dengan tombol kirim-WA, dan 3 setelan yang bisa diubah admin. Kontrol akses peran dipasang — member dan coach ditolak dari `/admin` |
| 2026-09-22 | Layar M3 + pembatalan dengan promosi waitlist (BR-3.3). Seed diperbaiki dua kali: ledger kini tertaut `booking_id` supaya riwayat menyebut kelasnya, dan kredit orang di antrean dijaga — sebelumnya ketiganya nol dan momen uang demo menit 3:00 tidak menaikkan siapa pun |
| 2026-09-22 | Layar M1 + server action booking/waitlist jalan. Query 5.1 pindah ke `src/db/booking.ts`, dipakai bersama oleh action dan test. Ditemukan: postgres.js tidak memparse `timestamptz` di runtime Next — normalisasi waktu sekarang milik lapisan `src/db/`, dicatat di AGENTS.md |
| 2026-09-22 | Seed demo `src/db/seed.mts` jalan di lokal dan Neon. Deterministik, tanggal relatif. Booking dibatasi jendela 7 hari (BR-2.1). Seed menolak jalan kalau menemukan studio yang bukan studio demo |
| 2026-09-22 | `src/rules/` ditulis sebagai fungsi murni: 7 titik rawan keputusan + 1 dijaga database. 38 test, semuanya dibuktikan lewat mutasi. Tabel titik rawan di 04-flows.md bagian 9 kini menyebut fungsi penjaganya |
| 2026-09-22 | Neon dipasang sebagai Postgres demo (`purple-moon-87115116`, Singapura). 12 tabel termigrasi ke branch `production`. Test dikunci ke `TEST_DATABASE_URL` lokal supaya `TRUNCATE` tidak pernah kena database sungguhan |
| 2026-09-22 | Skema 12 tabel ditulis dan dimigrasikan. ERD dilengkapi: `users.email` (login magic link, ketinggalan sejak 21 Sep) dan `studios.generate_weeks_ahead`. Tabel sesi login ditunda, dicatat di 05-data-model.md bagian 8 |
| 2026-09-22 | Ekstraksi mentah desain rujukan diarsipkan ke `docs/sumber/`, ditandai bukan sumber kebenaran |
| 2026-09-22 | Halaman profil publik `/` dibangun meniru gaya rujukan: pola pita berselang-seling, hero bertirai, tiga kartu paket. `07-design.md` bertambah bagian 8 dan DS-18–DS-25; DS-11 dipertegas ke semua tautan teks |
| 2026-09-22 | Proyek di-scaffold: Next.js 16, Tailwind v4, Drizzle + postgres.js, Vitest, Docker Compose Postgres. Token `07-design.md` terpasang di `globals.css`, font Plus Jakarta Sans + Instrument Serif. `check-docs.sh` diperbaiki agar melewati `node_modules` |
| 2026-09-22 | Sistem desain masuk `07-design.md` — token siap tempel, skala aplikasi dipisah dari skala pemasaran, warna status domain ditambahkan, font berbayar diganti Plus Jakarta Sans + Instrument Serif |
| 2026-09-22 | Notifikasi diubah: email + tombol kirim-WA di admin, WhatsApp API ditunda. Login jadi magic link email |
| 2026-09-22 | Arsitektur diputuskan — `06-architecture.md`. VPS per klien, Drizzle, demo di Vercel |
| 2026-09-22 | Dokumen dirombak: `AGENTS.md` dipisah dari `README.md`, dokumen perancangan pindah ke `docs/` |
| 2026-09-21 | Audit dokumen — 4 kontradiksi dan 2 angka salah diperbaiki |
| 2026-09-21 | PRD, alur, use case, model data, aturan bisnis ditulis |
