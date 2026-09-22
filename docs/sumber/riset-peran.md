---
jenis: bahan-mentah
status: arsip sumber — BUKAN sumber kebenaran
tanggal-riset: 2026-09-22
topik: Menu dan fitur per peran (member, instruktur, front-desk, owner) di perangkat lunak manajemen studio kelas-berbasis-jadwal
---

> **Bahan mentah.** Berkas ini arsip kutipan dari dokumentasi vendor. Bukan keputusan
> produk. Kalau sesuatu di sini mau dipakai, angkat dulu jadi `BR-x.y` di
> `docs/02-rules.md` atau `UC-xxx` di `docs/03-use-cases.md`. Jangan rujuk berkas ini
> dari kode.
>
> Semua klaim di bawah menyebut URL sumbernya. Yang tidak ketemu sumber primernya
> ditulis **"tidak ditemukan sumber primer"** — tidak diisi dari ingatan.

---

## Ringkasan (5 baris)

1. Sembilan vendor berhasil diverifikasi dari halaman dokumentasi resmi mereka sendiri; Walla hanya ketemu blog vendor (bukan referensi permission), Mindbody Public API hanya mengelompokkan endpoint per sumber daya, bukan per peran.
2. Semua vendor memakai pola yang sama: **satu peran "semua akses" (owner)**, satu peran manajerial, satu peran operasional harian (front desk), dan satu peran instruktur yang paling dikunci.
3. Garis pemisah yang muncul berulang bukan "boleh lihat/tidak", tapi **cakupan baris**: `semua` vs `punya saya sendiri` — untuk jadwal, pembatalan, klien, dan payroll (Mindbody, WellnessLiving, TeamUp, Pike13).
4. Angka uang dipecah jadi tiga lapis berbeda: harga jual (front desk boleh), laporan pendapatan agregat (owner/admin saja), dan tarif bayaran staf (paling dikunci, sering peran terpisah).
5. Tiga kemampuan paling sering jadi permission tersendiri karena bisa merusak data diam-diam: **override kapasitas kelas**, **override kebijakan pembatalan**, dan **edit jumlah sesi/kredit yang sudah dibeli klien** — ketiganya menyentuh langsung invarian proyek ini.

---

## 1. Mindbody

Sumber primer (semua dari help center resmi, dibaca lewat browser karena situsnya SPA):

- <https://support.mindbodyonline.com/s/article/203253743-Staff-permissions-explained?language=en_US>
- <https://support.mindbodyonline.com/s/article/213234208-Staff-permissions-and-abilities-for-owners?language=en_US>
- <https://support.mindbodyonline.com/s/article/Staff-Permissions-Reports?language=en_US>
- <https://support.mindbodyonline.com/s/article/Staff-Permissions-Reservation-Permissions?language=en_US> (judul halaman: "Staff Permissions - Classes & Courses")
- <https://support.mindbodyonline.com/s/article/Staff-Permissions-Client-Permissions?language=en_US>
- <https://support.mindbodyonline.com/s/article/Staff-Permissions-Settings?language=en_US>
- <https://support.mindbodyonline.com/s/article/204064336-How-do-I-allow-or-remove-the-option-for-my-clients-to-cancel-online?language=en_US>

### 1.1 Peran bawaan

Mindbody tidak memakai peran tetap, melainkan **permission group** yang bisa dibuat sendiri.
Kutipan: *"The 'Manager' and 'Staff' permission groups are preset by default and can be edited based on your software package."*
(sumber: Staff permissions explained)

Halaman yang sama mencontohkan grup buatan sendiri: *"you can create a 'Front Desk' permission group that has different permissions than a 'Manager' group."*

Catatan: hasil pencarian menyebut ada tiga grup bawaan (Manager, Staff, Webmaster), tapi
artikel resminya hanya menyebut dua (Manager dan Staff). **"Webmaster" tidak ditemukan
sumber primernya** — jangan dipakai.

Di atas semua grup ada **owner login** yang terpisah dan tidak bisa ditiru grup mana pun.

### 1.2 Kategori permission (nama persis)

Marketing · Settings · Classes & Courses · Appointments · Clients · Reports · Analytics ·
Time Clock · Sales Team Management · Payment Processing · Ratings and Reviews
(sumber: Staff permissions explained)

### 1.3 Yang HANYA bisa owner (tidak bisa didelegasikan ke staf mana pun)

Dari artikel "Staff permissions and abilities for owners" — *"Certain settings in your Mindbody site can only be changed by the owner's login."*

| Hal | Kutipan |
|---|---|
| Info penagihan langganan | *"Your staff members cannot change the card used to pay your monthly Mindbody subscription."* |
| Integrasi API | *"Only the owner's login can allow or remove these integrations."* |
| Layanan premium / opt-in program pihak ketiga | *"requires the owner's login"* |
| Pengaturan listing aplikasi mobile | *"Only the owner's login can manage your Mindbody app settings"* |
| Marketing Suite | *"By default, the Marketing Suite is only accessible with the owner's login."* |

Pola: yang owner-only adalah **hal yang mengikat bisnis ke pihak luar** (uang langganan,
API, listing publik, program mitra) — bukan operasi harian.

### 1.4 Instruktur: BOLEH vs TIDAK BOLEH

Contoh pembuka artikel Staff permissions explained menjelaskan maksud sistemnya:
*"You might want teachers to access only their own schedules and their own payroll reports."*

Mindbody mewujudkannya lewat **pasangan permission "everyone's" vs "own only"**:

| Permission | Isi |
|---|---|
| `Schedule at a Glance/Attendance (Everyone's schedule)` | *"lists a daily view of every appointment, class, and course booking at your business for the day with the name of every client and staff member"* |
| `Schedule at a Glance/Attendance (Own schedule ONLY)` | *"allows the staff member to see only their own bookings"* — dan *"This permission is overridden by the ... (Everyone's schedule) permission."* |
| `Cancellations` | staf bisa melihat dan memulihkan **semua** pembatalan |
| `Cancellations - Only allow staff to view their own cancellations` | hanya booking dia sendiri |
| `Payroll Report/Payroll Export/Tips/Assistant/Commission Reports (All Staff)` | *"They can see everyone's payroll information, including how much people are paid."* |
| `Payroll .../ (Users can view their own only)` | *"They cannot see other staff members' pay information."* |

Artikel Staff permissions explained menyebut keempat permission "own only" ini sebagai
**"four restrictive permissions"** yang *"prevent staff from fully utilizing some of the
software features"* — yaitu: refund ke kartu kredit, Schedule at a Glance (own only),
Cancellations (own only), dan Payroll (own only). Artinya vendor sendiri menandai ini
sebagai pembatas yang disengaja, bukan bug.

**Yang tidak boleh diberikan sembarangan ke instruktur** (dari Staff Permissions - Classes & Courses):

- `Override event drop-in capacities` — *"allows staff to override capacity restrictions, giving the option to add clients to a class or course directly or from the waitlist. If enabled, staff members are presented an alert message with the option to fill the class above the capacity. If disabled, staff are not able to fill the class above the set capacity."*
- `Make past reservations` — *"allows staff to make client reservations for classes and courses in the past."* Catatan penting: *"If disabled, staff can still make past reservations on the same day (i.e., an earlier time that same day)."*
- `Make unpaid reservations` — *"allows staff to book class and course reservations for clients without collecting payment from them."*

Dari Staff Permissions - Clients:

- `Override cancel policy` — *"Lets staff early cancel appointments, classes, and courses past the cancellation window, so that clients are not charged for a late cancellation."*
- `Edit client's series count and session numbers` — *"allows your staff to edit the number of sessions available in a pricing option from a client's Account Details screen. Example: Staff can change the number of yoga sessions purchased on a five-class card from five to six."*
- `Edit client's series (duration/reassign payment)` — *"the ability to edit the duration of a pricing option after a client has bought it."*
- `Override service category rules when reassigning payments` — *"allows staff to move visits from one purchase to another that is unrelated to the visit being moved."*

Yang **memang wajar** untuk instruktur (dari Classes & Courses):

- `View reservations`, `Make reservations` (catatan: *"If disabled, staff members cannot mark clients as arrived/signed in for class."*), `Add/edit class notes`, `Launch Sign-In Screen`.

### 1.5 Batas front-desk vs owner soal angka keuangan

Reports dipecah sangat halus. Beberapa yang relevan (sumber: Staff Permissions - Reports):

| Permission | Batas yang dibuat |
|---|---|
| `Cash Drawer - Run for current date` vs `Cash Drawer - Run for date range` | front desk boleh tutup kas hari ini, tidak boleh menarik rentang tanggal |
| `Sales/Sales by Category/Sales by Services` | akses laporan penjualan agregat |
| `Attendance with Revenue` | *"shows how much revenue each visit generates for your business"* — butuh rantai izin: `Ability to view all clients` + `Analysis Reports` + `Schedule at a Glance (Everyone's Schedule)` |
| `Analysis Reports` | mencakup `Average Revenue Analysis`, `Earned Revenue`, `Revenue By Class`, `Clients Per Teacher`, `No Shows`, `Unused Sessions (Outstanding Series)` |
| `Export report information` | dipisah sendiri karena *"gives a staff member the ability to save your sensitive client data outside of your Mindbody site"* |
| `Account Balances & Invoices` | lihat saldo klien dan cetak invoice |
| `View MB Payouts Report` | laporan payout |

Dari Staff Permissions - Settings, permission uang yang dipisah satu per satu:
`Edit pricing option price`, `Edit pricing option tax rates`, `Edit sale price and count`,
`Edit sale discount`, `Edit sale date`, `Void/edit past sales`, `Issue sale refunds`,
`Issue sale refunds to credit cards`, `Staff pay rates`, `Apply No-Show Late Cancel Fees`.

`Staff pay rates` — *"Allows the group to access, add, edit, and delete staff pay rates for classes ... Allows access to the staff Pay Rates Report (this is different from the staff permission to access the Payroll report)."*
Jadi Mindbody memisahkan **melihat payroll** dari **mengubah tarif bayaran**.

Permission administratif berbahaya lain di Settings:
`Administer permission groups` (wajib untuk mengubah permission siapa pun),
`Administer staff logins`, `Mass cancel classes/events/appointments`
(*"a feature that can be used to mass-cancel classes and appointments based on their date, time, service provider, and location"*),
`Merge duplicate/Unmask client records`, `Deactivate Multi-Factor Authentication (MFA) for other users`,
`Schedule substitute teachers for classes/events`.

### 1.6 Sisi klien (self-service)

Dari "How to allow clients to cancel their reservations online":

- *"Clients can cancel their class reservations in the 'My Schedule' section of their account on your Mindbody consumer site, even if the class cannot be booked online."*
- Setelannya bernama `Enable Cancellations in Consumer Mode`, per kategori layanan, dengan field `When` berisi berapa menit sebelum kelas mulai klien masih boleh membatalkan.

Artikel terkait yang disebut halaman itu menunjukkan daftar self-service lain (judul artikel = bukti fiturnya ada):
"How to allow clients to make reservations for each other",
"How to allow clients to reschedule appointments (Mindbody consumer site)",
"How to allow or disable clients to book appointments online",
"How to allow clients to pay off negative account balances (Mindbody consumer site)",
"How to cancel all upcoming recurring reservations or appointments at once".

Kuncinya: tiap kemampuan self-service klien adalah **setelan yang bisa dimatikan studio**,
bukan sesuatu yang selalu ada.

### 1.7 Mindbody Public API

Sumber: <https://developers.mindbodyonline.com/Resources/Endpoints>

Endpoint dikelompokkan per **sumber daya**, bukan per peran: Appointment · Class · Client ·
Sale · Site · Staff. Ada endpoint `View Staff Permissions` di grup Staff.

**Tidak ditemukan sumber primer** yang memetakan endpoint ke peran tertentu di halaman
daftar endpoint. Dokumentasi menyebut sebagian endpoint butuh User Token di header, tapi
pemetaan lengkap endpoint↔peran tidak tersedia publik tanpa akun developer.

---

## 2. Momence

Sumber primer:
- <https://help.momence.com/en/articles/12030073-staff-accounts-teachers-faq-s>
- <https://help.momence.com/en/collections/4717996-staff-training-staff-accounts-2fa>
- <https://help.momence.com/en/articles/8412193-front-desk-role-training-with-time-stamps-by-topic>

### Peran bawaan

`Admin` · `Operator` · `Front Desk` · `Teacher` (instruktur).

Kutipan: Admin digambarkan sebagai *"an all-powerful, all-seeing role that can do all the
things in Momence"*. Operator *"can do many things and falls short of Admin but enjoys
higher privileges than a Front Desk role"*.

Peran bisa diubah: *"the role explanations listed off to the right are general overviews of
what each role can do. These can be modified with more or less permissions from that
settings wheel icon."* Ada juga konsep **starter role** — bikin peran custom dengan
menyalin izin peran lain lalu dikurangi.

Jalur pengaturan: `Settings > Roles > Manage Staff > Edit a staff's role`, dan bulk lewat
`Settings > Staff Management > Roles`.

### Instruktur: BOLEH vs TIDAK BOLEH

Dari "Staff Accounts / Teachers FAQ's":

Boleh:
- Melihat laporan payroll **miliknya sendiri**, kalau admin mengaktifkannya.
- Meminta pengganti (substitute) dan melihat "Active Requests" di bawah **My Pages**.
- Menerima notifikasi saat ditugaskan ke kelas.
- Mengirim pesan ke pelanggan — **hanya kalau** diberi izin Front Desk atau peran Teacher-nya diedit.

Tidak boleh (bawaan):
- **Melihat kolom revenue di laporan payroll.** Ini temuan paling tajam: instruktur boleh
  lihat bayarannya sendiri, tapi tidak boleh lihat berapa uang yang kelasnya hasilkan.
- Front Desk dan Operator **tidak** bisa melihat laporan payroll secara bawaan.

Contoh granularitas izin yang dikutip help center: `Customers: Customer Notes: View and Manage`.

---

## 3. Arketa

Sumber primer: <https://help.sutrapro.com/en/articles/8276778-roles-and-permissions>
(help center resmi Arketa; lihat juga <https://help.sutrapro.com/en/articles/11201237-custom-permissions>
dan <https://help.sutrapro.com/en/articles/5675303-adding-staff-setting-permissions>)

Arketa memberi matriks peran paling rapi dari semua vendor. Peran bawaan:
`Admin` · `Manager` · `Manager (No Payroll)` · `Franchisee` · `Front Desk` · `Guest`.

| Area | Admin | Manager | Manager (No Payroll) | Franchisee | Front Desk | Guest |
|---|---|---|---|---|---|---|
| Inbox | ✓ | ✓ | ✓ | ✓ | — | — |
| POS | Penuh | Penuh | Penuh | Penuh | Penuh | — |
| Jadwal | Penuh (export, CRUD kelas) | Penuh | Penuh | Penuh | Kelas/Event **view only**; Appointment/Reservation penuh | *"View own schedule; manage own future reservations"* |
| Klien | Penuh (refund semua, notes semua, timeline) | Penuh | Penuh | Penuh | *"Full (refunds: all, notes: all; no timeline)"* | Client notes saja |
| Marketing/Automation | Penuh | ✓ | ✓ | ✓ (automations & broadcasts) | — | — |
| Reports/Analytics | Penuh (Reports, Reports V2, Analytics V2) | **— (disabled)** | **— (disabled)** | Penuh | *"Limited (specific reports only; no export, favorites, or row actions)"* | — |
| Settings/Team/Payroll | Penuh (settings, team, pay rates, payroll, accounting) | Luas, termasuk pay rates & payroll reporting | *"Payroll disabled; Segments ✓"* | *"Limited settings; front desk reporting; payroll mostly disabled"* | *"Front desk reporting; team mostly off; time cards: create only"* | *"Self only (time cards); block payments"* |

Tiga hal menarik:

1. **`Manager` punya payroll tapi TIDAK punya Analytics.** Arketa memisahkan "boleh bayar
   orang" dari "boleh lihat performa bisnis" — arah pemisahan yang berlawanan dengan dugaan
   biasa.
2. **`Manager (No Payroll)` ada sebagai peran bawaan tersendiri**, bukan sekadar toggle.
   Vendor menganggap "manajer tanpa akses gaji" cukup umum untuk dijadikan preset.
3. **`Guest` = peran instruktur/kontraktor di Arketa.** Ia hanya *"view own schedule;
   manage own future reservations"*, hanya bisa client notes, dan *"block payments"*.
   Tidak ada akses POS sama sekali.

Perhatikan juga: Front Desk **boleh refund semua** tapi **tidak boleh lihat client
timeline**, dan laporannya tanpa export. Sama seperti Mindbody, **export dipisah** dari
**lihat**.

---

## 4. WellnessLiving

Sumber primer:
- <https://help.wellnessliving.com/en/articles/9072018-staff-roles>
- <https://help.wellnessliving.com/en/articles/9649091-staff-role-permissions>
- <https://help.wellnessliving.com/en/articles/9976099-create-or-modify-a-staff-role>

### Empat peran bawaan (kutipan persis)

| Peran | Deskripsi resmi |
|---|---|
| `Business Owner` | *"Business Owners have all permissions in your business."* |
| `Front Desk` | *"Front Desk staff members can manage schedules, add holidays, view, create, and flag clients, and leave notes."* |
| `Instructor` | *"Instructors can manage only their own services."* |
| `Manager (Location Owner)` | *"Managers and Location Owners have all permissions, but only for their location(s)."* |

Perhatikan pola: Manager dibatasi **per lokasi**, Instructor dibatasi **per layanan miliknya
sendiri**. Dua sumbu pembatas berbeda.

### Kategori permission

Location · Global Control · Business · Billing · Interface · Dashboard · Staff · Booking ·
Services and Schedules · Online Store · Integrations · Marketing · Notifications · Clients ·
Reports · Forms · Task Management · FitBUILDER · CAASI

### Permission "only my ..." (nama persis)

- `Only my schedules` — lihat dan ubah jadwalnya sendiri saja
- `Only my clients` — *"Access only clients booked into their services"*
- `Only my reports` — laporan yang terkait dirinya saja
- `Only my tasks` — hanya tugas yang ditugaskan padanya

Ini padanan langsung pola "own only" Mindbody, tapi diterapkan di empat sumbu sekaligus,
termasuk **klien**. Mindbody tidak punya "own clients only"; WellnessLiving punya.

### Permission keuangan (nama persis)

`Manage billing information` · `View sales reports` · `View all reports` ·
`View Cash Closeout Report` · `Perform cash closeout` ·
`Override pricing and billing at checkout`

Catatan: `View Cash Closeout Report` dan `Perform cash closeout` **dipisah** — melihat
rekap kas bukan hal yang sama dengan menutup kas.

Deskripsi resmi tujuan sistemnya: *"allow you to limit your staff members' ability to make
modifications to your business configuration or access sensitive information."*

---

## 5. Glofox / ABC Glofox

Sumber primer: <https://support.glofox.com/hc/en-us/articles/52585050344852-Staff-Roles-and-Default-Permissions>
(lihat juga <https://support.glofox.com/hc/en-us/articles/46467475896340-Getting-Started-With-Staff-and-Permissions>)

Peran bawaan: `Super Admin` · `Admin` · `Receptionist` · `Trainer`.

Glofox menerbitkan matriks default lengkap. Peringatan vendor sendiri: *"The access shown
in this article is the default access for each role. What a staff member can see or do may
also vary by subscription, branch configuration, role, and any permission overrides."*

### Ringkasan per area (default)

| Permission | Super Admin | Admin | Receptionist | Trainer |
|---|---|---|---|---|
| `Classes Calendar` (akses & kelola kelas di kalender bersama) | Full | Full | Full | **Full** |
| `Classes` (buat/ubah/hapus kelas) | Full | Full | **No access** | **No access** |
| `Classes Details Tab` (+ Manage Spots) | View | View | View | **View** |
| `Bulk Send Message` (kirim pesan massal ke daftar kelas) | Create | Create | Create | **No access** |
| `Clients` (lihat rekam klien) | View | View | View | **No access** |
| `Clients Export` | View | View | View | **No access** |
| `Custom Charges` (tagihan custom dari panel klien) | Full | Full | Full | **Full** |
| `Complimentary Funds` (tambah dana gratis ke saldo member) | Full | Full | Full | **Full** |
| `Leads` | Create/view | Create/view | Create/view | **No access** |
| `Membership Plans` / `Membership Plan Price` | Full / Edit | Full / Edit | No access | No access |
| `Membership Next Payment Date` | Update | Update | Update | **No access** |
| `Discounts` | Full | **View saja** | No access | No access |
| `Sales Report`, `Transactions Report`, `Payouts Report`, `Scheduled Revenue Report`, `Account Balance` | View | View | **No access** | **No access** |
| `Money Owed Report`, `Failed Payments Report` | View | View | **View** | **No access** |
| `Members` report / `Members Export` | View | View | View | **No access** |
| `Cart Pricing` (override harga saat checkout) | Update | Update | **Update** | **No access** |
| `Cart Joining Fee` (override joining fee) | Full | Full | Full | **Full** |
| `Cart Complimentary Payment Method` | Full | Full | Full | **Full** |
| `Retail Price` (edit harga jual produk) | Edit | Edit | Edit | **Edit** |
| `Attendance Policy Settings` (aturan no-show & late-cancel) | CVE | CVE | **No access** | **No access** |
| `Studio`, `Settings Payments`, `Booking Settings`, `Tax Settings`, `Fees Settings`, `Forms`, `Integrations Settings` | View/edit | View/edit | **No access** | **No access** |
| `Global Search` | View | View | View | **No access** |
| `Bulk Updates` | **No access** | **No access** | **No access** | **No access** |

### Yang menonjol

- **Trainer `No access` ke `Clients`** — instruktur tidak bisa membuka rekam klien sama
  sekali, tapi tetap punya akses penuh ke kalender kelas. Pemisahan "boleh lihat kelasnya,
  tidak boleh lihat orangnya".
- **Trainer `No access` ke semua laporan revenue** termasuk `Money Owed` dan
  `Failed Payments` yang masih dibuka untuk Receptionist.
- **Trainer TETAP punya `Custom Charges`, `Complimentary Funds`, `Cart Joining Fee`,
  `Cart Complimentary Payment Method`, dan `Retail Price`.** Ini kelihatan tidak konsisten
  — peran yang tidak boleh melihat rekam klien tetap boleh menambah dana gratis ke saldo
  member. Contoh nyata bahwa matriks permission vendor besar pun punya lubang.
- **`Bulk Updates` = No access untuk semua peran**, termasuk Super Admin. Vendor menutup
  aksi massal secara default untuk semua orang.
- **`Discounts`: Super Admin full, Admin hanya View.** Diskon diperlakukan lebih sensitif
  daripada harga membership.
- Tentang Trainer di kalender, dokumen mencatat: *"Trainer access can be limited to their
  own classes."*

Catatan tambahan dari halaman setup: tiap user Glofox butuh nomor telepon dan email unik —
kalau satu orang perlu dua peran (mis. Receptionist **dan** Trainer), ia harus dibuatkan
akun kedua dengan email lain.

---

## 6. Punchpass

Sumber primer: <https://support.punchpass.com/en/articles/1033097-are-there-different-user-levels-for-my-instructors>
(lihat juga <https://support.punchpass.com/en/articles/4685635-adding-instructors-staff-and-other-users-to-your-punchpass-account>)

Punchpass paling sederhana: **tiga tingkat**, tanpa permission granular.

| Peran | Kutipan persis |
|---|---|
| `Admin` | *"full access to all features, including account settings, billing, reporting, customer management, and class scheduling."* |
| `Restricted` | *"limited access. This role can take attendance, start online classes, cancel classes, assign passes, add new customers and view customer profiles, and add content to the Content Library. They cannot access billing, reports, download customer information, or access the Punchpass setup features (Manage Settings, Classes, or Passes)."* |
| `Attendance-Only` | *"the most limited role, allowing users to check in customers for classes and mark attendance. They can start online classes. They cannot edit class details, view reports, or manage customer accounts."* |

Perhatikan: `Restricted` **boleh assign passes** (memberi paket ke klien) tapi **tidak boleh
download customer information**. Lagi-lagi export dipisah dari akses.

Punchpass juga membedakan **"Users with Log-In Access"** dari **"Active Instructors"** —
yang terakhir hanya nama yang muncul di jadwal publik, tidak otomatis punya login. Agar
instruktur bisa absen sendiri, admin harus (1) membuatnya user, lalu (2) menandainya sebagai
instruktur. Dua konsep terpisah.

Akses `Settings` butuh level Administrator, dan saat admin baru ditambahkan **semua admin
lama dapat email notifikasi** — audit trail untuk eskalasi hak akses.

---

## 7. Pike13

Sumber primer:
- <https://help.pike13.com/knowledge/hc/en-us/articles/205838203-staff-member-roles>
- <https://help.pike13.com/hc/en-us/articles/360029378352-Staff-Member-Permissions-Guide>
- <https://help.pike13.com/hc/en-us/articles/360029642172-Staff-Permissions>

| Peran | Kutipan persis |
|---|---|
| `Primary Owner` | *"Only one primary owner is allowed per site"*; satu-satunya yang bisa menunjuk owner pengganti. *"Only the Owner (Primary) can modify the permissions of other Owners."* |
| `Owner` | *"manage all aspects of your Pike13 site"* — staff, services, plans & passes, documents, merchandise, **pay rates, run payroll, dan semua laporan** |
| `Manager` | *"add and manage Staff Members, Services, Plans & Passes, and Documents"* — **tidak** bisa menjalankan payroll atau mengakses semua laporan |
| `Staff Member` | *"view the full Schedule, sell products, add new Clients, and take attendance"* |
| `Limited Staff Member` | *"only view their own schedule and have limited access to info about the clients they serve"* — dan **"Limited staff members cannot accept payments."** |

Aturan hierarki eksplisit: *"To change another user's permission level, you must have a
higher level than they do."* — tidak ada peran yang bisa menaikkan hak akses di atas dirinya
sendiri.

Garis Manager↔Owner di Pike13 persis di **payroll + laporan lengkap**. Manager boleh
mengelola orang dan produk, tapi tidak boleh melihat uangnya.

Pike13 juga memisahkan antarmuka per peran: **Staff App** (instruktur & manager: absen,
jual produk, lihat roster) vs **Kiosk App** (tablet front desk: self check-in, waiver
digital, pendaftaran klien baru).

---

## 8. TeamUp (goteamup.com)

Sumber primer:
- <https://support.goteamup.com/en/articles/9327561-edit-staff-member-permissions>
- <https://support.goteamup.com/en/articles/9327385-adding-staff-members>

> **Hati-hati:** `teamup.com` (Teamup Calendar) adalah **produk lain**, bukan software gym
> ini. Sumber yang sah hanya `support.goteamup.com`. Hasil pencarian mencampur keduanya.

Dua jenis akun: **`Admin`** (*"Admins have access to all sections on TeamUp"*) dan
**`Limited Permissions`** (*"will only be allowed to view and/or manage their allowed
sections"*).

Permission yang bisa diberikan (nama & deskripsi persis):

| Permission | Deskripsi |
|---|---|
| `Revenue` | *"Access revenue reports and confirm pending billing"* |
| `Customers` | *"View all customers and manage details about them"* |
| `Customer Payments` | *"View all customer payments and manage details about them"* |
| `Discount Codes` | *"Create and manage discount codes"* |
| `Store` | *"Manage your store. Create and manage products"* |
| `Developer` | *"Access to the Customer Site section"* |
| `Manage Sessions` | *"Manage session details, prices, and attendees"* |
| `Manage Attendances` | *"Manage session attendees without access to payment details"* |

Ini bagian paling berharga dari TeamUp — **dua permission yang dipasangkan sengaja**:

- `Manage Sessions` = kelola sesi **termasuk harga**
- `Manage Attendances` = kelola peserta **tanpa akses detail pembayaran**

Keduanya punya **scope**: `None` / `All sessions` / `Sessions they instruct`.

Dan ada jebakan yang vendor dokumentasikan sendiri:
*"Scope options limiting access to 'Sessions they instruct' only apply to staff members also
assigned the Instructor role. Non-instructors with these permissions receive full account
access."*

Artinya scope "punya saya sendiri" **bergantung pada relasi data (siapa instruktur sesi
ini)**, dan kalau relasi itu kosong, pembatasan gagal terbuka (fail-open). Ini pelajaran
desain langsung: filter berbasis kepemilikan harus fail-closed.

---

## 9. Walla

Sumber yang dicoba:
- <https://help.hellowalla.com/> — **tidak bisa diakses** (butuh login / akses ditolak)
- <https://www.hellowalla.com/blog/how-wallas-new-permissions-can-keep-you-in-control-of-studio-security-and-operations> — blog vendor, bukan referensi permission

**Daftar peran bawaan Walla: tidak ditemukan sumber primer.** Blog vendor tidak menyebut
nama peran apa pun.

Yang bisa dikutip dari blog vendor (halaman milik vendor sendiri, jadi sah sebagai bukti
fitur itu ada, tapi bukan referensi permission lengkap):

- Lokasi pengaturan: `Business Settings > Staff Permissions`
- Nama permission yang disebut: `Manage Client Plans`, `Gift Card Settings`, `Create a Course`,
  `Client Profile`, `Create an Enrollment`, `Add Enrollment to Location`,
  `All Marketing Permissions`, `All Location Sections`, `Create a Business Location`,
  `Sensitive Info Tab`, `Create Products`
- `Sensitive Info Tab` = *"Allow access to staff compensation information"* — sekali lagi,
  **data kompensasi staf diperlakukan sebagai kelas data tersendiri**, bukan bagian dari
  "laporan".

---

## 10. Stripe (pola umum pemisahan peran keuangan vs operasional)

Sumber primer: <https://docs.stripe.com/get-started/account/teams/roles>

Stripe bukan software studio, tapi referensi perannya adalah contoh paling bersih dari
pemisahan keuangan/operasional. Yang relevan untuk proyek ini:

| Peran | Boleh | Tidak boleh |
|---|---|---|
| `Account owner` | semua, termasuk menutup akun. *"There can only be one Owner for an account."* | — |
| `Administrator` | *"see and manage almost everything"* | *"Delete the default bank account"*, *"Change the account owner"* |
| `IAM Administrator` | undang/hapus anggota tim, kelola grup, lihat audit log | **apa pun di luar manajemen akses** — tidak bisa lihat saldo, laporan keuangan, pembayaran |
| `Analyst` | refund, payout, buat laporan keuangan, export | *"Edit payout schedule"*, *"Add and edit bank account details"*, kelola anggota tim |
| `Refund Analyst` | *"View and refund payments"*, issue credit notes | *"Create payments"*, **"View balance"**, lihat laporan keuangan |
| `Support Specialist` | refund, resolve dispute, kelola produk & pelanggan | *"Create, view, and download financial reports"*, ubah setelan akun |
| `View Only` | lihat semua + *"Create, view, and download financial reports"* | mengubah apa pun |
| `Accountant` | laporan akuntansi, chart of accounts, lihat saldo/payout | refund, bayar, ubah apa pun operasional |

Tiga pola yang layak dicontek:

1. **`IAM Administrator` adalah peran murni manajemen akses** — bisa mengatur siapa boleh
   apa, tapi nol akses data. Dan: *"They also can't assign a user to the Administrator or
   Super Administrator role."* Tidak bisa mengangkat dirinya sendiri.
2. **`Refund Analyst` boleh refund tapi tidak boleh lihat saldo.** Memperbaiki masalah
   pelanggan ≠ melihat posisi keuangan bisnis. Ini persis batas front-desk yang dicari.
3. **`Accountant` dan `View Only` boleh melihat semua angka tapi tidak boleh menyentuh
   apa pun.** Kebalikan dari Refund Analyst. Dua sumbu ortogonal: *lihat angka* dan
   *ubah keadaan*.

Peringatan keamanan eksplisit dari Stripe, relevan untuk desain peran mana pun:
*"These roles can invite users to your account. If an attacker compromises a user with one,
they can invite additional users under their control."*

Dan: *"If you assign a user multiple roles, they're assigned all the permissions of each
individual role. Be cautious of conflicts and unintended authority."* — peran bersifat
**aditif**, tidak ada "deny" yang menang.

---

## 11. Tabel perbandingan peran lintas vendor

Baris = fungsi peran. Sel = nama peran persis di vendor itu.

| Fungsi | Mindbody | Momence | Arketa | WellnessLiving | Glofox | Punchpass | Pike13 | TeamUp |
|---|---|---|---|---|---|---|---|---|
| Pemilik mutlak | `owner login` (terpisah dari grup) | `Admin` | `Admin` | `Business Owner` | `Super Admin` | `Admin` | `Primary Owner` / `Owner` | `Admin` |
| Manajerial | grup `Manager` | `Operator` | `Manager`, `Manager (No Payroll)` | `Manager (Location Owner)` | `Admin` | — | `Manager` | — |
| Front desk / operasional | grup buatan `Front Desk` | `Front Desk` | `Front Desk` | `Front Desk` | `Receptionist` | `Restricted` | `Staff Member` | `Limited Permissions` |
| Instruktur | grup `Staff` + permission "own only" | `Teacher` | `Guest` | `Instructor` | `Trainer` | `Attendance-Only` | `Limited Staff Member` | `Limited Permissions` + role `Instructor` |
| Multi-lokasi / franchise | (lewat Work locations) | Corporate Dashboard | `Franchisee` | `Manager (Location Owner)` | (branch config) | — | — | — |
| Jumlah peran bawaan | 2 grup preset + owner | 4 | 6 | 4 | 4 | 3 | 5 | 2 |
| Permission granular? | Ya, sangat (11 kategori) | Ya | Ya (+ Custom Permissions) | Ya (19 kategori) | Ya | **Tidak** | Ya | Ya |

### Perbandingan kemampuan instruktur (default vendor)

| Kemampuan | Mindbody | Momence `Teacher` | Arketa `Guest` | WellnessLiving `Instructor` | Glofox `Trainer` | Punchpass `Attendance-Only` | Pike13 `Limited Staff` |
|---|---|---|---|---|---|---|---|
| Lihat jadwalnya sendiri | ✓ (`own schedule ONLY`) | ✓ | ✓ | ✓ (`Only my schedules`) | ✓ | ✓ | ✓ |
| Lihat jadwal semua orang | hanya jika diberi `Everyone's schedule` | — | — | — | ✓ (kalender bersama) | — | — |
| Absen / check-in peserta | ✓ (butuh `Make reservations`) | ✓ | — | ✓ | ✓ | ✓ | ✓ |
| Buka rekam klien | hanya jika `View client info` | tidak disebut | notes saja | `Only my clients` | **No access** | — | *"limited access to info about the clients they serve"* |
| Terima pembayaran / POS | hanya jika diberi | — | **block payments** | — | — | — | **"cannot accept payments"** |
| Lihat bayarannya sendiri | ✓ (`Users can view their own only`) | ✓ (jika admin aktifkan) | — | `Only my reports` | — | — | — |
| Lihat pendapatan bisnis | ✗ | **✗ (kolom revenue disembunyikan)** | ✗ | ✗ | **✗ semua laporan revenue** | ✗ | ✗ |
| Ubah/buat kelas di jadwal | ✗ tanpa `Manage class/event schedules` | — | ✗ | ✗ | **No access** ke `Classes` | ✗ (*"cannot edit class details"*) | ✗ |
| Batalkan kelas | butuh `Cancel reservations` | — | — | — | — | **✗** (tapi `Restricted` boleh) | — |
| Override kapasitas | butuh `Override event drop-in capacities` | tidak ditemukan sumber primer | tidak ditemukan sumber primer | tidak ditemukan sumber primer | tidak ditemukan sumber primer | tidak ditemukan sumber primer | tidak ditemukan sumber primer |

---

## 12. Pola yang konsisten di banyak vendor

**P1. Empat lapis peran, bukan lebih.**
Owner → Manager → Front desk → Instruktur. Muncul di Mindbody, Arketa, WellnessLiving,
Glofox, Pike13. Punchpass memampatkannya jadi tiga, TeamUp jadi dua + permission. Tidak ada
vendor yang punya lebih dari enam peran bawaan.
(sumber: masing-masing halaman peran di bagian 1–8)

**P2. Batas instruktur adalah cakupan baris, bukan menu.**
Instruktur dapat layar yang sama, isinya difilter. Mindbody: `(Own schedule ONLY)`,
`Cancellations - Only allow staff to view their own`, `Payroll ... (Users can view their own
only)`. WellnessLiving: `Only my schedules`, `Only my clients`, `Only my reports`,
`Only my tasks`. TeamUp: scope `Sessions they instruct`. Pike13: *"only view their own
schedule"*.

**P3. Angka pendapatan bisnis ditutup untuk instruktur di SEMUA vendor.**
Tidak ada satu pun vendor yang secara default memberi instruktur akses laporan revenue.
Momence bahkan menyembunyikan *kolom* revenue di laporan payroll yang boleh dilihat
instruktur — dia boleh tahu bayarannya, tidak boleh tahu omzetnya.

**P4. Tarif bayaran staf adalah kelas data tersendiri, bukan "laporan".**
Mindbody memisahkan `Staff pay rates` dari permission payroll report dan menyatakannya
eksplisit: *"this is different from the staff permission to access the Payroll report."*
Arketa menjadikan `Manager (No Payroll)` peran bawaan. Pike13 menaruh pay rates + payroll
sebagai garis pemisah Manager↔Owner. Walla menamainya `Sensitive Info Tab`.

**P5. Export dipisah dari view.**
Mindbody: `Export report information` — *"gives a staff member the ability to save your
sensitive client data outside of your Mindbody site."* Arketa Front Desk: *"no export."*
Glofox punya `Clients Export`, `Leads Export`, `Members Export` terpisah dari `Clients`,
`Leads`, `Members`. Punchpass `Restricted`: *"cannot ... download customer information."*

**P6. Override kebijakan = permission tersendiri.**
Mindbody `Override cancel policy`, `Override event drop-in capacities`,
`Override service category rules when reassigning payments`. WellnessLiving
`Override pricing and billing at checkout`. Glofox `Cart Pricing`. Aturan bisnis bisa
ditembus — tapi menembusnya selalu hak akses terpisah, bukan efek samping dari punya akses
ke layar itu.

**P7. Mengubah kredit/sesi klien yang sudah dibeli adalah permission tersendiri.**
Mindbody memecahnya jadi tiga: `Edit client's series count and session numbers`,
`Edit client's series (duration/reassign payment)`, `Override service category rules when
reassigning payments`.

**P8. Aksi massal dan destruktif dikunci lebih ketat dari aksi satuan.**
Mindbody `Mass cancel classes/events/appointments`, `Merge duplicate/Unmask client records`.
Glofox `Bulk Updates` = No access untuk **semua peran termasuk Super Admin**.
Momence/Arketa menyediakan bulk role assignment tapi hanya di level admin.

**P9. Manajemen akses itu sendiri adalah permission.**
Mindbody `Administer permission groups` + `Administer staff logins` +
`Deactivate Multi-Factor Authentication (MFA) for other users`. Pike13: *"To change another
user's permission level, you must have a higher level than they do."* Stripe memberinya
peran sendiri (`IAM Administrator`). Punchpass mengirim email ke semua admin lama saat admin
baru ditambah.

**P10. Self-service klien = setelan studio, bukan hak bawaan.**
Mindbody: `Enable Cancellations in Consumer Mode` per kategori layanan, dengan field `When`
(menit sebelum mulai). Judul artikel Mindbody lainnya menunjukkan hal yang sama untuk
booking online, reschedule, booking untuk orang lain, dan melunasi saldo negatif — semuanya
bisa dimatikan.

**P11. Klien punya layar yang staf tidak punya, dan sebaliknya.**
Sisi klien: `My Schedule` (Mindbody), `My Pages` (Momence — tempat instruktur melihat
"Active Requests" substitusi). Vendor memberi tiap peran *beranda miliknya sendiri*, bukan
satu dashboard yang difilter.

---

## 13. Yang vendor-nya berbeda pendapat

**B1. Apakah instruktur boleh melihat rekam klien?**
- **Tidak sama sekali:** Glofox `Trainer` = `No access` ke `Clients` dan bahkan `Global Search`.
- **Ya, tapi hanya kliennya sendiri:** WellnessLiving `Only my clients`; Pike13 *"limited access to info about the clients they serve."*
- **Ya, penuh, kalau diberi:** Mindbody (`View client info` + `Ability to view all clients` tidak punya varian "own only").
- **Catatan/notes saja:** Arketa `Guest`.

Tidak ada konsensus. Ini keputusan yang harus diambil sendiri, bukan disalin.

**B2. Apakah instruktur boleh menyentuh uang sama sekali?**
- **Tegas tidak:** Pike13 *"Limited staff members cannot accept payments"*; Arketa `Guest` *"block payments"*.
- **Anehnya boleh:** Glofox `Trainer` tetap punya `Custom Charges`, `Complimentary Funds`, `Cart Joining Fee`, `Cart Complimentary Payment Method`, dan `Retail Price` — meski tidak boleh melihat rekam klien maupun laporan apa pun. Kontradiksi internal di matriks vendor sendiri.
- **Tergantung setelan:** Mindbody, Momence, TeamUp.

**B3. Manajer: payroll atau analytics?**
- **Arketa `Manager`:** punya payroll & pay rates, **tapi Reports/Analytics disabled**.
- **Pike13 `Manager`:** kebalikannya — tidak bisa payroll maupun laporan lengkap; itu milik Owner.
- **WellnessLiving `Manager (Location Owner)`:** semua permission, dibatasi per lokasi saja.
Tiga jawaban berbeda untuk pertanyaan yang sama.

**B4. Berapa banyak granularitas yang sehat?**
- **Punchpass:** tiga peran tetap, tanpa permission granular sama sekali. Studio kecil, dan itu disengaja.
- **Mindbody:** ratusan permission di 11 kategori, dengan rantai dependensi antar-permission (mis. `Attendance with Revenue` butuh tiga permission lain aktif).
- **Arketa/Momence:** peran preset + custom role dengan "starter role" untuk menyalin lalu mengurangi.
Untuk satu studio pilates, arah Punchpass jauh lebih dekat dari arah Mindbody.

**B5. Front desk boleh refund?**
- **Arketa `Front Desk`:** *"refunds: all"* — ya, penuh.
- **Mindbody:** `Issue sale refunds` dan `Issue sale refunds to credit cards` permission terpisah, dan yang kedua ditandai vendor sebagai salah satu dari "four restrictive permissions".
- **Glofox `Receptionist`:** tidak ada baris refund di matriks; tapi punya `Cart Pricing` (override harga).
- **Punchpass `Restricted`:** *"cannot access billing."*

**B6. Satu orang, dua peran?**
- **Stripe:** boleh, dan peran bersifat aditif — *"they're assigned all the permissions of each individual role."*
- **Glofox:** tidak boleh — butuh akun kedua dengan email dan nomor telepon berbeda.
- **TeamUp:** peran `Instructor` adalah *penanda relasi*, bukan set izin; ia hanya mengaktifkan scope "Sessions they instruct" pada permission lain. Kalau penanda itu tidak ada, pembatasan **gagal terbuka**: *"Non-instructors with these permissions receive full account access."*

---

## 14. Titik singgung dengan invarian proyek ini

Bukan keputusan — hanya catatan mana temuan di atas yang menyentuh `AGENTS.md`.

| Temuan vendor | Invarian / dokumen yang tersentuh |
|---|---|
| Mindbody `Override event drop-in capacities` — permission tersendiri untuk mengisi kelas di atas kapasitas | BR-2.3 (kapasitas dijaga partial unique index). Kalau override ini ada, ia harus lewat jalur yang **tetap** menghormati index, mis. menaikkan kapasitas sesi, bukan melewati constraint |
| Mindbody `Edit client's series count and session numbers` — ubah jumlah sesi yang sudah dibeli | BR-1.7 (sisa kredit = `SUM(credit_ledger.delta)`). Padanannya di sini: baris ledger baru dengan `alasan` koreksi, bukan UPDATE saldo |
| Mindbody `Override cancel policy` — batal telat tanpa kena denda | BR-3.2 (`// BR-3.2: batal telat, kredit dibiarkan hangus`). Kalau staf boleh mengampuni, itu baris ledger `delta: +1` dengan `alasan` tersendiri |
| Mindbody `Make past reservations` + *"staff can still make past reservations on the same day"* | `docs/04-flows.md` bagian 9 — booking ke masa lalu adalah titik rawan waktu; catatan "hari yang sama masih boleh" menunjukkan batasnya dihitung per-hari WIB, bukan per-timestamp |
| TeamUp: scope "Sessions they instruct" **gagal terbuka** kalau relasi instruktur kosong | Filter kepemilikan wajib fail-closed |
| Mindbody rantai dependensi permission (`Attendance with Revenue` butuh 3 permission lain) | Peringatan: permission granular menciptakan graf dependensi yang harus ikut di-test |
| Stripe: peran aditif, tidak ada deny | Kalau nanti ada peran ganda, tentukan aturannya di depan |

---

## 15. Rekap verifikasi

| Vendor | Status | Kualitas sumber |
|---|---|---|
| Mindbody | ✅ terverifikasi | 7 artikel help center resmi; matriks permission paling rinci |
| Arketa | ✅ terverifikasi | Matriks 6 peran × 7 area, lengkap |
| Glofox | ✅ terverifikasi | Matriks default lengkap per permission × 4 peran |
| WellnessLiving | ✅ terverifikasi | 4 peran + 19 kategori + nama permission "only my ..." |
| Pike13 | ✅ terverifikasi | 5 peran, deskripsi verbatim |
| Punchpass | ✅ terverifikasi | 3 level, deskripsi verbatim |
| TeamUp (goteamup) | ✅ terverifikasi | Daftar permission + scope; peran bawaan hanya 2 |
| Momence | ⚠️ sebagian | Nama 4 peran + batasan teacher terkonfirmasi; matriks penuh tidak diterbitkan (vendor menyatakan peran dapat diubah studio) |
| Stripe | ✅ terverifikasi | Referensi peran lengkap, dipakai sebagai pola umum |
| Walla | ❌ gagal | `help.hellowalla.com` butuh login. **Nama peran bawaan: tidak ditemukan sumber primer.** Hanya nama permission dari blog vendor |
| Mindbody Public API | ⚠️ sebagian | Endpoint dikelompokkan per sumber daya (Appointment/Class/Client/Sale/Site/Staff), **bukan per peran**. Pemetaan endpoint↔peran: tidak ditemukan sumber primer publik |

**8 terverifikasi penuh, 1 pola umum (Stripe) terverifikasi penuh, 2 sebagian, 1 gagal.**
