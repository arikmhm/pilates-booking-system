# AGENTS.md

Sistem booking kelas pilates untuk satu studio di Kudus, Jawa Tengah. Model
**class-based**: member memilih sesi yang sudah dijadwalkan studio.

**Mulai tiap sesi dengan membaca `STATUS.md`** — tahap sekarang, yang sedang dikerjakan,
langkah berikutnya, dan log perubahan. Akhiri tiap sesi yang mengubah sesuatu dengan
memperbaruinya.

---

## Tiga invarian

Sumber kebenaran tunggal. Langgar salah satu, sistemnya rusak diam-diam.

| Invarian | Kenapa |
|---|---|
| **Kapasitas dijaga partial unique index di database**, bukan cek-dulu-baru-insert | BR-2.3 — pola cek-lalu-insert selalu bocor saat dua orang menyerbu kursi terakhir |
| **Sisa kredit = `SUM(credit_ledger.delta)`.** Tidak ada kolom saldo | BR-1.7 — sengketa kredit harus bisa dibuktikan baris per baris |
| **`timestamptz` disimpan UTC**, ditampilkan WIB | BR-7.5 — tanggal bertipe string dilarang |

Delapan titik rawan turunannya ada di `docs/04-flows.md` bagian 9. Itu daftar yang wajib
punya test begitu koding dimulai.

---

## Dokumen

Rujuk selalu dengan ID tetap — `BR-3.2`, `UC-S05`, `Alur 4` — di kode, komentar, dan commit.

| Buka | Saat |
|---|---|
| `docs/01-product.md` | Menimbang lingkup, prioritas, metrik, atau apa yang dijual |
| `docs/02-rules.md` | **Menulis logika apa pun.** 53 aturan `BR-x.y`, setelan default, batas demo vs real |
| `docs/03-use-cases.md` | Menambah layar atau aksi — pastikan use case-nya sudah terdaftar |
| `docs/04-flows.md` | Menulis percabangan: booking, pembatalan, waitlist, job terjadwal |
| `docs/05-data-model.md` | Menyentuh skema, query, constraint, atau index |
| `docs/06-architecture.md` | Menimbang dependency, lapisan, atau target deploy |
| `docs/07-design.md` | **Menulis UI apa pun.** Token warna, skala huruf, komponen, status, 6 layar |

Fitur di luar daftar `docs/02-rules.md` bagian 5 adalah fase 2 — tawarkan, jangan bangun.

---

## Konvensi penamaan

| Hal | Bahasa | Contoh |
|---|---|---|
| Nama tabel | Inggris, jamak | `bookings`, `member_packages`, `credit_ledger` |
| Kolom domain | Indonesia | `hangus_at`, `nomor_alat`, `jumlah_kredit`, `alasan` |
| Kolom baku | Inggris | `id`, `status`, `created_at`, `delta` |
| Nilai enum | Inggris snake_case | `confirmed`, `no_show` |
| Timestamp | Akhiran `_at` | `mulai_at`, `dibayar_at`, `dipromosikan_at` |
| Teks ke pengguna | Indonesia | "Kredit kamu habis atau sudah lewat masa berlaku." |
| Komentar dan commit | Indonesia | `// BR-3.2: batal telat, kredit dibiarkan hangus` |

Pengecualian: nilai `credit_ledger.alasan` memakai Indonesia (`batal_telat`, `hangus`)
karena tampil apa adanya di layar riwayat kredit member.

**Uang:** integer Rupiah tanpa desimal — `harga_rupiah`, bukan `price`.

---

## Menjalankan

`package.json` adalah sumber kebenaran untuk stack dan versi. Alasan tiap pilihan dan
daftar yang sengaja **tidak** dipakai: `docs/06-architecture.md`.

```bash
npm run db:up        # Postgres lokal lewat Docker — dipakai dev dan test
npm run dev          # http://localhost:3000
npm run typecheck    # tsc --noEmit
npm test             # Vitest — hanya 8 titik rawan
npm run db:generate  # migrasi baru dari src/db/schema.ts
npm run db:migrate   # terapkan migrasi
npm run db:seed      # isi data demo — semua tanggal relatif hari ini
./check-docs.sh      # angka dan link dokumen
```

Salin `.env.example` jadi `.env.local` sebelum menjalankan apa pun.

`npm test` menjalankan `TRUNCATE` di database lokal — jalankan `npm run db:seed` lagi
sesudahnya kalau sedang memakai aplikasinya.

`DATABASE_URL` menunjuk Neon (demo di Vercel); `TEST_DATABASE_URL` menunjuk Postgres
lokal dan **wajib `localhost`** — test menjalankan `TRUNCATE CASCADE` dan akan menolak
jalan kalau diarahkan ke database sungguhan. Rinciannya di `docs/06-architecture.md`
bagian 4.

## Aturan menulis kode

**Portabel.** Tanpa API khusus platform — tanpa Vercel Blob, tanpa Edge runtime,
tanpa SDK bawaan host. Target deploy diputuskan per klien saat serah terima, dan
pilihan itu harus tetap terbuka.

**Job lewat HTTP.** Empat job terjadwal jadi endpoint biasa berpenjaga secret,
dipanggil Vercel Cron di demo dan `crontab` di VPS. Kode sama, beda satu baris config.
Logikanya di `src/db/job.ts` (fungsi yang menerima klien db), route-nya cuma
pembungkus. Panggil manual:

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/no-show
```

Tiap job **wajib idempoten** dan wajib punya test yang menjalankannya dua kali.

**Waktu dinormalisasi di lapisan database, bukan di layar.** Parser tipe postgres.js tidak
terpasang di runtime server Next: kolom `timestamptz` kembali sebagai string mentah,
dan `Date` yang dikirim sebagai parameter ditolak. Di node biasa (seed, test) keduanya
jalan — jadi typecheck dan test **tidak** akan menangkapnya. Tiap query yang menyentuh
waktu memakai `saat()` saat membaca dan `ts()`/`iso()` + `::timestamptz` saat menulis
(`src/db/booking.ts`, `src/db/seed.ts`). Jangan pernah menyerahkan baris mentah ke
`src/rules/`. Berlaku juga untuk kode yang tadinya cuma dipakai CLI: begitu sebuah
fungsi bisa dipanggil dari server action, ia harus benar di dua runtime.

**Insert massal wajib menyebut kolomnya.** `sql(array)` di postgres.js menyimpulkan
daftar kolom dari kunci objek **pertama**. Kalau objek pertama tidak punya kolom yang
dipakai objek lain, kolom itu hilang dari INSERT tanpa galat apa pun. Selalu tulis
`sql(baris, "kolom_a", "kolom_b", …)`.

**Aturan bisnis = fungsi murni.** `src/rules/` tidak mengimpor db, tidak async — hanya
input → keputusan. Server action yang membaca dan menulis database. Seam ini yang
membuat 8 titik rawan benar-benar bisa di-test.

---

## Merawat dokumen

Satu perubahan menyentuh beberapa berkas. Rambatkan ke semuanya dalam sesi yang sama,
selagi konteksnya masih di kepala.

| Yang berubah | Ikut diperbarui |
|---|---|
| Aturan bisnis `BR-x.y` | `02-rules.md` · `04-flows.md` (alur yang memakainya) · `03-use-cases.md` kalau ada UC baru |
| Kolom atau tabel | `05-data-model.md` (ERD, tabel, query, index) · `04-flows.md` kalau namanya disebut · konvensi di berkas ini kalau polanya baru |
| Batas demo vs real | `02-rules.md` bagian 5 · kolom Demo dan rekap di `03-use-cases.md` · rilis di `01-product.md` |
| Dependency atau lapisan | `06-architecture.md` · `package.json` |
| Use case baru | `03-use-cases.md` (diagram, tabel, rekap bagian 7) · `04-flows.md` kalau punya percabangan |
| Token desain atau layar | `07-design.md` · `02-rules.md` bagian 6.1 kalau layarnya berubah |
| **Apa pun** | `STATUS.md` — tambah satu baris di Log |

Angka yang diklaim dokumen (53 aturan, 46 use case, 12 tabel, 12 alur) harus tetap cocok
dengan isinya. Jalankan sebelum commit:

```bash
./check-docs.sh
```

Skrip itu menghitung ulang keempat angka dan mencari link `.md` yang mati. Kalau meleset,
perbaiki dokumennya lalu perbarui angka harapan di dalam skrip.
