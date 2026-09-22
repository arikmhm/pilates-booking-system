# Status Proyek

> Baca ini **lebih dulu** tiap sesi baru. Perbarui di akhir tiap sesi yang mengubah apa pun.

**Tahap:** 6 layar + Reset Demo + sidebar selesai · sisa 4 job terjadwal
**Terakhir diperbarui:** 2026-09-22

---

## Sedang dikerjakan

Belum ada. Penyiapan proyek selesai, menunggu skema database ditulis.

## Berikutnya — tiga langkah pertama

1. Empat job terjadwal sebagai endpoint HTTP berpenjaga `CRON_SECRET`
   ([05-data-model.md](docs/05-data-model.md) bagian 6) — `hasilPenghangusan()`
   dan `naikkanWaitlist()` sudah siap dipakai
2. Latihan skrip presentasi 5 menit dari ujung ke ujung, rekam video 90 detik
3. Deploy demo ke Vercel — `DATABASE_URL` sudah menunjuk Neon

## Selesai

- [x] Riset pasar — 3 studio di Kudus, harga dan jadwal terpetakan
- [x] Model booking dipilih: class-based
- [x] 53 aturan bisnis `BR-1.1`–`BR-9.5`
- [x] Model data — 12 tabel inti, constraint, 4 query kunci
- [x] 45 use case, 12 alur keputusan
- [x] Lingkup demo dikunci: 32 use case nyata, 6 layar
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
