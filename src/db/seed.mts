// Seed demo — docs/02-rules.md bagian 6.2.
//
// Semua tanggal RELATIF terhadap saat dijalankan. Tidak ada tanggal mati:
// demo yang di-seed hari ini harus tetap masuk akal saat dipresentasikan
// dua minggu lagi.
//
// Hasilnya deterministik (PRNG berbenih tetap). Demo yang tampil beda tiap
// reset adalah demo yang tidak bisa dilatih.
//
// Jalankan: npm run db:seed

import postgres from "postgres";

const STUDIO = "Studio Pilates Kenari";
const WIB = 7; // UTC+7, tanpa DST

/* ── Penjaga ──────────────────────────────────────────────────────────────
   Seed ini TRUNCATE 12 tabel. DATABASE_URL menunjuk Neon, dan suatu hari
   akan menunjuk VPS klien. Menolak jalan kalau menemukan studio yang bukan
   studio demo — database kosong dan database demo tetap boleh.            */
async function pastikanAman(sql: postgres.Sql) {
  const ada = await sql<{ nama: string }[]>`select nama from studios limit 5`;
  const asing = ada.filter((r) => r.nama !== STUDIO);
  if (asing.length > 0) {
    throw new Error(
      `Seed menolak jalan: database berisi studio "${asing[0].nama}", ` +
        `bukan "${STUDIO}". Seed menghapus SEMUA data. ` +
        `Kalau ini memang database demo, ganti namanya dulu.`,
    );
  }
}

/* ── Acak berbenih ───────────────────────────────────────────────────────
   mulberry32 — cukup untuk memvariasikan okupansi, dan sama tiap kali.   */
function acak(benih: number) {
  let a = benih;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = acak(20260922);
const antara = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
// Fisher-Yates. `sort(() => rnd() - 0.5)` itu shuffle yang bias — untuk data
// demo bedanya kelihatan: orang yang sama terus muncul di kelas pertama.
function ambilAcak<T>(arr: T[], n: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

/* ── Waktu ───────────────────────────────────────────────────────────────
   Jadwal ditulis sebagai jam dinding WIB; yang disimpan UTC — BR-7.5.    */
const SEKARANG = new Date();

/** Tanggal WIB `offset` hari dari hari ini, jam `jam`:`menit` WIB → UTC. */
function jamWib(offsetHari: number, jam: number, menit: number): Date {
  const wibKini = new Date(SEKARANG.getTime() + WIB * 3_600_000);
  return new Date(
    Date.UTC(
      wibKini.getUTCFullYear(),
      wibKini.getUTCMonth(),
      wibKini.getUTCDate() + offsetHari,
      jam - WIB,
      menit,
    ),
  );
}
const hariKe = (n: number) => new Date(SEKARANG.getTime() + n * 86_400_000);
const jamKe = (n: number) => new Date(SEKARANG.getTime() + n * 3_600_000);
const tglIso = (d: Date) => d.toISOString().slice(0, 10);

/** 1 = Senin … 7 = Minggu, dihitung di kalender WIB. */
function hariWib(offsetHari: number): number {
  const wibKini = new Date(SEKARANG.getTime() + WIB * 3_600_000);
  const d = new Date(
    Date.UTC(
      wibKini.getUTCFullYear(),
      wibKini.getUTCMonth(),
      wibKini.getUTCDate() + offsetHari,
    ),
  );
  return d.getUTCDay() === 0 ? 7 : d.getUTCDay();
}

/* ── Data dasar ─────────────────────────────────────────────────────────── */

const JENIS = [
  { nama: "Reformer", kapasitas: 8, warna: "#BCFF88" },
  { nama: "Tower", kapasitas: 6, warna: "#CBBEA3" },
  { nama: "Chair", kapasitas: 6, warna: "#C8C0B2" },
  { nama: "Mat", kapasitas: 12, warna: "#E5E7EB" },
];

// Slot jam dinding WIB. Senin–Jumat 7 slot, Sabtu 5 → 40 kelas per minggu,
// angka yang dipakai halaman profil dan 01-product.md.
const SLOT_KERJA = [
  [6, 0, "Reformer"],
  [7, 20, "Reformer"],
  [8, 40, "Mat"],
  [10, 0, "Tower"],
  [16, 0, "Reformer"],
  [17, 20, "Chair"],
  [18, 40, "Reformer"],
] as const;
const SLOT_SABTU = [
  [7, 0, "Reformer"],
  [8, 20, "Mat"],
  [9, 40, "Reformer"],
  [11, 0, "Tower"],
  [16, 0, "Reformer"],
] as const;

const NAMA_MEMBER = [
  "Sri Wahyuni", "Bambang Sutrisno", "Endang Puspita", "Joko Purnomo",
  "Siti Rahayu", "Agus Setiawan", "Retno Wulandari", "Tri Handoko",
  "Dewi Lestari", "Slamet Riyadi", "Nur Hidayati", "Eko Prasetyo",
  "Yuni Astuti", "Budi Santoso", "Indah Permatasari", "Heri Susanto",
  "Ratna Sari", "Dwi Nugroho", "Lilis Suryani", "Wahyu Widodo",
  "Tutik Handayani", "Anton Wibowo", "Sulastri Ningrum", "Gunawan Saputra",
  "Mira Andriani", "Bagus Priyanto", "Ayu Kusumawati", "Danang Pamungkas",
  "Fitri Nuraini", "Rudi Hartono", "Novi Rahmawati", "Teguh Iswanto",
  "Diah Ayu Safitri", "Hendra Kurniawan", "Wiwik Sumarni", "Arif Budiman",
  "Lestari Ningsih", "Dimas Aryo", "Rina Marlina", "Sigit Nugraha",
];

const DURASI = 70; // grid 70 menit

async function seed(sql: postgres.Sql) {
  await pastikanAman(sql);

  await sql.unsafe(`truncate
    credit_ledger, waitlist_entries, notifications, bookings, member_packages,
    package_class_types, packages, sessions, schedule_rules, class_types,
    users, studios cascade`);

  /* 1 — studio. Setelan pakai default kolom (02-rules.md bagian 3). */
  const [studio] = await sql`
    insert into studios (nama, warna_utama) values (${STUDIO}, '#BCFF88')
    returning id`;

  /* 2 — jenis kelas */
  const jenis = await sql`
    insert into class_types ${sql(
      JENIS.map((j) => ({
        studio_id: studio.id,
        nama: j.nama,
        kapasitas_default: j.kapasitas,
        durasi_menit: DURASI,
        warna: j.warna,
      })),
    )} returning id, nama, kapasitas_default`;
  const jenisId = Object.fromEntries(jenis.map((j) => [j.nama, j]));

  /* 3 — orang. 2 coach (6.2), 1 admin, 1 owner, 40 member. */
  const staf = [
    { nama: "Rani Wulandari", peran: "coach" },
    { nama: "Dimas Prasetyo", peran: "coach" },
    { nama: "Tari Oktaviani", peran: "admin" },
    { nama: "Ratih Kusumaningrum", peran: "owner" },
  ];
  const orang = await sql`
    insert into users ${sql([
      ...staf.map((s, i) => ({
        studio_id: studio.id,
        nama: s.nama,
        telepon: `08115500${String(i).padStart(2, "0")}`,
        email: `${s.peran}${i}@kenari.test`,
        peran: s.peran,
      })),
      ...NAMA_MEMBER.map((nama, i) => ({
        studio_id: studio.id,
        nama,
        telepon: `08122${String(100000 + i)}`,
        // Sengaja tidak semua punya email — 02-rules.md pertanyaan terbuka 6.
        email: i % 3 === 0 ? null : `member${i}@kenari.test`,
        peran: "member",
      })),
    ])} returning id, nama, peran`;

  const coach = orang.filter((o) => o.peran === "coach");
  const member = orang.filter((o) => o.peran === "member");
  const admin = orang.find((o) => o.peran === "admin")!;

  /* 4 — paket. Harga dari seed demo 02-rules.md bagian 3. */
  const paket = await sql`
    insert into packages ${sql([
      { studio_id: studio.id, nama: "Drop-in", jumlah_kredit: 1, masa_berlaku_hari: 7, harga_rupiah: 150000 },
      { studio_id: studio.id, nama: "4 Sesi", jumlah_kredit: 4, masa_berlaku_hari: 30, harga_rupiah: 560000 },
      { studio_id: studio.id, nama: "10 Sesi Reformer", jumlah_kredit: 10, masa_berlaku_hari: 60, harga_rupiah: 1350000 },
    ])} returning id, nama, jumlah_kredit, masa_berlaku_hari`;
  const paketId = Object.fromEntries(paket.map((p) => [p.nama, p]));

  // BR-1.4 — "10 Sesi Reformer" hanya untuk kelas beralat; Mat tidak masuk.
  // Ini yang membuat aturan jenis kelas kelihatan di demo, bukan teori.
  const izin: { package_id: string; class_type_id: string }[] = [];
  for (const j of JENIS) {
    izin.push({ package_id: paketId["Drop-in"].id, class_type_id: jenisId[j.nama].id });
    izin.push({ package_id: paketId["4 Sesi"].id, class_type_id: jenisId[j.nama].id });
    if (j.nama !== "Mat")
      izin.push({ package_id: paketId["10 Sesi Reformer"].id, class_type_id: jenisId[j.nama].id });
  }
  await sql`insert into package_class_types ${sql(izin)}`;

  /* 5 — aturan jadwal berulang, 2 coach bergantian */
  const aturan: Record<string, unknown>[] = [];
  let putar = 0;
  for (let hari = 1; hari <= 6; hari++) {
    const slot = hari === 6 ? SLOT_SABTU : SLOT_KERJA;
    for (const [jam, menit, namaJenis] of slot) {
      aturan.push({
        studio_id: studio.id,
        class_type_id: jenisId[namaJenis].id,
        coach_id: coach[putar++ % coach.length].id,
        hari,
        jam_mulai: `${String(jam).padStart(2, "0")}:${String(menit).padStart(2, "0")}`,
        kapasitas: null,
        level: putar % 3 === 0 ? "beginner" : null,
        berlaku_dari: tglIso(hariKe(-30)),
        berlaku_sampai: null,
      });
    }
  }
  const aturanRows = await sql`
    insert into schedule_rules ${sql(aturan)} returning id, hari, jam_mulai, class_type_id, coach_id`;

  /* 6 — sesi nyata, 1 minggu lampau + 3 minggu depan = 4 minggu (6.2) */
  const sesiBaris: Record<string, unknown>[] = [];
  for (let d = -7; d <= 21; d++) {
    const hari = hariWib(d);
    for (const a of aturanRows) {
      if (a.hari !== hari) continue;
      const [jam, menit] = String(a.jam_mulai).split(":").map(Number);
      const kap = JENIS.find(
        (j) => jenisId[j.nama].id === a.class_type_id,
      )!.kapasitas;
      sesiBaris.push({
        studio_id: studio.id,
        schedule_rule_id: a.id,
        class_type_id: a.class_type_id,
        coach_id: a.coach_id,
        mulai_at: jamWib(d, jam, menit),
        durasi_menit: DURASI,
        kapasitas: kap, // BR-7.3 — DISALIN, bukan di-join
        status: "scheduled",
      });
    }
  }

  // Sesi "nanti malam" — 8 jam lagi. Di luar jendela tutup booking (1 jam),
  // di dalam jendela batal (12 jam): inilah yang mendemokan BR-3.2.
  sesiBaris.push({
    studio_id: studio.id,
    schedule_rule_id: null,
    class_type_id: jenisId["Reformer"].id,
    coach_id: coach[0].id,
    mulai_at: jamKe(8),
    durasi_menit: DURASI,
    kapasitas: 8,
    status: "scheduled",
  });

  const sesi = await sql`
    insert into sessions ${sql(sesiBaris)}
    returning id, schedule_rule_id, class_type_id, mulai_at, kapasitas`;

  /* 7 — paket milik member + ledger pembelian */
  // Lima orang pertama sengaja hangus 2–6 hari lagi: itu isi panel A1,
  // senjata presentasi menit 2:15.
  const mp: Record<string, unknown>[] = [];
  const kredit: { mp_id: string; sisa: number; reformer_saja: boolean }[] = [];

  for (let i = 0; i < member.length; i++) {
    const nearExpiry = i < 5;
    const p = nearExpiry
      ? paketId["10 Sesi Reformer"]
      : i < 14
        ? paketId["4 Sesi"]
        : paketId["10 Sesi Reformer"];
    // hangus_at = dibeli_at + masa_berlaku_hari → mundurkan tanggal beli
    const sisaHari = nearExpiry ? 2 + i : antara(8, p.masa_berlaku_hari - 2);
    const dibeli = hariKe(sisaHari - p.masa_berlaku_hari);
    mp.push({
      user_id: member[i].id,
      package_id: p.id,
      dibeli_at: dibeli,
      hangus_at: hariKe(sisaHari),
      jumlah_kredit_awal: p.jumlah_kredit,
    });
  }
  const mpRows = await sql`
    insert into member_packages ${sql(mp)} returning id, user_id, package_id`;

  const ledger: Record<string, unknown>[] = [];
  for (let i = 0; i < mpRows.length; i++) {
    const awal = Number(mp[i].jumlah_kredit_awal);
    ledger.push({
      member_package_id: mpRows[i].id,
      delta: awal,
      alasan: "beli",
      created_at: mp[i].dibeli_at,
    });
    kredit.push({
      mp_id: mpRows[i].id as string,
      sisa: awal,
      reformer_saja: mpRows[i].package_id === paketId["10 Sesi Reformer"].id,
    });
  }

  /* 8 — booking, riwayat campuran, waitlist */
  const idxMember = Object.fromEntries(member.map((m, i) => [m.id, i]));
  const bookingBaris: Record<string, unknown>[] = [];
  const waitlistBaris: Record<string, unknown>[] = [];

  // Lima member panel A1 disisakan kreditnya: kalau ikut di-booking acak
  // sampai habis, mereka hilang dari panel dan senjata presentasi menit 2:15
  // ikut hilang. Batas 3 supaya sisanya tetap terlihat "masih ada, hampir hangus".
  const bolehIkut = (i: number, ctId: string) =>
    kredit[i].sisa > (i < 5 ? 3 : 0) &&
    (!kredit[i].reformer_saja || ctId !== jenisId["Mat"].id);

  // Sesi besok pagi paling awal → dipaksa penuh 8/8 + waitlist 3 (skenario B)
  const besokPagi = sesi
    .filter(
      (s) =>
        s.mulai_at >= jamWib(1, 0, 0) &&
        s.mulai_at < jamWib(2, 0, 0) &&
        s.kapasitas === 8,
    )
    .sort((a, b) => a.mulai_at.getTime() - b.mulai_at.getTime())[0];

  const malamIni = sesi.find((s) => s.schedule_rule_id === null)!;

  // BR-2.1 — member tidak bisa booking lebih dari `booking_opens_days` (7 hari)
  // ke depan. Seed yang mengisi sesi 3 minggu lagi akan menampilkan keadaan
  // yang tidak mungkin terjadi di aplikasi. Sesi di luar jendela dibiarkan
  // kosong — dan itu memang tampilan yang benar.
  const batasBooking = hariKe(7);

  // Sesi penuh dan sesi nanti malam diproses DULU: keduanya wajib ada isinya,
  // dan kalau ikut antre di akhir bisa kehabisan member yang masih punya kredit.
  const urutan = [
    besokPagi,
    malamIni,
    ...sesi.filter((s) => s.id !== besokPagi?.id && s.id !== malamIni.id),
  ].filter(Boolean);

  for (const s of urutan) {
    if (s.mulai_at > batasBooking) continue;
    const lampau = s.mulai_at < SEKARANG;
    const penuh = besokPagi && s.id === besokPagi.id;
    // Okupansi bervariasi: penuh / hampir penuh / sepi (6.2)
    const target = penuh
      ? s.kapasitas
      : Math.min(s.kapasitas, antara(1, s.kapasitas));

    const calon = ambilAcak(
      member.filter((m) => bolehIkut(idxMember[m.id], s.class_type_id)),
      target,
    );

    let alat = 0;
    for (const m of calon) {
      const i = idxMember[m.id];
      alat += 1;
      if (alat > s.kapasitas) break;

      let status = "confirmed";
      let dibatalkan: Date | null = null;
      if (lampau) {
        const undi = rnd();
        status = undi < 0.72 ? "attended" : undi < 0.85 ? "no_show" : "cancelled";
        if (status === "cancelled") dibatalkan = new Date(s.mulai_at.getTime() - 20 * 3_600_000);
      }

      bookingBaris.push({
        session_id: s.id,
        user_id: m.id,
        member_package_id: kredit[i].mp_id,
        nomor_alat: alat,
        status,
        sumber: "member",
        created_at: new Date(s.mulai_at.getTime() - 3 * 86_400_000),
        dibatalkan_at: dibatalkan,
      });

      // BR-2.2 — kredit dipotong saat booking, apa pun hasilnya nanti
      ledger.push({
        member_package_id: kredit[i].mp_id,
        booking_id: null,
        delta: -1,
        alasan: "booking",
        created_at: new Date(s.mulai_at.getTime() - 3 * 86_400_000),
      });
      kredit[i].sisa -= 1;

      // BR-3.1 — batal tepat waktu: kredit kembali ke paket ASAL.
      // BR-3.2 — batal telat & no_show TIDAK menulis baris ledger baru.
      if (status === "cancelled") {
        ledger.push({
          member_package_id: kredit[i].mp_id,
          booking_id: null,
          delta: 1,
          alasan: "batal_tepat_waktu",
          created_at: dibatalkan,
        });
        kredit[i].sisa += 1;
      }
    }

    if (penuh) {
      const antre = ambilAcak(
        member.filter(
          (m) =>
            !calon.includes(m) && bolehIkut(idxMember[m.id], s.class_type_id),
        ),
        3,
      );
      antre.forEach((m, k) =>
        waitlistBaris.push({
          session_id: s.id,
          user_id: m.id,
          status: "waiting",
          // BR-4.2 — urutan antrean murni created_at
          created_at: new Date(SEKARANG.getTime() - (3 - k) * 3_600_000),
        }),
      );
    }
  }

  const bookingRows = await sql`
    insert into bookings ${sql(bookingBaris)} returning id, status`;
  if (waitlistBaris.length)
    await sql`insert into waitlist_entries ${sql(waitlistBaris)}`;
  await sql`insert into credit_ledger ${sql(ledger)}`;

  /* 9 — notifikasi. Demo memakai kanal 'layar' (panel "Pesan Terkirim"). */
  await sql`
    insert into notifications ${sql(
      ambilAcak(member, 6).map((m, i) => ({
        user_id: m.id,
        kanal: "layar",
        template: i % 2 ? "booking_ok" : "kredit_mau_hangus",
        isi:
          i % 2
            ? "Booking kamu terkonfirmasi. Sampai ketemu di studio."
            : "Kredit kamu akan hangus dalam 3 hari. Yuk pakai sebelum lewat.",
        session_id: null,
        terkirim_at: jamKe(-antara(1, 40)),
      })),
    )}`;

  /* 10 — ringkasan, supaya yang menjalankan tahu apa yang dia dapat */
  const [cek] = await sql`
    select
      (select count(*)::int from users where peran = 'member') as member,
      (select count(*)::int from sessions) as sesi,
      (select count(*)::int from bookings) as booking,
      (select count(*)::int from waitlist_entries) as waitlist,
      (select count(*)::int from credit_ledger) as ledger,
      (select count(*)::int from member_packages mp
        where mp.hangus_at between now() and now() + interval '7 days'
          and (select coalesce(sum(delta),0) from credit_ledger
               where member_package_id = mp.id) > 0) as panel_a1,
      (select count(*)::int from credit_ledger where delta < 0) as potongan`;

  const [saldoMinus] = await sql`
    select count(*)::int as n from (
      select member_package_id from credit_ledger
      group by member_package_id having sum(delta) < 0) t`;

  console.log(`\n  ${STUDIO} — seed selesai\n`);
  console.log(`  member            ${cek.member}`);
  console.log(`  sesi (4 minggu)   ${cek.sesi}`);
  console.log(`  booking           ${cek.booking}  (${bookingRows.length} baris)`);
  console.log(`  waitlist          ${cek.waitlist}`);
  console.log(`  baris ledger      ${cek.ledger}`);
  console.log(`  panel A1 ≤ 7 hari ${cek.panel_a1} orang`);
  console.log(`  sesi penuh besok  ${besokPagi ? besokPagi.mulai_at.toISOString() : "TIDAK ADA"}`);
  console.log(`  sesi nanti malam  ${jamKe(8).toISOString()}`);
  console.log(`  admin demo        ${admin.nama}`);

  // BR-1.7 — saldo negatif berarti seed menulis potongan tanpa kredit.
  if (saldoMinus.n > 0) {
    throw new Error(
      `Seed rusak: ${saldoMinus.n} paket punya SUM(delta) negatif. ` +
        `Booking ditulis melebihi kredit yang dibeli.`,
    );
  }
  console.log(`\n  saldo semua paket >= 0 ✓\n`);
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL belum diisi — lihat .env.example");
const sql = postgres(url, { max: 4 });
seed(sql)
  .then(() => sql.end())
  .catch(async (e) => {
    console.error(`\n  ${e.message}\n`);
    await sql.end();
    process.exit(1);
  });
