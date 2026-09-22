# Peta Use Case — Sistem Booking Studio Pilates

> **Status:** Draft · **Terakhir diperbarui:** 2026-09-21
> Pendamping [02-rules.md](02-rules.md), [05-data-model.md](05-data-model.md), [04-flows.md](04-flows.md).
> Setiap use case punya ID tetap (`UC-xNN`) dan merujuk aturan `BR-x.y` yang dijalankannya.
>
> Legenda: **✅** dibangun di demo · **◐** dipalsukan di demo · **⬜** hanya versi real

---

## 1. Peta aktor

```mermaid
flowchart LR
    M(("Member")):::aktor
    A(("Admin")):::aktor
    O(("Owner")):::aktor
    C(("Coach")):::aktor
    S(("Sistem")):::sistem

    M --> UCM["Booking dan Jadwal<br/>Kredit dan Paket<br/>Waitlist"]:::demo
    A --> UCA["Kelola Sesi<br/>Kehadiran<br/>Kredit Member"]:::demo
    O --> UCO["Master Data<br/>Laporan dan Audit"]:::real
    C --> UCC["Jadwal Mengajar"]:::real
    S --> UCS["Job Otomatis<br/>Notifikasi"]:::demo

    classDef aktor fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
    classDef sistem fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    classDef demo fill:#e8f5e9,stroke:#2e7d32
    classDef real fill:#fafafa,stroke:#9e9e9e,stroke-dasharray:4 3
```

Empat aktor manusia + satu aktor sistem. **Demo hanya punya dua peran: Member dan Admin.**
Owner dan Coach baru dipisah di versi real.

---

## 2. Use case Member

```mermaid
flowchart LR
    M(("Member")):::aktor

    subgraph JADWAL["Jadwal dan Booking"]
        M01(["UC-M01 Lihat jadwal kelas"]):::demo
        M02(["UC-M02 Lihat detail kelas dan sisa kursi"]):::demo
        M03(["UC-M03 Booking kelas"]):::demo
        M04(["UC-M04 Pilih nomor alat"]):::demo
        M05(["UC-M05 Batalkan booking"]):::demo
        M06(["UC-M06 Lihat booking aktif"]):::demo
    end

    subgraph WL["Waitlist"]
        M07(["UC-M07 Ikut waitlist"]):::demo
        M08(["UC-M08 Keluar dari waitlist"]):::demo
    end

    subgraph KREDIT["Kredit dan Paket"]
        M09(["UC-M09 Lihat sisa kredit dan tanggal hangus"]):::demo
        M10(["UC-M10 Lihat riwayat kredit"]):::demo
        M14(["UC-M14 Lihat riwayat transaksi"]):::demo
        M11(["UC-M11 Beli paket"]):::palsu
    end

    subgraph AKUN["Akun"]
        M12(["UC-M12 Masuk lewat magic link email"]):::palsu
        M13(["UC-M13 Daftar jadi member"]):::real
    end

    M --> M01 --> M02
    M --> M03
    M03 -. "include" .-> M04
    M03 -. "include" .-> M09
    M --> M05
    M --> M06
    M --> M07 --> M08
    M --> M10
    M --> M11
    M --> M12
    M --> M13

    classDef aktor fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
    classDef demo fill:#e8f5e9,stroke:#2e7d32
    classDef palsu fill:#fff8e1,stroke:#f9a825
    classDef real fill:#fafafa,stroke:#9e9e9e,stroke-dasharray:4 3
```

| ID | Use case | Aturan | Demo |
|---|---|---|:--:|
| UC-M01 | Lihat jadwal kelas — kalender mingguan di laptop, daftar per hari di HP. **Tidak butuh akun**: `/jadwal` melayani pengunjung dengan jadwal yang sama tanpa tombol booking (DS-45) | BR-2.1 | ✅ |
| UC-M02 | Lihat detail kelas dan sisa kursi | BR-7.2 | ✅ |
| UC-M03 | Booking kelas | BR-2.1–2.7 | ✅ |
| UC-M04 | Pilih nomor alat *— include dari M03* | BR-2.6 | ✅ |
| UC-M05 | Batalkan booking | BR-3.1–3.5 | ✅ |
| UC-M06 | Lihat booking aktif | — | ✅ |
| UC-M07 | Ikut waitlist saat kelas penuh | BR-4.1, 4.5 | ✅ |
| UC-M08 | Keluar dari waitlist | BR-4.7 | ✅ |
| UC-M09 | Lihat sisa kredit + tanggal hangus + hitung mundur | BR-1.2, 1.7 | ✅ |
| UC-M10 | Lihat riwayat kredit | BR-1.7 | ✅ |
| UC-M11 | Beli paket dan bayar | BR-8.1–8.2 | ◐ |
| UC-M12 | Masuk ke akun lewat magic link email | BR-9.1 | ◐ |
| UC-M13 | Daftar jadi member baru | — | ⬜ |
| UC-M14 | Riwayat transaksi sendiri — tiap paket yang dibeli beserta nasib kreditnya: jadi kelas, kembali, atau hangus. Satu transaksi bisa dibuka sampai buku besarnya | BR-1.7, 8.5 | ✅ |

---

## 3. Use case Admin

```mermaid
flowchart LR
    A(("Admin")):::aktor

    subgraph DASH["Dashboard"]
        A01(["UC-A01 Lihat dashboard hari ini"]):::demo
        A02(["UC-A02 Lihat panel kredit segera hangus"]):::demo
        A03(["UC-A03 Panel pesan terkirim dan tombol kirim-WA"]):::demo
    end

    subgraph SESI["Kelola Sesi"]
        A04(["UC-A04 Lihat peserta dan waitlist"]):::demo
        A05(["UC-A05 Booking atas nama member"]):::demo
        A06(["UC-A06 Batalkan booking member"]):::demo
        A07(["UC-A07 Batalkan satu kelas"]):::demo
        A08(["UC-A08 Batalkan massal per coach per hari"]):::demo
    end

    subgraph HADIR["Kehadiran"]
        A09(["UC-A09 Catat kehadiran"]):::demo
        A10(["UC-A10 Koreksi no-show"]):::demo
    end

    subgraph MEMBER["Member dan Kredit"]
        A11(["UC-A11 Lihat detail member dan buku besar"]):::demo
        A12(["UC-A12 Koreksi kredit manual"]):::demo
        A13(["UC-A13 Tambahkan paket ke member"]):::demo
    end

    A17(["UC-A17 Buku transaksi studio"]):::demo
    A14(["UC-A14 Ubah setelan aturan"]):::demo

    A --> A01 --> A02
    A --> A03
    A --> A04
    A04 -. "extend" .-> A05
    A04 -. "extend" .-> A06
    A04 -. "extend" .-> A07
    A07 -. "include" .-> A08
    A --> A09 --> A10
    A --> A11 --> A12
    A11 -. "extend" .-> A13
    A --> A17
    A --> A14

    classDef aktor fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
    classDef demo fill:#e8f5e9,stroke:#2e7d32
```

| ID | Use case | Aturan | Demo |
|---|---|---|:--:|
| UC-A01 | Dashboard hari ini: sesi, okupansi, ringkasan · **antrean menunggu kursi** · **kelas yang belum diabsen** | BR-4.2, 6.2 | ✅ |
| UC-A02 | **Panel kredit segera hangus** — daftar member yang harus di-chat | BR-1.2, 1.6 | ✅ |
| UC-A03 | Panel pesan terkirim + **tombol kirim-WA** untuk notifikasi mendesak | BR-4.3, 5.3 | ✅ |
| UC-A04 | Lihat peserta + waitlist satu sesi | BR-4.2 | ✅ |
| UC-A05 | Booking atas nama member | BR-9.2 | ✅ |
| UC-A06 | Batalkan booking milik member | BR-3.1–3.2 | ✅ |
| UC-A07 | Batalkan satu kelas + isi alasan | BR-5.1–5.6 | ✅ |
| UC-A08 | Batalkan massal: semua kelas satu coach dalam satu hari | BR-5.4 | ✅ |
| UC-A09 | Centang kehadiran | BR-6.1 | ✅ |
| UC-A10 | Koreksi no-show + isi alasan | BR-6.4 | ✅ |
| UC-A11 | Detail member + buku besar lengkap | BR-1.7 | ✅ |
| UC-A12 | Koreksi kredit manual + wajib alasan | BR-1.8 | ✅ |
| UC-A13 | Tambahkan paket ke member *— pengganti pembayaran di demo* | BR-8.1 | ✅ |
| UC-A14 | Ubah setelan aturan: batas batal, jendela booking, maks waitlist | 02-rules.md bagian 3 | ✅ |
| UC-A15 | Kalender mingguan seluruh studio, bisa geser ke minggu mana pun | BR-7.1 | ✅ |
| UC-A16 | Direktori member: cari, lihat sisa kredit dan kapan terakhir hadir | BR-1.7 | ✅ |
| UC-A17 | Buku transaksi studio: tiap paket yang berpindah ke member + kredit yang dipindah tangan (koreksi manual, perpanjangan karena kelas batal). **Tanpa penjumlahan uang** | BR-1.7, 1.8, 9.1 | ✅ |

---

## 4. Use case Sistem, Owner, dan Coach

```mermaid
flowchart LR
    S(("Sistem")):::sistem
    O(("Owner")):::aktor
    C(("Coach")):::aktor

    subgraph JOB["Job Otomatis"]
        S01(["UC-S01 Terbitkan sesi dari aturan"]):::demo
        S02(["UC-S02 Hanguskan kredit kedaluwarsa"]):::demo
        S03(["UC-S03 Tandai no-show otomatis"]):::demo
        S04(["UC-S04 Tutup waitlist yang lewat batas"]):::demo
        S05(["UC-S05 Naikkan waitlist saat kursi kosong"]):::demo
        S06(["UC-S06 Kirim notifikasi"]):::demo
        S07(["UC-S07 Ingatkan kredit segera hangus"]):::demo
    end

    subgraph MASTER["Master Data"]
        O01(["UC-O01 Kelola jadwal berulang"]):::real
        O02(["UC-O02 Kelola jenis kelas dan kapasitas"]):::real
        O03(["UC-O03 Kelola paket dan harga"]):::real
        O04(["UC-O04 Kelola coach dan staf"]):::real
        O05(["UC-O05 Atur hari libur"]):::real
    end

    subgraph LAPOR["Laporan"]
        O06(["UC-O06 Laporan pendapatan dan okupansi"]):::real
        O07(["UC-O07 Ekspor data"]):::real
        O08(["UC-O08 Lihat audit log"]):::real
    end

    C01(["UC-C01 Lihat jadwal mengajar sendiri"]):::real
    C02(["UC-C02 Lihat daftar peserta kelasnya"]):::real

    S --> S01
    S --> S02 --> S07
    S --> S03
    S --> S04
    S --> S05 --> S06
    O --> O01 --> O02
    O --> O03
    O --> O04
    O --> O05
    O --> O06 --> O07
    O --> O08
    C --> C01 --> C02

    classDef aktor fill:#e8eaf6,stroke:#3f51b5,stroke-width:2px
    classDef sistem fill:#fff3e0,stroke:#ef6c00,stroke-width:2px
    classDef demo fill:#e8f5e9,stroke:#2e7d32
    classDef real fill:#fafafa,stroke:#9e9e9e,stroke-dasharray:4 3
```

| ID | Use case | Pemicu | Aturan | Demo |
|---|---|---|---|:--:|
| UC-S01 | Terbitkan sesi dari aturan berulang | **Tombol di A7** | BR-7.1 | ✅ |
| UC-S02 | Hanguskan kredit kedaluwarsa | Harian | BR-1.6 | ✅ |
| UC-S03 | Tandai no-show otomatis | Tiap jam | BR-6.2 | ✅ |
| UC-S04 | Tutup waitlist yang lewat batas booking | Tiap jam | BR-4.6 | ✅ |
| UC-S05 | **Naikkan waitlist saat ada kursi kosong** | Saat ada pembatalan | BR-4.3–4.4 | ✅ |
| UC-S06 | Kirim notifikasi | Saat peristiwa | BR-4.3, 5.3 | ✅ |
| UC-S07 | Ingatkan member kredit segera hangus | Harian | — | ✅ |
| UC-O01 | Kelola jadwal berulang | — | BR-7.1, 7.3 | ✅ |
| UC-O02 | Kelola jenis kelas & kapasitas | — | BR-7.2 | ◐ |
| UC-O03 | Kelola paket & harga | — | BR-1.4 | ✅ |
| UC-O04 | Kelola coach & staf | — | BR-9.3 | ◐ |
| UC-O05 | Atur hari libur / blackout | — | BR-7.4 | ⬜ |
| UC-O06 | Laporan pendapatan & okupansi · **omzet bulan ini dan nilai kredit menggantung di dashboard** | — | BR-9.3 | ✅ |
| UC-O07 | Ekspor data | — | — | ⬜ |
| UC-O08 | Lihat audit log | — | BR-9.5 | ⬜ |
| UC-O09 | Angka uang di buku transaksi: omzet periode, rata-rata per transaksi, nilai kredit yang hangus | — | BR-9.3 | ✅ |
| UC-C01 | Lihat jadwal mengajar sendiri | — | BR-9.4 | ✅ |
| UC-C02 | Lihat daftar peserta kelasnya | — | BR-9.4 | ✅ |
| UC-C03 | Lihat kredit yang terpakai di kelas yang diajarnya — kursi dan kredit, tanpa satu pun angka rupiah | — | BR-9.3, 9.4 | ✅ |

**UC-S05 adalah use case paling bernilai di seluruh sistem.** Itu yang mengubah
kursi kosong jadi uang, dan itu inti skenario B di presentasi.

---

## 5. Status — siklus hidup

### Booking

```mermaid
stateDiagram-v2
    [*] --> confirmed: UC-M03 / UC-A05<br/>kredit dipotong
    confirmed --> cancelled: UC-M05 / UC-A06<br/>BR-3.1 atau BR-3.2
    confirmed --> cancelled: UC-A07 batal studio<br/>BR-5.1 kredit kembali penuh
    confirmed --> attended: UC-A09 dicentang hadir
    confirmed --> no_show: UC-S03 lewat 2 jam<br/>BR-6.3 kredit hangus
    no_show --> attended: UC-A10 koreksi admin
    cancelled --> [*]
    attended --> [*]
```

Baris `cancelled` **tidak pernah dihapus** — tetap jadi riwayat dan jejak audit.

### Antrean waitlist

```mermaid
stateDiagram-v2
    [*] --> waiting: UC-M07
    waiting --> promoted: UC-S05 kursi kosong<br/>kredit dipotong
    waiting --> expired: UC-S04 booking ditutup
    waiting --> expired: BR-4.4 kredit tidak valid
    waiting --> left: UC-M08 keluar sendiri
    promoted --> [*]: jadi booking
    expired --> [*]
    left --> [*]
```

---

## 6. Alur kritis — dua skenario presentasi

### Skenario A · Booking memotong kredit

```mermaid
sequenceDiagram
    actor M as Member
    participant UI as Layar M1/M2
    participant SYS as Sistem
    participant DB as Database

    M->>UI: Pilih kelas besok 07:00
    UI->>SYS: Minta booking
    SYS->>DB: Cari paket valid, paling cepat hangus
    Note over SYS,DB: BR-1.5 + BR-1.4 cek jenis kelas
    alt Tidak ada kredit valid
        SYS-->>M: Ditolak, arahkan beli paket
    else Ada kredit
        SYS->>DB: INSERT booking, spot dari kapasitas sesi
        Note over DB: BR-2.3 unique index<br/>mustahil melebihi kapasitas
        alt Kelas penuh
            SYS-->>M: Penuh, tawarkan waitlist
        else Berhasil
            SYS->>DB: credit_ledger -1
            SYS->>DB: notifications
            SYS-->>M: Terkonfirmasi, reformer no. 3
            Note over M: Layar M3: kredit 6 jadi 5
        end
    end
```

### Skenario B · Batal telat dan waitlist naik otomatis

```mermaid
sequenceDiagram
    actor M1 as Member A
    actor M2 as Member B<br/>waitlist no.1
    participant SYS as Sistem
    participant DB as Database
    participant N as Panel Notifikasi

    M1->>SYS: Batalkan booking, 5 jam sebelum kelas
    SYS->>SYS: Cek BR-3.2, kurang dari 12 jam
    SYS->>DB: booking jadi cancelled
    SYS->>DB: credit_ledger tetap -1, alasan batal_telat
    Note over DB: Kredit Member A hangus

    SYS->>SYS: UC-S05 proses waitlist
    SYS->>DB: Ambil antrean urut created_at
    SYS->>DB: Cek kredit Member B
    alt Kredit tidak valid
        SYS->>DB: waitlist jadi expired, lanjut berikutnya
    else Kredit valid
        SYS->>DB: INSERT booking, sumber=waitlist
        SYS->>DB: credit_ledger -1
        SYS->>DB: Catat dipromosikan_at
        Note over SYS: BR-3.5 naik kurang dari 12 jam<br/>Member B bebas batal tanpa hangus
        SYS->>N: Notifikasi ke Member B
        N-->>M2: Kamu dapat kursi, reformer no. 3
    end
```

### Skenario B lanjutan · Coach sakit, batalkan satu kelas

```mermaid
sequenceDiagram
    actor A as Admin
    participant SYS as Sistem
    participant DB as Database
    participant N as Panel Notifikasi

    A->>SYS: UC-A07 Batalkan kelas + alasan
    SYS->>DB: sessions jadi cancelled
    loop Setiap booking confirmed
        SYS->>DB: booking jadi cancelled
        SYS->>DB: credit_ledger +1, alasan batal_studio
        Note over DB: BR-5.1 kembali penuh<br/>tanpa lihat jam
        opt Paket hangus kurang dari 7 hari
            SYS->>DB: Perpanjang hangus_at 7 hari
            Note over DB: BR-5.2
        end
        SYS->>N: Notifikasi pembatalan
    end
    loop Setiap antrean waiting
        SYS->>DB: waitlist jadi expired
        SYS->>N: Notifikasi pembatalan
    end
    SYS-->>A: 8 kredit dikembalikan, 11 pesan terkirim
```

---

## 7. Rekap cakupan

| Kelompok | Total UC | Demo ✅ | Palsu ◐ | Real ⬜ |
|---|:--:|:--:|:--:|:--:|
| Member | 14 | 11 | 2 | 1 |
| Admin | 17 | 17 | — | — |
| Sistem | 7 | 7 | — | — |
| Owner | 9 | 4 | 2 | 3 |
| Coach | 3 | 3 | — | — |
| **Total** | **50** | **42** | **4** | **4** |

Demo menjalankan **42 dari 50 use case secara nyata** — 84%. Yang tersisa hampir
seluruhnya modul pengelolaan master data dan laporan, bukan logika bisnis baru.
