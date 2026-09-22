---
jenis: bahan-mentah
status: arsip sumber — BUKAN sumber kebenaran
tanggal-riset: 2026-09-23
topik: Isi dashboard owner vs dashboard admin/front-desk di perangkat lunak manajemen studio kelas
---

> **Catatan riset, bukan spesifikasi.** Kalau sesuatu di sini mau dipakai, angkat dulu
> jadi `BR-x.y` di [02-rules.md](02-rules.md) atau `UC-xxx` di
> [03-use-cases.md](03-use-cases.md). Jangan rujuk berkas ini dari kode.
>
> Pelengkap [sumber/riset-peran.md](sumber/riset-peran.md) — berkas itu memetakan
> **permission per peran**, berkas ini memetakan **isi layar dashboard**. Sebagian
> temuan di bagian 3 memakai ulang sumber yang sudah diverifikasi di sana.
>
> Tiap klaim menyebut URL. Yang tidak ketemu sumber primernya ditulis
> **"tidak ditemukan sumber primer"** — tidak diisi dari ingatan.

---

## 1. Ringkasan (5 baris)

1. Pemisahnya bukan "dashboard owner" vs "dashboard admin" sebagai dua produk, melainkan **satu halaman yang isinya menyusut mengikuti permission**. Vagaro, WellnessLiving, dan TeamUp menyatakan ini eksplisit; hanya **Mindbody** yang benar-benar memakai dua layar berbeda dengan nama berbeda.
2. Garis pemisah yang muncul di semua vendor: **angka agregat lintas-orang** (omzet, tren bulanan, rata-rata belanja, utilisasi jangka panjang, payroll) milik owner; **daftar baris yang menunggu tindakan hari ini** (kelas hari ini, absensi, permintaan booking/waitlist, pembayaran gagal, paket mau habis) milik front desk.
3. Karena itu "angka uang" bukan satu kategori. Vendor memecahnya tiga: harga jual saat checkout (front desk boleh), **uang yang macet per orang** — `Money Owed`, `Failed Payments`, `Account Balances` (front desk **boleh**, karena itu tugas menagih), dan **omzet agregat** (owner saja).
4. Metrik yang paling konsisten jadi owner-only lintas vendor: Sales/Net Sales, tren "since last month", Capacity/Utilization, Average spend per client, retensi/churn, payroll & pay rates, dan **unearned/deferred revenue dari paket yang belum terpakai**.
5. Untuk repo ini: A1 tidak perlu dipecah dua. Yang kurang bukan panel owner — O1 sudah ada — melainkan **dua daftar tindakan harian** yang semua vendor taruh di layar front desk tapi A1 belum punya: *waitlist yang perlu ditindak* dan *kelas yang belum diabsen*. Rincian di bagian 5.

---

## 2. Tabel owner-only vs admin-harian

Kolom "Vendor" menyebut siapa yang menegaskannya; tautan lengkap ada di bagian 3.

### 2.1 Lazimnya owner-only

| Panel / metrik | Nama baku vendor | Vendor yang membatasi |
|---|---|---|
| Omzet total periode | `Sales` · `Total Net Sales` · `Confirmed Revenue` | Mindbody (Insights snapshot, owner-only screen) · Glofox (`Sales Report` — Receptionist *No access*) · Punchpass (Reports = Admin saja) |
| Omzet dipecah per kategori/paket | `Sales by Category` · `Sales by Pricing Option` · `Revenue By Class` | Arketa · Mindbody (`Analysis Reports`) |
| Tren bulanan / pembanding periode | `Since last month` · `Comparison Reports` · `Sales Over Time` | Mindbody · TeamUp · Arketa |
| Rata-rata belanja per klien | *"total sales divided by the number of clients served"* · `Average Revenue Analysis` · `Average Spend per Subscription` | Mindbody · Arketa |
| Utilisasi/okupansi agregat | `Capacity` (kelas) · `Utilization` (appointment) · `Booking Percentage` · `Utilization Rate` | Mindbody · Vagaro · Arketa |
| Retensi / risiko churn | `At-Risk clients` · `Isaac Churn Risk` · `First Timer Retention` | Mindbody (butuh permission `Client Acquisition & Analytics dashboard`) · WellnessLiving · Arketa |
| Nilai klien jangka panjang | `Big Spenders` / `Top Prospects` · `Customer Value` | Mindbody · Arketa |
| Payroll & tarif bayaran coach | `Payroll Report` · `Staff pay rates` · `Ability to Run Others' Payroll` | Mindbody · Vagaro · Arketa (`Manager (No Payroll)` peran tersendiri) · Momence |
| **Liability kredit prabayar yang belum terpakai** | `Outstanding Series` / `Outstanding Pricing Options` · `unearned revenue` · `deferred revenue` · `Earned Revenue` | Mindbody (butuh `Analysis Reports`) |
| Export data | `Export report information` · `Clients Export` | Mindbody · Glofox · Arketa (Front Desk: *"no export"*) |

### 2.2 Lazimnya admin-harian (front desk)

| Panel / daftar | Nama baku vendor | Vendor |
|---|---|---|
| Kelas hari ini + indikator kursi | `Schedule` widget · `Dashboard calendar (Staff schedule)` · `Upcoming Events` | Mindbody · TeamUp |
| Buka layar absensi dari situ | `Class Sign In screen` · `Launch Sign-In Screen` | Mindbody |
| Permintaan booking & waitlist yang menunggu keputusan | `Booking Requests Report` · `Accept Appointment Requests and Waitlist` · `Pending Appointments` | WellnessLiving · Vagaro |
| Member yang paketnya segera habis / kedaluwarsa | `Pricing Option Expirations report` · `Expiring intro offers` · `Series Notification - Time Running Out` · `Series Notification - Visits Remaining Low` | Mindbody |
| Pembayaran macet per orang | `Money Owed Report` · `Failed Payments Report` · `Unpaid Visits report` · `Account Balances report` · `Upcoming Unpaid Visits` | Glofox (Receptionist **boleh**) · Mindbody · Arketa |
| Notifikasi/alert operasional yang belum dibaca | `Important Notifications` (pending appointments, missing clockout, low quantity) | Vagaro |
| Tugas hari ini | `To-Dos` · `Pending Payments` · `Upcoming Billing` | TeamUp |
| Beban mengajar / jadwal coach | `Staff Schedule report` · `Most Popular Instructors` (versi agregatnya owner) | Mindbody · Arketa |
| Sentuhan retensi ringan | `Upcoming Birthdays` · `Upcoming Anniversaries` | TeamUp · Arketa |

### 2.3 Zona abu-abu — vendor berbeda pendapat

| Hal | Yang membuka untuk front desk | Yang menutup |
|---|---|---|
| Laporan pembayaran gagal | Glofox (`Money Owed`, `Failed Payments` = View untuk Receptionist) | Punchpass (Restricted: *"cannot ... view billing, reports"*) |
| Laporan apa pun | Arketa Front Desk: *"Limited (specific reports only; no export, favorites, or row actions)"* | Arketa `Manager` & `Manager (No Payroll)`: Reports/Analytics **disabled** meski payroll terbuka |
| Dashboard itu sendiri | Vagaro: semua karyawan lihat dashboard, **isinya** yang menyusut | Mindbody: dashboard owner tidak muncul sama sekali untuk staf |

---

## 3. Temuan per produk

### 3.1 Mindbody — **satu-satunya yang benar-benar dua layar terpisah**

Sumber:
- <https://support.mindbodyonline.com/s/article/Home-page-overview-new-Mindbody-experience?language=en_US> (judul halaman: "Home dashboard overview")
- <https://support.mindbodyonline.com/s/article/203259113-Dashboard-Schedule-widget?language=en_US> (judul halaman: "Dashboard calendar (Staff schedule)")
- <https://support.mindbodyonline.com/s/article/203257103-Outstanding-Series-report-Outstanding-Pricing-Options-report?language=en_US>
- <https://support.mindbodyonline.com/s/article/203257223-Earned-Revenue-report?language=en_US>
- <https://support.mindbodyonline.com/s/article/MINDBODY-s-Helpful-Tips-for-Your-Business?language=en_US>

Kutipan yang menentukan, dari "Home dashboard overview":

> *"The Dashboard is only visible to the owner and is their default screen upon logging in."*
> *"Staff members' default screen is the Dashboard Calendar (Staff Schedule)."*
> *"You cannot change or customize the information that displays on the dashboard."*

Dan soal pusat notifikasi di layar yang sama: *"This section can only be accessed by the owner's login."*

**Isi dashboard owner:**

| Blok | Isi |
|---|---|
| Notifications and alerts | `Expiring intro offers` · `Expiring cards for autopays` · `Failed autopays` · *"A summary of yesterday's metrics"* |
| Schedule | snapshot kelas/appointment hari ini |
| Client AI predictions | `Big Spenders` · `At-Risk clients` |
| Insights snapshot | `Sales` · `Clients Served` · `Capacity` (kelas) / `Utilization` (appointment) |

Definisi yang berguna untuk penamaan kita:
- `Sales` — *"the total sales made over the given time"*, akrual, tanpa pajak.
- `Clients` — *"the total number of unique clients who made a purchase"*; kotak abu di sebelahnya *"highlights the average of what your clients have paid. The data is calculated by the total sales divided by the number of clients served."*
- `Utilization` — *"The percentage is calculated by the scheduled hours over the total hours (Scheduled/Total)."*
- `Since last month` — *"calculates the data based on the time and compares it to the data for the same dates in the previous month."*

**Isi dashboard staf** ("Dashboard calendar"): *"a snapshot of appointments, classes, and courses ... scheduled for the next two weeks"*, tiap kelas punya *"capacity indicator bubble that shows how many students are signed in to the class over the total class capacity"*, dan kliknya menuju `Class Sign In screen`. Bahkan untuk melihat ini staf butuh permission eksplisit: `View reservations`, `View entire appointment schedule`, dan `Schedule at a Glance/Attendance (Everyone's schedule)` — atau versi `(Own schedule ONLY)`-nya. Alert dan Client AI predictions baru muncul kalau permission `Client Acquisition dashboard and Analytics dashboard` dinyalakan.

**Liability kredit prabayar.** Ini padanan paling langsung dengan "kredit hangus" kita, dan Mindbody memberi dua laporan dengan istilah akuntansi yang jelas:

> `Outstanding Series report (Outstanding Pricing Options report)` — *"lists all pre-sold pricing options, packages, and memberships, and the **unearned revenue** for each one"*, dan gunanya *"Monitor changes in your **deferred revenue** from past dates to the present day."*

Peringatan vendor yang layak ditiru: laporan `Visits Remaining` *"cannot accurately represent a liability for unearned revenue"* — menghitung sisa kunjungan **bukan** hal yang sama dengan menghitung nilai rupiahnya. Keduanya butuh permission `Analysis Reports`.

`Earned Revenue report`: *"analyze deferred revenue for both limited visits and unlimited visits"*, dan *"Display earned revenue based on the portion of total pricing options sold by your business that clients have used so far."* Jadi Mindbody mengakui pendapatan **saat kredit dipakai**, bukan saat paket dibeli — berbeda dengan `src/db/kelola.ts` yang sengaja memilih `dibeli_at`. Lihat catatan di bagian 5.4.

**Sisi front desk yang tetap diberi angka uang per orang**: `Unpaid Visits report` (*"see how many clients owe you for classes"*) dan `Account Balances report` untuk menagih saldo negatif. Untuk paket yang mau habis, Mindbody memberi `Pricing Option Expirations report` plus dua notifikasi otomatis bernama `Series Notification - Time Running Out` (berbasis tanggal kedaluwarsa) dan `Series Notification - Visits Remaining Low` (berbasis sisa kunjungan) — dua sumbu yang persis sama dengan `hangus_at` dan `SUM(delta)` di sini.

### 3.2 Vagaro — satu dashboard, isinya diikat ke permission laporan

Sumber:
- <https://support.vagaro.com/hc/en-us/articles/12731739712667-Dashboard-Reports>
- <https://support.vagaro.com/hc/en-us/articles/18977275541531-Configure-Access-Levels-and-Employee-Permissions>

Kutipan permission `Dashboard`:

> *"Employees will need View access for Ability to Run Own Reports and Ability to Run Others' Reports to see sales information."*
> *"View: Employees can view the Dashboard and all widgets. The data shown will depend on their access for Ability to Run Own Reports and Ability to Run Others' Reports permissions."*

Jadi semua orang membuka **halaman yang sama**; yang kosong adalah **angkanya**. Ini pola paling dekat dengan yang sudah dipakai A1 sekarang.

Widget yang ada (semua bisa dihapus/diurutkan, dan *"Removing one of the Dashboard widgets removes it for all account users"*):

`Appointment Distribution` · `Important Notifications` · `Top 10 Sales Items` · `Sales Breakdown` · `Booking Percentage` · `New vs Returning` · `Trends` · `Refer a Friend`

Definisi `Booking Percentage` — padanan langsung "okupansi" kita:

> *"shows how productive your business or selected employees were during a date range. You'll see how much bookable time was available versus how much time was booked, as well as the percentage of how much of that time was actually used."*

`Important Notifications` adalah blok front-desk murni: *"missing timecard entries, pending appointments, pending shipments, and low quantity warnings"* — daftar tindakan, bukan angka.

Soal owner: *"There is no access level for the business owner account. This user will always have View and Modify access to all permissions for every screen."* Dan beberapa hal tidak bisa didelegasikan sama sekali — *"Only the business account owner can download the customer list"*, *"only the business account owner can view and modify the Billing Information and Facility Information"*.

Lima access level bawaan: `Admin` · `Manager/Supervisor` · `Service Provider Commission` · `Service Provider Self-Employed` · `Employee` (*"such as an accountant, receptionist, and other administrative staff"*).

Payroll dipisah dua permission: `Ability to Run Own Payroll` dan `Ability to Run Others' Payroll`.

### 3.3 WellnessLiving — dashboard bisa dibuat sendiri, tapi disaring permission

Sumber: <https://help.wellnessliving.com/en/articles/9113656-dashboards>

Kutipan kuncinya:

> *"Reports that aren't included in a staff member's staff role permissions won't appear on their dashboards. This applies to both created and shared dashboards."*

Artinya owner bisa merakit satu dashboard dan **membagikannya** ke staf; blok yang tidak boleh dilihat staf hilang sendiri. Tidak ada dua layar.

Isi bawaan: `Isaac Churn Risk` (*"uses AI to predict client attrition"*), `Key Metrics`, `Booking Requests Report`, `Daily Attendance Tracker`.

`Key Metrics` berisi *"total sales, booking requests, recurring membership payments, new leads, and more"* — perhatikan campurannya: dua metrik owner (`total sales`, `recurring membership payments`) bersebelahan dengan satu antrean kerja front desk (`booking requests`). Vendor ini tidak memisahkan per blok, ia memisahkan per **laporan yang mendasari blok itu**.

Permission terkait dashboard: `Edit Dashboards` · `Delete Dashboards` · `Share Dashboards` · `Export and print reports`. Kategori permission-nya sendiri punya entri `Dashboard` tersendiri (lihat [sumber/riset-peran.md](sumber/riset-peran.md) bagian 4).

### 3.4 TeamUp — satu dashboard, dipotong per permission

Sumber:
- <https://support.goteamup.com/en/articles/9327785-an-overview-of-your-business-dashboard-w-video>
- <https://support.goteamup.com/en/articles/9327385-adding-staff-members>

Kutipan:

> *"Staff members with Owner or Admin status will see the full Dashboard. Staff with limited or no permissions will only see information relating to the parts of the account they have access to."*

Blok dashboard: `Pending Payments` · `Upcoming Events` · `Upcoming Billing` · `To-Dos` · `Comparison Reports` · `Customer Accounts Created` · `Revenue` · `Active Memberships` · `Revenue By Purchase` · `Recent Revenue` · `Upcoming Birthdays`.

`Comparison Reports` membandingkan bulan berjalan dengan periode yang sama bulan lalu, isinya empat: **Confirmed Revenue** · **Accounts Created** · **Events Booked** · **Made Payment**. Ini contoh paling ringkas dari "strip tren bulanan" versi owner.

Dua tipe akun: `Admin` (*"full access to all sections of the account"*) dan `Limited Permissions` (*"restricts access to only the sections you permit"*). Dua permission yang disebut namanya menunjukkan cara memotong yang relevan bagi kita: `Manage Sessions` memberi *"access to session details, prices, and attendees"* sementara `Manage Attendances` memberi *"access to attendees only, without payment details"* — **layar yang sama, kolom harga dicopot**.

### 3.5 Arketa — dashboard = Analytics, dan Front Desk hanya dapat remah

Sumber:
- <https://help.sutrapro.com/en/articles/8276157-dashboards-and-charts>
- <https://help.sutrapro.com/en/articles/11707255-dashboard-charts>
- <https://help.sutrapro.com/en/articles/8276778-roles-and-permissions> (matriks perannya sudah dirangkum di [sumber/riset-peran.md](sumber/riset-peran.md) bagian 3)

Delapan KPI teratas dashboard: `Gross sales` · `Class bookings` · `First visits` · `New customers` · `New members` · `Active members` · `Class attendance` · `Video views`.

Dashboard dikelompokkan jadi papan bertema, dan pengelompokannya sendiri informatif:

| Papan | Contoh metrik |
|---|---|
| Business Overview | `Total Sales` · `Total Net Sales` · `Sales by Category` · `Total Bookings & Visits Over Time` |
| Sales Overview | `Net Sales Over Time` · `Sales by Pricing Option` · `Net Sales by Location` |
| Bookings & Visits | `Total Visits` · `Cancellations & No-Shows` · `Most Popular Instructors` · `Most Popular Classes` |
| Introductory Offers | `Total Converted` · `Conversion Rate` · `Expired Intro Offers` |
| First Timers | `Total First Visits` · `Total Subsequent Visits` · `New Leads Over Time` |
| **Payment Issues** | `Upcoming Unpaid Visits` · `Failed Invoice Payments` · `Penalty Charges` |
| Membership Overview | `Active Subscriptions` · `Average Spend per Subscription` · `Paused Memberships` · `Canceled Memberships` |
| Instructor Performance | `Utilization Rate` (*"Percentage of class spots filled per instructor"*) · `Average Clients per Class` · `Estimated Net Revenue` · `First Timer Retention` |
| Client Celebrations | `Upcoming Birthdays` · `Upcoming Anniversaries` · `Upcoming Milestones` |

Papan **Payment Issues** dan **Client Celebrations** adalah daftar tindakan front-desk; sisanya angka owner. Tapi matriks peran Arketa tetap menutup Reports/Analytics untuk `Front Desk` (*"Limited (specific reports only; no export, favorites, or row actions)"*) — dan, anehnya, **juga untuk `Manager` dan `Manager (No Payroll)`** yang justru punya payroll. Arketa memisahkan "boleh bayar orang" dari "boleh lihat performa bisnis", arah yang berlawanan dengan dugaan biasa.

### 3.6 Glofox / ABC Glofox — batas uang paling eksplisit, tapi dokumennya kini tertutup

Sumber: <https://support.glofox.com/hc/en-us/articles/52585050344852-Staff-Roles-and-Default-Permissions>

⚠️ **Per 23 Sep 2026 help center Glofox meminta login** (`support.glofox.com` mengalihkan ke "Sign in to ABC Glofox"), dan URL seksi dashboard lama `.../sections/360001239797-Step-9-The-Dashboard` sudah 404. Matriks di bawah **dikutip ulang dari [sumber/riset-peran.md](sumber/riset-peran.md) bagian 5** yang diverifikasi 2026-09-22, bukan dibaca ulang hari ini.

Peran bawaan: `Super Admin` · `Admin` · `Receptionist` · `Trainer`. Yang relevan untuk pertanyaan ini:

| Laporan | Admin | Receptionist | Trainer |
|---|:--:|:--:|:--:|
| `Sales Report`, `Transactions Report`, `Payouts Report`, `Scheduled Revenue Report`, `Account Balance` | View | **No access** | No access |
| `Money Owed Report`, `Failed Payments Report` | View | **View** | No access |
| `Members` report / `Members Export` | View | View | No access |

Inilah bukti paling tajam bahwa **"angka uang" bukan satu saklar**: Receptionist tidak boleh melihat omzet, tapi wajib melihat siapa yang berutang dan pembayaran siapa yang gagal — karena itu pekerjaannya.

Dashboard-nya sendiri (`Glofox Insights` → `Sales Activity`) menyebut `Credit Pack Sales`, `Store Revenue`, `Other Sales`, dan `Money Owed`. **Tidak ditemukan sumber primer yang bisa dibaca hari ini** untuk mengonfirmasi isi tiap blok; deskripsi itu berasal dari snippet hasil pencarian atas
<https://support.glofox.com/hc/en-us/articles/46425248290068-Glofox-Insights-Optimize-Your-Revenue-Streams>, bukan dari halaman yang terbuka. Perlakukan sebagai indikatif.

### 3.7 Punchpass — pemisahan paling kasar, dan paling dekat dengan skala kita

Sumber:
- <https://support.punchpass.com/en/articles/4685635-adding-instructors-staff-and-other-users-to-your-punchpass-account>
- <https://support.punchpass.com/en/articles/1033097-are-there-different-user-levels-for-my-instructors>

Tiga level saja: `Administrator` (*"Full access"* — *"account settings, billing, reporting, customer management, and class scheduling"*), `Restricted` (*"Limited access (e.g., attendance, reservations)"*), `Attendance-Only` (*"only take attendance"*).

`Restricted` boleh *"take attendance, start online classes, cancel classes, assign passes, add new customers and view customer profiles"* tapi tidak boleh *"billing, reports, download customer information, or access the Punchpass setup features (Manage Settings, Classes, or Passes)"*.

Perhatikan: `Restricted` **boleh `assign passes`** — memberi paket ke member — tapi **tidak boleh melihat laporan**. Persis pembagian yang dipakai `BR-9.2`/`BR-9.3` di sini: admin boleh memberikan paket dan mengoreksi kredit, tapi tidak melihat O1. Punchpass adalah vendor dengan skala paling mirip studio Kudus, dan pemisahannya paling sederhana: **satu garis, "reports" di seberangnya**.

### 3.8 Momence

Sumber: lihat [sumber/riset-peran.md](sumber/riset-peran.md) bagian 2. Peran bawaan `Admin` · `Operator` · `Front Desk` · `Teacher`; Admin digambarkan *"an all-powerful, all-seeing role"*. Temuan yang relevan di sini: **`Front Desk` dan `Operator` tidak bisa melihat laporan payroll secara bawaan**, dan instruktur yang diberi akses payroll sendiri pun **tidak melihat kolom revenue** — boleh tahu bayarannya, tidak boleh tahu berapa uang yang kelasnya hasilkan.

Halaman dashboard non-korporat Momence: **tidak ditemukan sumber primer**. Yang publik hanya <https://help.momence.com/en/articles/10119082-corporate-dashboard> (multi-franchise, di luar lingkup satu studio).

### 3.9 Zen Planner

**Tidak ditemukan sumber primer.** `help.zenplanner.com` hampir tidak terindeks; yang ketemu adalah halaman pemasaran di `zenplanner.com` (mis. <https://zenplanner.com/fitness-business-dashboard-reports/>) yang menyebut dashboard bisa dikustomisasi dengan sistem warna hijau-kuning-merah terhadap target per metrik. Satu artikel help yang terbuka, <https://help.zenplanner.com/hc/en-us/articles/203999010-Prospect-Status-Reports>, hanya membahas laporan prospek. **Jangan dipakai sebagai bukti** — dicatat di sini supaya tidak dicari ulang.

---

## 4. Jawaban atas pertanyaan 3: dua dashboard, atau satu yang disaring?

| Produk | Pola | Bukti |
|---|---|---|
| **Mindbody** | **Dua layar terpisah** dengan nama sendiri | *"The Dashboard is only visible to the owner"* · *"Staff members' default screen is the Dashboard Calendar (Staff Schedule)"* |
| Vagaro | **Satu layar, data menyusut** | *"Employees can view the Dashboard and all widgets. The data shown will depend on their access for Ability to Run Own Reports..."* |
| WellnessLiving | **Satu layar, blok menghilang** | *"Reports that aren't included in a staff member's staff role permissions won't appear on their dashboards."* |
| TeamUp | **Satu layar, blok menghilang** | *"Staff members with Owner or Admin status will see the full Dashboard. Staff with limited or no permissions will only see information relating to the parts of the account they have access to."* |
| Arketa | **Satu area Analytics, aksesnya dimatikan per peran** | Front Desk: *"Limited (specific reports only; no export...)"*; Manager: Reports/Analytics disabled |
| Punchpass | **Seluruh bagian Reports ditutup** | Restricted: *"cannot ... view billing, reports"* |
| Glofox | **Laporan per-laporan**, bukan per-layar | `Sales Report` No access untuk Receptionist, `Money Owed Report` View |

**Empat dari tujuh memakai satu layar yang disaring.** Yang memilih dua layar (Mindbody) melakukannya karena dashboard stafnya bukan versi ringkas dari dashboard owner — itu **kalender**, jenis halaman yang berbeda sama sekali. Pelajarannya bukan "pecah dua", melainkan: **pecah dua hanya kalau isi layar yang satu bukan subset layar yang lain.**

---

## 5. Rekomendasi untuk repo ini

Semua usulan di bawah memakai tabel yang **sudah ada** (`sessions`, `bookings`, `waitlist_entries`, `credit_ledger`, `member_packages`, `packages`, `users`, `notifications`). Tidak ada usul tabel baru, tidak ada `payments`, tidak ada `audit_log`.

### 5.1 Keadaan sekarang

`src/app/admin/page.tsx` (A1) menampilkan hal yang sama untuk admin dan owner kecuali satu kartu: `Setelan aturan` yang jadi teks-mati untuk admin (`const owner = pengguna.peran === "owner"`). Tiga ubin angkanya — Kelas hari ini · Kursi terisi · Kredit hangus ≤ 7 hari — semuanya **operasional**, tidak satu pun angka uang. Omzet, okupansi jangka panjang, tingkat kehadiran, dan nilai rupiah kredit hangus sudah punya rumah sendiri di O1 `src/app/admin/laporan/page.tsx`.

**Artinya A1 hari ini sudah sesuai `BR-9.3` tanpa perubahan apa pun.** Yang salah bukan "ada angka owner di layar admin", melainkan yang sebaliknya: **A1 kurang kerja harian**, dan O1 kurang satu metrik owner yang semua vendor punya.

### 5.2 Yang harus **ditambah** untuk admin di A1

Dua blok, keduanya daftar tindakan bukan angka — sejajar dengan `Booking Requests Report` (WellnessLiving), `Accept Appointment Requests and Waitlist` (Vagaro), dan `Class Sign In screen` (Mindbody).

| Usul | Kenapa | Datanya |
|---|---|---|
| **Panel "Antrean menunggu kursi"** — daftar orang di waitlist untuk sesi hari ini/besok, dengan tautan ke A2 | Chip `3 antre` di daftar kelas hanya menghitung; ia tidak memberi tahu **siapa** dan tidak bisa diklik ke orangnya. Semua vendor menaruh antrean sebagai *daftar berbaris*, bukan angka | `waitlist_entries` `status='waiting'` ⋈ `sessions` ⋈ `users`, difilter jendela hari yang sama dengan `sesiHariIni()` |
| **Panel "Belum diabsen"** — sesi yang sudah lewat tapi masih punya `bookings.status='confirmed'` | `BR-6.2` akan menandainya `no_show` otomatis setelah `noshow_after_hours`. Sebelum tenggat itu lewat, tidak ada satu tempat pun yang memberi tahu admin bahwa kelas jam 06.00 belum diabsen — padahal itu tugas front-desk paling inti di Mindbody dan Punchpass | `bookings` ⋈ `sessions` di mana `s.mulai_at < now()` dan `b.status='confirmed'`, dalam jendela `noshow_after_hours` |

Kartu `Kredit hangus ≤ 7 hari` **tetap untuk kedua peran**. Padanannya di Mindbody (`Pricing Option Expirations report`, `Series Notification - Time Running Out`) dan di Glofox (`Money Owed Report` yang dibuka untuk Receptionist) sama-sama pekerjaan meja depan. Itu daftar orang yang harus di-chat, bukan laporan — persis seperti yang sudah tertulis di komentar berkasnya.

### 5.3 Yang harus **ditambah** untuk owner

Satu metrik, dan ia tidak ada di mana pun sekarang:

> **Nilai kredit yang masih hidup — `unearned revenue` / liability prabayar.**

Mindbody menyebutnya `Outstanding Series` / `Outstanding Pricing Options`, nilainya dipakai untuk pembukuan sebagai *"deferred revenue"*. O1 hari ini menghitung `hangus` — uang yang **sudah** lewat — tapi tidak pernah menghitung **berapa uang yang sedang menggantung**. Untuk studio yang menjual paket prabayar, itu satu-satunya angka neraca yang penting, dan pemiliknya tidak punya cara lain mengetahuinya.

Rumusnya sudah ada di `src/db/kelola.ts`, tinggal diarahkan ke baris lain: sisa kredit per `member_packages` yang belum `hangus_at`, dikalikan `packages.harga_rupiah / packages.jumlah_kredit` — pembagi yang sama persis dengan yang dipakai blok `hangus`. Letaknya **O1, bukan A1** (`BR-9.3`).

Ikut dengan itu, dua hal kecil di O1 yang punya nama baku dan sudah bisa dihitung:
- Pendapatan bulan ini sebaiknya ditampilkan **berdampingan dengan bulan lalu**, bukan sendirian — pola `Since last month` (Mindbody) / `Comparison Reports` (TeamUp). Data `bulanan` yang sudah di-query `limit 6` sudah memuat keduanya.
- Rata-rata belanja per member: `total omzet ÷ jumlah member yang membeli`. Mindbody mendefinisikannya persis begitu (*"total sales divided by the number of clients served"*). Dua kolom dari query `bulanan` yang sudah ada.

### 5.4 Yang **tidak** perlu dipindah atau dibangun

- **Jangan pecah A1 jadi dua layar.** Empat dari tujuh vendor memakai satu layar yang disaring, dan A1 sudah memakai pola itu (`owner ? … : …`). Mindbody memecah dua karena layar stafnya adalah kalender, bukan versi ringkas dashboard owner — kasus yang tidak berlaku di sini.
- **Jangan pindahkan pengakuan pendapatan ke basis "kredit terpakai".** Mindbody memakai basis terpakai (`Earned Revenue`), repo ini memakai `dibeli_at` dan alasannya sudah tertulis di `src/db/kelola.ts`. Keduanya sah; yang tidak boleh adalah mencampur. Kalau metrik 5.3 masuk, komentar di berkas itu perlu menyebut bahwa sekarang **kedua sisi** ditampilkan: kas masuk pada `dibeli_at`, liability pada sisa kredit.
- **LTV, churn rate, dan retensi kohort** — semua vendor punya (`Isaac Churn Risk`, `At-Risk clients`, `First Timer Retention`), tapi semuanya berbasis langganan berulang. Model kita prabayar tanpa auto-renew, jadi padanannya adalah panel *"member yang lama tak datang"* yang **sudah ada di A4**. Cukup. Tidak perlu metrik baru.
- **Payroll dan komisi coach** — owner-only di semua vendor, dan `docs/01-product.md` bagian 4 sudah menyatakan ini bukan tujuan (*"Bukan sistem akuntansi, penggajian, atau CRM"*). Lewati. A5 yang menampilkan beban mengajar 7 hari sudah memberi sisi operasionalnya.
- **Export laporan** — dipisah jadi permission tersendiri oleh Mindbody, Glofox, dan Arketa (*"gives a staff member the ability to save your sensitive client data outside of your Mindbody site"*). `docs/02-rules.md` bagian 5 sudah menandai ekspor sebagai belum ada. Kalau nanti dibangun, jadikan **owner-only sejak baris pertama**, bukan turunan dari akses O1.

### 5.5 Istilah yang sebaiknya dipakai

Supaya penamaan kolom, query, dan teks layar tidak dikarang sendiri:

| Yang kita sebut | Nama baku vendor | Terjemahan yang diusulkan |
|---|---|---|
| Okupansi | `Capacity` (Mindbody) · `Booking Percentage` (Vagaro) · `Utilization Rate` (Arketa) | tetap "okupansi" — sudah dipakai di O1 dan `04-flows.md` |
| Kursi terisi hari ini | `capacity indicator` | tetap |
| Nilai kredit yang masih hidup | `unearned revenue` · `deferred revenue` · `Outstanding Series` | **"kredit menggantung"** atau **"nilai kredit belum terpakai"** — hindari "liability", tidak dipakai pemilik studio Kudus |
| Nilai kredit yang hangus | tidak ada padanan langsung; Mindbody memperlakukannya sebagai unearned revenue yang kedaluwarsa | tetap "kredit hangus" (`alasan = 'hangus'`) |
| Rata-rata belanja member | `Average Revenue Analysis` (Mindbody) · `Average Spend per Subscription` (Arketa) | "rata-rata belanja per member" |
| Perbandingan bulan lalu | `Since last month` (Mindbody) · `Comparison Reports` (TeamUp) | "dibanding bulan lalu" |
| Antrean menunggu kursi | `Booking Requests` (WellnessLiving) · `waitlist` (Vagaro, Mindbody) | tetap "daftar tunggu" (`BR-4`) |
| Member yang mulai jarang datang | `At-Risk clients` (Mindbody) · `Isaac Churn Risk` (WellnessLiving) | tetap — A4 sudah memakainya |

### 5.6 Satu catatan dokumen, di luar lingkup riset

Beberapa tempat merujuk **`BR-9.1`** untuk aturan "angka uang hanya untuk pemilik":
`docs/02-rules.md` bagian 5 (baris "Peran owner & coach terpisah"), bagian 6.1 (layar A9, O1, C2),
dan `src/app/admin/page.tsx` tidak merujuk nomornya sama sekali. Tapi di tabel `BR-9`,
**`9.1` adalah baris "Member"**; yang menyebut *"lihat pendapatan"* adalah **`9.3` (Owner)**.
Rujukannya meleset dua baris. Tidak diperbaiki di sini — berkas ini hanya catatan riset —
tapi perlu dibereskan sebelum ada kode yang mengutip nomor itu di komentar.

---

## 6. Rekap verifikasi

| Vendor | Dokumentasi dashboard | Dokumentasi permission | Dibaca hari ini |
|---|:--:|:--:|:--:|
| Mindbody | ✅ dua artikel | ✅ (bagian 1 riset-peran.md) | ✅ browser |
| Vagaro | ✅ | ✅ | ✅ browser |
| WellnessLiving | ✅ | ✅ (riset-peran.md) | ✅ |
| TeamUp | ✅ | ◐ artikel tidak memuat daftar permission lengkap | ✅ |
| Arketa | ✅ dua artikel | ✅ (riset-peran.md) | ✅ |
| Momence | ⬜ hanya Corporate Dashboard | ✅ (riset-peran.md) | ◐ |
| Punchpass | ⬜ tidak punya dashboard bermetrik | ✅ | ✅ |
| Glofox | ◐ hanya snippet pencarian | ✅ (riset-peran.md, 22 Sep) | ⬜ help center kini butuh login |
| Zen Planner | ⬜ tidak ditemukan sumber primer | ⬜ | ⬜ |

**✅** ada dan dibaca · **◐** sebagian · **⬜** tidak ada
