# 07 — Sistem Desain

Sumber: `thepilatesclass.com` — ekstraksi mentahnya diarsipkan di
[sumber/thepilatesclass.com-design.md](sumber/thepilatesclass.com-design.md), hanya
sebagai rujukan asal. Disesuaikan untuk **aplikasi booking**, bukan halaman
pemasaran. Identitas visual tetap: lapang, editorial, tenang, putih dominan, aksen
lime hanya untuk aksi utama.

Rujuk aturan di berkas ini dengan ID tetap — `DS-4`, `DS-11` — di kode dan komentar,
sama seperti `BR-x.y`.

> **Kalau ragu, lakukan yang paling sepi.** Sistem ini lebih sering rusak karena
> ditambahi (bayangan, warna kedua, sudut membulat) daripada karena kurang.

---

## 1. Cara memakai berkas ini

| Mau apa | Baca bagian |
|---|---|
| Menyiapkan `globals.css` | 2 — blok token siap tempel |
| Memilih warna | 3 — tabel token + larangan |
| Memilih ukuran huruf | 4 — pakai **skala aplikasi**, bukan skala pemasaran |
| Menyusun jarak antar elemen | 5 |
| Membuat tombol / kartu / input | 6 |
| Menandai status booking atau kredit | 7 — **jangan karang warna sendiri** |
| Menyusun halaman publik (profil, harga) | 8 — pola pita |
| Membangun salah satu dari 6 layar aplikasi | 9 |

Bagian 10 adalah aturan keras. Bagian 11 daftar yang sengaja tidak ada — jangan tambahkan
tanpa alasan tertulis.

---

## 2. Token — tempel ke `app/globals.css`

```css
:root {
  /* permukaan dan teks */
  --background:        #FFFFFF;
  --foreground:        #222325;
  --muted:             #F7F7F8;  /* latar blok tenang */
  --muted-foreground:  #6B6B6E;  /* teks sekunder — 5.31:1 */
  --border:            #E5E7EB;
  --overlay:           #4B3F3A;  /* bilah gelap, banner, footer */

  /* aksi */
  --primary:           #BCFF88;  /* HANYA aksi utama — lihat DS-2 */
  --primary-foreground:#222325;
  --ring:              #222325;  /* cincin fokus — DS-12 */

  /* pita halaman publik — bagian 8 */
  --surface-sand:      #F3EFE8;  /* pita tenang berselang-seling dengan putih */
  --surface-sand-deep: #EBE5DA;  /* pita penutup: harga, footer */
  --border-warm:       #DCD5C8;  /* pemisah di atas pita sand — dekoratif */

  /* aksen teks editorial — SUDAH digelapkan agar lolos AA, lihat DS-18 */
  --emphasis-green:    #487026;
  --emphasis-sand:     #6E5F47;

  /* aksen dekoratif, bukan teks */
  --accent-warm:       #CBBEA3;
  --accent-sand:       #C8C0B2;

  /* foto: tirai wajib sebelum teks putih ditaruh di atasnya — DS-20 */
  --photo-warm:        #9C8877;
  --photo-scrim:       rgba(43, 34, 29, 0.55);

  /* status — lihat bagian 7 */
  --ok-surface:        #EDFFE0;  --ok-foreground:    #2F5B14;
  --warn-surface:      #F3EDE0;  --warn-foreground:  #7A6134;
  --danger-surface:    #F8E8E8;  --danger-foreground:#A33A3A;
  --danger:            #C94B4B;  /* garis/ikon destruktif */
  --neutral-surface:   #F1F2F4;  --neutral-foreground:#6B6B6E;

  /* bentuk */
  --radius-sm: 4px;  --radius-md: 8px;  --radius-lg: 12px;  --radius-full: 9999px;
}
```

Tailwind v4 — petakan sekali di `@theme inline`, setelah itu pakai `bg-primary`,
`text-muted-foreground`, dan seterusnya. Jangan pernah menulis hex di dalam komponen
(`DS-1`).

---

## 3. Warna

| Token | Hex | Dipakai untuk | Jangan |
|---|---|---|---|
| `foreground` | `#222325` | semua teks, ikon, garis tegas | — |
| `background` | `#FFFFFF` | permukaan utama dan kartu | — |
| `primary` | `#BCFF88` | tombol aksi utama, penanda terpilih | jadi latar blok besar; jadi warna teks |
| `border` | `#E5E7EB` | garis kartu, pemisah, tepi input | jadi teks |
| `muted-foreground` | `#6B6B6E` | teks sekunder, keterangan, label mati | teks utama |
| `surface-sand` | `#F3EFE8` | pita halaman publik yang berselang-seling dengan putih | layar aplikasi M1–A3 |
| `surface-sand-deep` | `#EBE5DA` | pita harga dan footer | blok kecil — ini warna pita |
| `emphasis-green` | `#487026` | **teks** beraksen hijau di kalimat editorial | tombol — tombol tetap `primary` |
| `emphasis-sand` | `#6E5F47` | **teks** beraksen hangat, teks sekunder di `surface-sand-deep` | teks panjang |
| `accent-warm` `accent-sand` | `#CBBEA3` `#C8C0B2` | blok dekoratif, gambar kosong, chip halus | **teks di atas putih** — 1.8:1, gagal total |
| `overlay` | `#4B3F3A` | bilah cookie, footer, banner gelap | kartu di dalam aplikasi |
| `danger` | `#C94B4B` | ikon dan garis destruktif | teks kecil di atas putih dalam jumlah banyak |

### Kontras — sudah diverifikasi

| Pasangan | Rasio | Status |
|---|---|---|
| `foreground` di atas putih | 15.73 | AAA |
| `foreground` di atas `primary` | 13.33 | AAA |
| **putih di atas `primary`** | **1.18** | **GAGAL — dilarang** |
| `muted-foreground` di atas putih | 5.31 | AA |
| `accent-sand` di atas putih | 1.80 | GAGAL — dekoratif saja |
| `danger` di atas putih | 4.57 | AA (teks kecil masih lolos, pas-pasan) |
| putih di atas `overlay` | 10.14 | AAA |
| `foreground` di atas `surface-sand` | 13.72 | AAA |
| `foreground` di atas `surface-sand-deep` | 12.55 | AAA |
| `muted-foreground` di atas `surface-sand` | 4.63 | AA |
| **`muted-foreground` di atas `surface-sand-deep`** | **4.24** | **GAGAL — pakai `emphasis-sand`, lihat DS-19** |
| `emphasis-green` di atas putih / sand / sand-deep | 5.80 / 5.06 / 4.63 | AA |
| `emphasis-sand` di atas putih / sand / sand-deep | 6.19 / 5.40 / 4.94 | AA |
| putih di atas foto + `photo-scrim` | 7.74 | AAA |
| Tiap pasangan status di bagian 7 | 4.74 – 7.60 | AA |

`DS-2` — **`primary` tidak pernah membawa teks putih.** Lime ini terang; satu-satunya
teks yang boleh di atasnya adalah `#222325`.

`DS-3` — Tidak ada warna di luar tabel ini. Butuh nuansa baru? Tambahkan tokennya di
sini lebih dulu, lengkap dengan angka kontrasnya.

`DS-18` — **Aksen teks memakai `emphasis-green` dan `emphasis-sand`, bukan `primary`
atau `accent-sand`.** Situs rujukan menaruh lime mentah dan pasir mentah sebagai teks di
atas putih — 1.18:1 dan 1.80:1, dua-duanya tidak terbaca. Efek editorialnya ditiru,
warnanya digelapkan sampai lolos. Ini satu-satunya tempat kita sengaja menyimpang dari
rujukan.

`DS-19` — Di atas `surface-sand-deep`, teks sekunder memakai `emphasis-sand` (4.94:1),
bukan `muted-foreground` (4.24:1).

`DS-20` — Teks di atas foto wajib punya tirai `photo-scrim`. Tanpa tirai, kontras
bergantung pada foto yang belum tentu ada saat komponen ditulis.

---

## 4. Tipografi

### 4.1 Dua skala, jangan tertukar

Berkas sumber diambil dari beranda pemasaran: badan teks 36px, judul 60px. Ukuran itu
**benar untuk halaman jualan dan salah untuk layar booking**. Jadwal kelas dengan teks
36px cuma muat tiga baris di layar HP.

**Skala pemasaran** — hanya untuk halaman publik (profil, harga, tentang):

| Peran | Font | Ukuran (`clamp`) | Tinggi baris | Spasi huruf |
|---|---|---|---|---|
| `display` | Sans | 34 → **60** | 1.12 | -0.02em |
| `serif-hero` | Serif | 30 → **53** | 1.15 | +0.02em |
| `marketing-h2` | Sans | 26 → **41** | 1.2 | -0.01em |
| `marketing-lead` | Sans | 19 → **36** | 1.55 | -0.01em |

`DS-21` — Ukuran pemasaran memakai `clamp()`, bukan angka mati. Nilai besar di tabel
adalah ukuran desktop dari rujukan; nilai kecil adalah ukuran HP. Judul 60px mati akan
tumpah keluar layar 360px.

**Skala aplikasi** — untuk semua layar M1–A3 (`DS-4`):

| Peran | Ukuran / tinggi baris | Bobot | Catatan |
|---|---|---|---|
| `app-title` | 24 / 32 | 400 | judul halaman |
| `app-section` | 18 / 26 | 400 | judul kartu atau kelompok |
| `app-body` | 15 / 24 | 400 | teks utama |
| `app-body-sm` | 13 / 20 | 400 | keterangan, teks bantu |
| `app-label` | 12 / 16 | 500 | label, chip, header tabel · `+0.04em` |
| `app-number` | 32 / 36 | 400 | **angka besar** — sisa kredit (M3), okupansi (A1) |

`DS-5` — Semua angka yang berubah atau sejajar dalam kolom memakai
`font-variant-numeric: tabular-nums`: sisa kredit, jam sesi, kapasitas, rupiah, hitung
mundur. Tanpa ini, angka bergoyang tiap detik dan kolom tabel tidak lurus.

### 4.2 Font dan lisensinya

| Peran | Sumber asli | Status | Pengganti bebas |
|---|---|---|---|
| Sans (95% antarmuka) | Euclid Circular A | **berbayar** | **Plus Jakarta Sans** |
| Serif display | Canela | **berbayar** | **Instrument Serif** |

`DS-6` — Demo dan rilis pertama memakai pengganti bebas lewat `next/font/google`.
Keduanya ada di Google Fonts, jadi tidak melanggar aturan portabilitas di
[06-architecture.md](06-architecture.md). Font berbayar hanya dipasang kalau klien
membeli lisensinya sendiri — ganti satu berkas font, sisanya tidak berubah.

`DS-7` — Bobot tipis (200) hanya untuk ukuran ≥ 36px. Di 15px, bobot 200 tidak terbaca
di layar HP murah. Antarmuka aplikasi memakai 400 dan 500 saja.

---

## 5. Jarak, bentuk, kedalaman

**Skala jarak:** 10 · 20 · 40 · 60 · 100 px. Selokan 24px.

`DS-8` — Jarak antar bagian: **80px di laptop, 40px di HP.** Skala pemasaran yang lapang
itu bagus di beranda, memboroskan layar di jadwal kelas.

**Radius:** `sm 4px` tombol dan input · `md 8px` kartu · `full` chip dan tag saja.
Tidak ada yang lebih besar dari 12px.

`DS-22` — **Lebar konten.** Bungkus halaman publik pada `max-width: 1200px` dengan
padding selokan 24px. Paragraf editorial dibatasi **60ch** — baris sepanjang 1200px
tidak terbaca, sepanjang apa pun ukuran hurufnya.

`DS-9` — **Tanpa bayangan.** Kedalaman datang dari garis `border` tipis, pergeseran
nada, atau foto. Satu `box-shadow` akan merusak nada tenangnya. Panel geser (M2) boleh
memakai tirai gelap `overlay` dengan opasitas — itu tirai, bukan bayangan.

---

## 6. Komponen

| Komponen | Latar | Teks | Radius | Ukuran |
|---|---|---|---|---|
| `button-primary` | `primary` | `foreground` | sm | tinggi 48px · padding 17/37 |
| `button-secondary` | `background` + border | `foreground` | sm | tinggi 48px |
| `button-ghost` | transparan | `foreground` | none | teks saja, tanpa padding |
| `button-danger` | `danger-surface` | `danger-foreground` | sm | tinggi 48px |
| `card` | `background` + border | `foreground` | md | padding 16px |
| `input` | `background` + border | `foreground` | sm | padding 14/16 · tinggi ≥ 44px |
| `chip` | lihat bagian 7 | lihat bagian 7 | full | padding 8/12 · teks `app-label` |
| `banner` | `overlay` | putih | none | padding 16/24 |

`DS-10` — Lebar tombol 260px di berkas sumber adalah tombol CTA pemasaran. Di dalam
aplikasi: **lebar penuh di HP**, lebar mengikuti isi di laptop. Jangan kunci 260px.

`DS-11` — Target sentuh minimal **44 × 44px**. Berlaku untuk **semua** yang bisa
ditekan: tombol "Booking" di M1, centang kehadiran di A2, ikon, dan juga tautan teks
biasa di navigasi maupun footer. Idiomnya satu: `min-h-11 inline-flex items-center`.
Tautan footer setinggi 16px terlihat rapi di layar besar dan mustahil ditekan di HP. Kelas populer dibooking sambil
berjalan dari parkiran.

`DS-12` — Fokus keyboard wajib terlihat: `outline: 2px solid var(--ring)` dengan
`outline-offset: 2px`. Tanpa cahaya, tanpa efek halus. Admin mengerjakan A2 dan A3 dengan
keyboard sepanjang hari.

### Komponen halaman publik

| Komponen | Bentuk |
|---|---|
| `site-header` | Satu baris: navigasi kiri · wordmark tengah · aksi kanan. Latar putih, garis bawah `border`. Di HP navigasi disembunyikan, wordmark dan satu CTA tetap |
| `hero` | Foto full-bleed + `photo-scrim`, teks rata kiri, satu `button-primary`. Tinggi `min-h-[70vh]`, tidak pernah `100vh` |
| `statement` | Paragraf tunggal `marketing-lead`, maks 60ch, dengan aksen `emphasis-green` / `emphasis-sand` di dalam kalimat |
| `split` | Foto separuh · teks separuh. Berbalik arah tiap pemakaian supaya halaman tidak monoton |
| `stat-grid` | Angka `app-number` + label `app-label`. Tanpa garis pemisah, hanya jarak |
| `person-card` | Foto potret 3:4 · nama `app-section` · keterangan `app-body-sm` `muted-foreground` |
| `plan-card` | Kartu putih di atas pita. Paket unggulan berlatar `primary` dengan chip "PALING LAKU" |
| `quote` | Serif `serif-hero` diperkecil, rata tengah, maks 44ch, atribusi `app-label` |
| `site-footer` | Pita `surface-sand-deep`. Kolom tautan + wordmark besar di dasar |

`DS-13` — Satu `button-primary` per layar. Kalau ada dua tombol lime bersebelahan,
keduanya berhenti berarti "ini yang harus kamu klik".

---

## 7. Status domain — pemetaan tetap

Ini yang tidak ada di berkas sumber, padahal 5 dari 6 layar membutuhkannya. **Jangan
karang warna baru; ambil dari tabel ini.**

| Keadaan | Token | Teks tampil |
|---|---|---|
| Booking `confirmed` · hadir | `ok-surface` / `ok-foreground` | "Terkonfirmasi" · "Hadir" |
| Kursi tersisa banyak | `ok-foreground` di atas putih | "3 kursi tersisa" |
| Waitlist · menunggu | `warn-surface` / `warn-foreground` | "Waitlist #2" |
| Kredit hangus ≤ 7 hari | `warn-surface` / `warn-foreground` | "Hangus 4 hari lagi" |
| Sesi penuh | `neutral-surface` / `neutral-foreground` | "Penuh" |
| Batal tepat waktu | `neutral-surface` / `neutral-foreground` | "Dibatalkan" |
| Batal telat · `no_show` · kredit hangus | `danger-surface` / `danger-foreground` | "Tidak hadir" · "Hangus" |
| Kelas dibatalkan studio | `danger-surface` / `danger-foreground` | "Kelas dibatalkan" |

`DS-14` — **Warna tidak pernah menjadi satu-satunya penanda.** Tiap chip status membawa
teks. Satu dari dua belas laki-laki buta warna merah-hijau, dan `ok` versus `danger` di
sini persis merah lawan hijau.

`DS-15` — `primary` bukan warna status. Lime berarti "klik ini", bukan "berhasil".
Konfirmasi booking berhasil memakai `ok-surface`, bukan lime.

---

## 8. Halaman publik — pola pita

Halaman profil, harga, dan tentang memakai **skala pemasaran** (bagian 4.1) dan pola
yang sama: pita penuh lebar yang berselang-seling warna, masing-masing berisi satu
gagasan.

`DS-23` — **Urutan pita selalu berselang-seling putih dan `surface-sand`.** Dua pita
sand berdampingan membuat halaman terasa kusam; dua pita putih berdampingan membuat
batas gagasan hilang. Pita penutup — harga dan footer — memakai `surface-sand-deep`.

Susunan halaman profil:

| # | Pita | Latar | Isi |
|---|---|---|---|
| 1 | `site-header` | putih | Navigasi · wordmark · CTA |
| 2 | `hero` | foto + tirai | Kalimat pembuka · judul `display` · satu CTA |
| 3 | Manifesto | putih | Satu paragraf `marketing-lead` dengan dua aksen warna |
| 4 | Kelas | `surface-sand` | `split` — foto kiri, daftar jenis kelas kanan |
| 5 | Angka | putih | `stat-grid` — kapasitas, durasi, jumlah kelas |
| 6 | Instruktur | `surface-sand` | Baris `person-card` yang bisa digeser mendatar |
| 7 | Untuk semua | putih | Judul tengah + jajaran foto komunitas |
| 8 | Harga | `surface-sand-deep` | Tiga `plan-card`, yang tengah unggulan |
| 9 | Testimoni | putih | `quote` |
| 10 | `site-footer` | `surface-sand-deep` | Kolom tautan · wordmark besar |

`DS-24` — Jarak vertikal antar pita: `py-xl` (100px) di laptop, `py-md` (40px) di HP.
Ini yang menghasilkan kesan lapang, bukan ukuran hurufnya.

`DS-25` — **Foto belum ada saat komponen ditulis.** Semua slot foto memakai blok
`photo-warm` dengan rasio aspek tetap, ditandai `aria-hidden`. Rasio aspeknya yang
mengunci tata letak, jadi memasang foto asli nanti tidak menggeser apa pun.

---

## 9. Pemetaan ke layar aplikasi

Enam layar aplikasi di balik login. Definisinya di [02-rules.md](02-rules.md)
bagian 6.1. Semuanya memakai **skala aplikasi**, bukan skala pemasaran.

| Layar | Perangkat | Yang menentukan tampilannya |
|---|---|---|
| **M1 Jadwal** | HP | Daftar `card` per sesi. Sisa kursi pakai `app-body` + chip status bagian 7. Tombol `button-primary` lebar penuh; saat penuh berubah jadi `button-secondary` "Ikut Waitlist" |
| **M2 Konfirmasi** | HP, panel geser | Tirai `overlay` beropasitas. Pemilih nomor alat: kisi chip, terpilih = latar `primary`. Aturan batal pakai `app-body-sm` / `muted-foreground` — terbaca, tidak menakutkan |
| **M3 Akun Saya** | HP | Sisa kredit pakai `app-number` + `tabular-nums`. Tanggal hangus memakai warna status bagian 7 — hanya menguning saat ≤ 7 hari, di luar itu `muted-foreground`. Buku besar kredit: daftar sederhana, tanpa tabel bergaris |
| **A1 Dashboard** | Laptop | Okupansi pakai `app-number`. Panel "kredit hangus ≤ 7 hari" memakai `warn-surface` — satu-satunya blok berwarna di halaman, supaya mata langsung ke sana |
| **A2 Detail sesi** | Laptop | Tabel peserta, header `app-label`, garis `border`. Centang kehadiran ≥ 44px. "Batalkan Kelas" memakai `button-danger` dan wajib dialog konfirmasi |
| **A3 Detail member** | Laptop | Buku besar penuh, `tabular-nums` di kolom delta. Kolom `alasan` tampil apa adanya dalam Bahasa Indonesia sesuai konvensi di [../AGENTS.md](../AGENTS.md) |

`DS-16` — M1–M3 dirancang HP dulu. A1–A3 laptop dulu, dan tidak wajib bagus di HP —
admin memakainya di meja resepsionis.

---

## 10. Aturan keras

**Lakukan**
- Sisakan ruang kosong. Kalau layar terasa terlalu sepi, biasanya sudah benar.
- Gunakan `primary` seperti garam: satu aksi utama per layar.
- Beri tiap status chip dengan teks, bukan cuma warna.
- Ratakan angka dengan `tabular-nums`.
- Pastikan fokus keyboard terlihat di setiap elemen yang bisa diklik.

**Jangan**
- Jangan menulis hex di komponen — token saja.
- Jangan menaruh teks putih di atas lime (1.18:1).
- Jangan memakai `accent-warm` atau `accent-sand` sebagai warna teks (1.80:1).
- Jangan menambah bayangan, gradien, atau animasi masuk.
- Jangan memakai skala pemasaran di dalam aplikasi, atau skala aplikasi di halaman publik.
- Jangan menaruh teks di atas foto tanpa tirai.
- Jangan menumpuk dua pita berwarna sama — `DS-23`.
- Jangan membuat sudut lebih bulat dari 12px kecuali chip.
- Jangan memakai huruf kapital semua di luar label dan chip.

---

## 11. Sengaja tidak ada

| Tidak ada | Alasan |
|---|---|
| **Mode gelap** | Identitasnya putih dan lapang. Mode gelap berarti menyusun ulang seluruh palet dan menguji ulang tiap kontras, demi layar yang dipakai di studio terang. Fase 2 |
| Sistem bayangan | Bertabrakan dengan nada tenang — `DS-9` |
| Animasi | Panel geser M2 boleh, sisanya tidak. Tidak ada yang menunggu transisi saat merebut kursi terakhir. Halaman publik pun statis — tanpa marquee logo, tanpa animasi saat digulir |
| Ikon bermerek | Pakai satu set ikon garis apa adanya (Lucide, bawaan shadcn/ui) |
| Tema multi-klien | Sistem ini untuk satu studio. Kalau klien kedua butuh warnanya sendiri, ganti nilai token — bukan bangun mesin tema |
