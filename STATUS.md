# Status Proyek

> Baca ini **lebih dulu** tiap sesi baru. Perbarui di akhir tiap sesi yang mengubah apa pun.

**Tahap:** seed demo jalan di Neon · siap membangun layar M1
**Terakhir diperbarui:** 2026-09-22

---

## Sedang dikerjakan

Belum ada. Penyiapan proyek selesai, menunggu skema database ditulis.

## Berikutnya — tiga langkah pertama

1. Layar M1 Jadwal + server action booking: baca db → panggil `bolehBooking()` →
   query 5.1 (pindahkan dari `src/db/kapasitas.test.ts`) → `credit_ledger` −1
2. Layar M3 Akun Saya — sisa kredit, hitung mundur hangus, riwayat ledger
3. Layar A1 Dashboard — panel "kredit hangus ≤ 7 hari" (5 orang sudah ada di seed)

## Selesai

- [x] Riset pasar — 3 studio di Kudus, harga dan jadwal terpetakan
- [x] Model booking dipilih: class-based
- [x] 53 aturan bisnis `BR-1.1`–`BR-9.5`
- [x] Model data — 12 tabel inti, constraint, 4 query kunci
- [x] 44 use case, 12 alur keputusan
- [x] Lingkup demo dikunci: 31 use case nyata, 5 layar
- [x] Stack dan arsitektur diputuskan
- [x] Notifikasi: email + tombol kirim-WA, WhatsApp API ditunda
- [x] Sistem desain — token, tipografi, komponen, status, pemetaan 6 layar
- [x] Scaffold Next.js 16 + Tailwind v4 + Drizzle + Postgres Docker, token desain terpasang
- [x] Halaman profil publik `/` — 10 pita, skala pemasaran, harga dari seed demo
- [x] Skema 12 tabel + migrasi pertama, 3 partial unique index dan 4 CHECK terpasang
- [x] Test integrasi kapasitas hijau — 20 booking paralel ke 8 kursi, tepat 8 berhasil
- [x] `src/rules/` — 8 titik rawan tertutup, 38 test, diverifikasi lewat mutasi
- [x] Seed demo deterministik — 40 member, 168 sesi, sesi penuh 8/8 + 3 antre, panel A1 5 orang

## Keputusan terbuka

| # | Hal | Memblokir apa | Cara selesaikan |
|---|---|---|---|
| 1 | Kapasitas reformer tiap studio | Angka seed yang meyakinkan | Hitung dari foto interior di Instagram |
| 2 | "Link in bio" KARVE mengarah ke mana | Apakah KARVE layak dikejar | Buka langsung |
| 3 | Batas batal 12 jam belum divalidasi | Tidak ada — default aman | Pertanyaan meeting pertama |
| 4 | Provider VPS | Baru perlu setelah deal | Bandingkan Biznet / IDCloudHost |
| 5 | API key Neon ber-scope akun ditulis ke 7 config agent | Tidak ada | Cabut yang tak terpakai: `neon api-keys revoke 3355921` |

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
