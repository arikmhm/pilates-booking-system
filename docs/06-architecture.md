# Arsitektur — Keputusan dan Alasannya

> **Status:** Draft · **2026-09-22**
> Pendamping [02-rules.md](02-rules.md) dan [05-data-model.md](05-data-model.md).
> Ringkasan yang selalu dibaca AI ada di [../AGENTS.md](../AGENTS.md) — dokumen ini
> memuat **alasannya**, supaya keputusan yang sudah diambil tidak diperdebatkan ulang.

---

## 1. Fakta yang menentukan semua keputusan

```
1 studio · ~100 member · 43 kelas/minggu · ~700 booking/bulan
≈ 25 tulis per hari
Lonjakan satu-satunya: rilis jadwal H-7, ~20 orang rebutan 8 kursi
```

Skala ini tidak menuntut apa pun secara teknis. Maka **performa bukan kriteria.**
Kriteria sebenarnya:

1. Demo jadi dalam 10–14 hari
2. Satu orang merawat banyak instance klien
3. Klien benar-benar memiliki sistemnya
4. Biaya bulanan bisa ditagihkan dalam Rupiah

Setiap keputusan di bawah dinilai dengan empat ini.

---

## 2. Keputusan

| # | Keputusan | Alasan |
|---|---|---|
| 1 | **Next.js App Router** | Satu repo untuk member dan admin. Server Actions menghapus kebutuhan lapisan API |
| 2 | **PostgreSQL** | Bukan selera — partial unique index-nya yang menegakkan invarian kapasitas |
| 3 | **Drizzle**, bukan Prisma | Query 5.1 (`generate_series` + `LATERAL`) tidak bisa diungkapkan ORM mana pun; Drizzle mengizinkan `sql` mentah tanpa berkelahi. Prisma berarti raw SQL juga, sambil menanggung engine 40MB |
| 4 | **Drizzle**, bukan SQL mentah | 14 tabel berarti tipe yang dijaga tangan di puluhan tempat. Itu bukan "beberapa baris" |
| 5 | **Tailwind + shadcn/ui** | Komponen disalin ke repo, bukan dependency runtime. Sesuai janji "klien memiliki kodenya" |
| 6 | **Session token di tabel + cookie httpOnly** | ~40 baris, bisa dicabut kapan saja. Clerk/Auth0 berlangganan USD untuk 100 pengguna satu peran |
| 7 | **SMTP lewat nodemailer** | Portabel — jalan dengan Resend, Brevo, atau email domain klien sendiri. Nol kunci vendor |
| 8 | **Job = HTTP endpoint + secret** | Vercel Cron di demo, `crontab` di VPS, kode sama |
| 9 | **Vitest, hanya 8 titik rawan** | Lihat [04-flows.md](04-flows.md) bagian 9. Cakupan menyeluruh bukan tujuan |

---

## 3. Seam tunggal: aturan bisnis sebagai fungsi murni

```
src/rules/     bolehBooking() · hasilPembatalan() · pilihPaket() · bolehNaikWaitlist()
               tidak mengimpor db, tidak async — input → keputusan
src/db/        skema Drizzle, migrasi, query
app/           server action: baca db → panggil rules → tulis db
```

Alasannya bukan kerapian, tapi **testability**. Menguji `hasilPembatalan(booking, sesi,
setelan)` itu tiga baris. Mengujinya lewat HTTP butuh server, database, dan seed — dan
test yang mahal ditulis adalah test yang tidak ditulis.

Di luar seam ini tidak ada lapisan lagi. Server action boleh query langsung. Tidak ada
repository, service layer, atau DTO.

### Satu test integrasi yang wajib ada

> Tembakkan 20 booking paralel ke kelas berkapasitas 8. Pastikan **tepat 8** berhasil.

Ini satu-satunya cara membuktikan invarian kapasitas dijaga database, bukan kebetulan.
Nilainya melebihi 50 unit test.

---

## 4. Hosting

Demo di **Vercel** — gratis, nol ops, URL langsung bisa dibuka pemilik studio dari HP-nya
setelah presentasi selesai.

Produksi per klien: **VPS**, Docker Compose berisi Next.js + Postgres + Caddy.

| | Vercel | Railway | **VPS** |
|---|---|---|---|
| Ops | Nol | Nol | Backup, update, TLS — tanggunganmu |
| Vendor | 2 (app + DB) | 1 | 1 |
| Tagihan | USD, kartu kredit | USD, kartu kredit | **Bisa IDR** — Biznet, IDCloudHost |
| Biaya/bulan | $0–40 | $5–20 | ~100–250rb |
| "Milik klien" | Canggung | Canggung | Jelas — satu kotak, bisa diserahkan |
| Latensi ke Kudus | Baik | Baik (region Singapura) | Terbaik kalau server di Indonesia |

**Railway memang lebih baik dari Vercel** untuk kasus ini — satu vendor, Postgres
sepaket, cron bawaan, region Singapura. Tapi ia tidak menyelesaikan dua hal yang
justru mendorong kita pindah: **tagihan Rupiah** dan **kepemilikan klien**. Yang ia
selesaikan hanya beban ops, dan itu masalah yang bisa dibereskan sekali lalu dipakai
ulang untuk semua klien.

Railway tetap jadi pilihan cadangan yang sah: kalau klien pertama santai membayar USD,
atau kalau setup VPS ternyata memakan waktu lebih dari yang layak sebelum deal pertama.

### Yang membuat keputusan ini murah

Selama **aturan portabel** dipatuhi — tanpa API khusus platform — target deploy bisa
diputuskan per klien saat serah terima, bukan sekarang. Pindah Vercel → VPS cuma soal
`docker compose up`. Portabilitas gratis kalau diputuskan sekarang, mahal kalau
dipikirkan setelah tiga klien jalan.

### Utang ops yang harus dibayar sekali

Sebelum klien pertama live, siapkan dan pakai ulang untuk semua klien:

- `pg_dump` terjadwal ke penyimpanan di luar VPS itu
- `unattended-upgrades` untuk patch keamanan
- Satu skrip redeploy
- Caddy untuk TLS otomatis

Satu hari kerja, sekali. Setelah itu per klien sekitar 30 menit.

> **Ketegangan yang harus disadari:** model komersial adalah sekali bayar dengan garansi
> 3 bulan, tapi VPS berarti kamu memegang uptime dan backup data bisnis orang tanpa
> retainer. Kalau VPS mati Sabtu malam, itu HP kamu yang berbunyi. Sertakan batas
> tanggung jawab hosting di proposal, atau tawarkan biaya pemeliharaan terpisah.

---

## 5. Notifikasi: email dulu, WhatsApp nanti

WhatsApp API resmi butuh verifikasi bisnis Meta — berhari-hari sampai berminggu, plus
biaya per percakapan. Library tidak resmi bisa membuat nomor studio **diblokir permanen**,
dan itu nomor yang tertera di semua postingan Instagram mereka.

Keputusan untuk R1:

| Jenis notifikasi | Kanal | Alasan |
|---|---|---|
| Konfirmasi booking, pengingat kredit, struk | **Email** | Tidak mendesak. Terlambat dibaca tidak merugikan |
| **Waitlist naik**, **kelas dibatalkan** | Email + **tombol kirim-WA di admin** | Mendesak. Kursi terbuang kalau tidak terbaca dalam hitungan jam |

Tombol kirim-WA adalah link `wa.me/<nomor>?text=<pesan>` — teks Bahasa Indonesia sudah
tersusun, admin tinggal klik dan kirim dari WhatsApp mereka sendiri. Nol biaya API, nol
verifikasi, nol risiko blokir.

Panel admin menandai notifikasi mendesak yang **belum dikirim**, jadi tidak ada yang
terlewat.

```
ponytail: kirim-WA manual satu klik. Naik ke WhatsApp Cloud API kalau
notifikasi mendesak sudah lebih dari ~30/hari atau admin mengeluh.
```

Login mengikuti keputusan yang sama: **magic link lewat email**, dan admin bisa
menerbitkan link login untuk ditempel ke chat bagi member yang tidak pegang email.

---

## 6. Yang sengaja tidak dipakai

| Tidak pakai | Tambahkan kalau |
|---|---|
| tRPC / REST / GraphQL | Ada klien kedua selain web app ini. Aplikasi mobile sudah dinyatakan bukan tujuan |
| Redis | Ada yang lambat dan profiler menunjuk ke situ |
| BullMQ / queue | Job perlu retry, prioritas, atau jalan lebih dari beberapa detik |
| Turborepo / monorepo | Ada paket kedua yang dibagi pakai |
| Zustand / Redux | Ada state klien yang tidak muat di URL atau form |
| date-fns / dayjs | Aritmetika tanggal ada di SQL (`+ interval '60 days'`); sisi app hanya format, `Intl` cukup |
| Library i18n | Ada klien yang minta Bahasa Inggris |
| Realtime / WebSocket | Admin mengeluh harus refresh. Di 25 tulis/hari, tidak akan |
| Docker di demo | Saat mulai deploy ke VPS |
| Sentry / observability | Ada klien kedua. Untuk satu instance, log VPS cukup |

Sepuluh baris ini yang membedakan sistem selesai 2 minggu dengan yang selesai 2 bulan.
