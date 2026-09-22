// Halaman profil publik — pola pita, docs/07-design.md bagian 8.
// Memakai skala pemasaran (DS-4). Layar aplikasi M1–A3 ada di rute lain.
//
// Semua slot foto masih blok `photo-warm` dengan rasio terkunci (DS-25):
// memasang foto asli nanti tidak menggeser tata letak.
//
// Angka dan harga diambil dari seed demo docs/02-rules.md bagian 3.
//
// DS-43 — tidak ada tautan mati di halaman ini. Tiap butir menu menuju salah
// satu dari tiga tempat saja: pita di halaman ini, layar aplikasi yang memang
// ada, atau WhatsApp studio. Halaman jualan yang tautannya mati justru
// memperagakan kebalikan dari yang dijual.

import Link from "next/link";
import { BilahPublik } from "@/components/bilah-publik";
import { tautanWa } from "@/lib/wa";

const FOTO = "bg-[linear-gradient(135deg,var(--accent-warm),var(--photo-warm))]";

/** Nomor meja depan di seed demo (`src/db/seed.ts`, staf ke-3 = admin). */
const TELEPON = "0811550002";

const WA_COBA = tautanWa(
  TELEPON,
  "Halo Kenari, saya mau coba kelas pertama yang gratis. Jadwal kosongnya kapan ya?",
);
const WA_TANYA = tautanWa(TELEPON, "Halo Kenari, saya mau tanya soal kelas dan paketnya.");

const KELAS = [
  ["Reformer", "8 kursi", "Beban pegas untuk kekuatan dan kelenturan sekaligus."],
  ["Tower", "6 kursi", "Kerja vertikal, fokus postur dan pemanjangan."],
  ["Chair", "6 kursi", "Alat paling ringkas, paling jujur soal keseimbangan."],
  ["Mat", "12 kursi", "Tanpa alat. Titik mulai yang paling ramah."],
];

const ANGKA = [
  ["70", "menit per sesi"],
  ["40", "kelas tiap minggu"],
  ["8", "kursi per kelas Reformer"],
  ["12", "jam batas pembatalan"],
];

const INSTRUKTUR = [
  ["Rani Wulandari", "Reformer · Pemula"],
  ["Dimas Prasetyo", "Tower · Kekuatan"],
  ["Ayu Kusuma", "Mat · Prenatal"],
  ["Bagas Nugroho", "Chair · Keseimbangan"],
];

// Nama dan harga mengikuti katalog seed (`src/db/seed.ts`) — di sana paketnya
// memang bernama "10 Sesi Reformer" dan Mat tidak masuk.
//
// `cakupan` bukan hiasan. BR-1.4 mengikat kredit ke jenis kelas, jadi jenis
// kelas yang tercakup adalah bagian dari barang yang dibeli, setara dengan
// jumlah kredit dan masa berlakunya. Halaman yang menyembunyikannya membuat
// member baru tahu saat booking-nya ditolak dengan pesan X7 (BR-2.7).
const PAKET = [
  { nama: "4 Sesi", harga: "560.000", per: "4 kredit · Rp 140.000 per kelas", masa: "Berlaku 1 bulan", cakupan: "Semua jenis kelas", unggulan: false },
  { nama: "10 Sesi Reformer", harga: "1.350.000", per: "10 kredit · Rp 135.000 per kelas", masa: "Berlaku 2 bulan", cakupan: "Reformer, Tower, Chair — Mat tidak termasuk", unggulan: true },
  { nama: "Drop-in", harga: "150.000", per: "1 kredit · sekali datang", masa: "Berlaku 7 hari", cakupan: "Semua jenis kelas", unggulan: false },
];

// Kolom Kelas menunjuk pita yang sama berkali-kali, dan itu memang benar:
// keempat nama alat dijelaskan di satu pita. Yang dicari orang di kaki halaman
// adalah namanya, bukan alamat yang berbeda-beda.
//
// Kolom Member sengaja persis menu sidebar member (`components/kerangka.tsx`).
// Dua daftar yang menamai hal sama dengan kata berbeda — "Jadwal Saya" di sini,
// "Jadwal Kelas" di dalam — membuat orang mengira itu dua layar.
const FOOTER: [string, [string, string][]][] = [
  [
    "Kelas",
    [
      ["Reformer", "#kelas"],
      ["Tower", "#kelas"],
      ["Chair", "#kelas"],
      ["Mat", "#kelas"],
    ],
  ],
  [
    "Studio",
    [
      ["Tentang Kami", "#tentang"],
      ["Instruktur", "#instruktur"],
      ["Paket", "#paket"],
      ["Tanya lewat WhatsApp", WA_TANYA],
    ],
  ],
  [
    "Member",
    [
      ["Jadwal Kelas", "/jadwal"],
      ["Akun Saya", "/akun"],
      ["Masuk", "/masuk"],
    ],
  ],
];

function Pita({
  id,
  latar = "",
  children,
}: {
  /** Tujuan butir menu. Tanpa ini menu di kepala halaman tidak punya sasaran. */
  id?: string;
  latar?: string;
  children: React.ReactNode;
}) {
  // DS-24 — 40px di HP, 100px di laptop. Ini sumber kesan lapangnya.
  return (
    <section id={id} className={`py-sedang lg:py-luas ${latar}`}>
      <div className="mx-auto w-full max-w-[1200px] px-gutter">{children}</div>
    </section>
  );
}

/**
 * Satu-satunya cara halaman ini menulis tautan.
 *
 * wa.me membuka tab baru — meninggalkan halaman jualan di tengah jalan untuk
 * membuka WhatsApp adalah cara kehilangan pengunjung. Sisanya `<Link>` biasa,
 * termasuk jangkar `#`: Next menanganinya sebagai navigasi di halaman yang sama.
 */
function Tautan({
  href,
  kelas,
  anak,
}: {
  href: string;
  kelas: string;
  anak: React.ReactNode;
}) {
  return href.startsWith("http") ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={kelas}>
      {anak}
    </a>
  ) : (
    <Link href={href} className={kelas}>
      {anak}
    </Link>
  );
}

function Tombol({
  anak,
  href,
  penuh = false,
}: {
  anak: string;
  href: string;
  penuh?: boolean;
}) {
  return (
    <Tautan
      href={href}
      anak={anak}
      kelas={`inline-flex h-12 items-center justify-center rounded-sm bg-primary px-9 text-app-label font-medium uppercase text-primary-foreground ${
        penuh ? "w-full sm:w-auto" : ""
      }`}
    />
  );
}

export default function Profil() {
  return (
    <>
      {/* 1 — site-header, bersama dengan jadwal publik. */}
      <BilahPublik />

      {/* 2 — hero. Teks putih hanya aman karena ada tirai (DS-20): 7.74:1. */}
      <section className="relative flex min-h-[70vh] items-center overflow-hidden">
        <div aria-hidden className={`absolute inset-0 ${FOTO}`} />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, var(--photo-scrim) 0%, var(--photo-scrim) 40%, transparent 78%)",
          }}
        />
        <div className="relative mx-auto w-full max-w-[1200px] px-gutter py-lega">
          <p className="font-serif text-app-section text-white/90">
            Kudus, Jawa Tengah
          </p>
          <h1 className="mt-rapat max-w-[15ch] text-display text-white">
            Bergerak tenang, pulang bertenaga.
          </h1>
          <div className="mt-dekat">
            <Tombol anak="Lihat Jadwal Minggu Ini" href="/jadwal" penuh />
          </div>
        </div>
      </section>

      {/* 3 — manifesto. Aksen warna digelapkan dari rujukan agar terbaca (DS-18). */}
      <Pita>
        <p className="max-w-[60ch] text-marketing-lead">
          Pilates di Kenari bukan soal mengejar angka. Metodenya dirancang supaya
          kamu merasa{" "}
          <span className="text-emphasis-sand">lebih kuat, lebih panjang, lebih lepas</span>
          , sambil melepas tegang di badan dan di kepala.{" "}
          <span className="text-emphasis-green">Satu kelas untuk setiap tubuh.</span>
        </p>
      </Pita>

      {/* 4 — kelas, pita sand */}
      <Pita id="kelas" latar="bg-surface-sand">
        <div className="grid items-center gap-sedang lg:grid-cols-2">
          <div aria-hidden className={`${FOTO} aspect-[4/3] w-full rounded-md`} />
          <div>
            <h2 className="text-marketing-h2">Empat cara memulai</h2>
            <dl className="mt-dekat divide-y divide-border-warm">
              {KELAS.map(([nama, kursi, ket]) => (
                <div key={nama} className="py-4">
                  <dt className="flex items-baseline justify-between gap-4">
                    <span className="text-app-section">{nama}</span>
                    <span className="text-app-label uppercase text-emphasis-sand">
                      {kursi}
                    </span>
                  </dt>
                  <dd className="mt-1 max-w-[46ch] text-app-body text-muted-foreground">
                    {ket}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Pita>

      {/* 5 — angka */}
      <Pita>
        <div className="grid grid-cols-2 gap-sedang lg:grid-cols-4">
          {ANGKA.map(([n, label]) => (
            <div key={label}>
              {/* DS-5 — angka selalu tabular-nums */}
              <p className="text-app-number tabular-nums">{n}</p>
              <p className="mt-1 max-w-[18ch] text-app-body-sm text-muted-foreground">
                {label}
              </p>
            </div>
          ))}
        </div>
      </Pita>

      {/* 6 — instruktur, pita sand. Geser mendatar pakai scroll asli, tanpa JS. */}
      <Pita id="instruktur" latar="bg-surface-sand">
        <h2 className="text-marketing-h2">Instruktur kami</h2>
        <ul className="mt-dekat -mx-gutter flex snap-x gap-4 overflow-x-auto px-gutter">
          {INSTRUKTUR.map(([nama, ket]) => (
            <li key={nama} className="w-56 shrink-0 snap-start">
              <div aria-hidden className={`${FOTO} aspect-[3/4] w-full rounded-md`} />
              <p className="mt-3 text-app-section">{nama}</p>
              <p className="text-app-body-sm text-emphasis-sand">{ket}</p>
            </li>
          ))}
        </ul>
      </Pita>

      {/* 7 — untuk semua */}
      <Pita id="tentang">
        <div className="mx-auto max-w-[52ch] text-center">
          <h2 className="text-marketing-h2">Untuk setiap tubuh</h2>
          <p className="mt-rapat text-app-body text-muted-foreground">
            Member Kenari berumur 19 sampai 64 tahun. Ada yang baru pulih dari
            cedera, ada yang sudah delapan tahun berlatih. Kelasnya sama, porsinya
            yang menyesuaikan.
          </p>
        </div>
        <ul className="mt-sedang -mx-gutter flex gap-4 overflow-x-auto px-gutter">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <li
              key={i}
              aria-hidden
              className={`${FOTO} aspect-[3/4] w-40 shrink-0 rounded-md ${
                i % 2 ? "mt-dekat" : ""
              }`}
            />
          ))}
        </ul>
      </Pita>

      {/* 8 — paket, pita penutup. Teks sekunder pakai emphasis-sand, bukan
          muted-foreground: di sand-deep muted cuma 4.24:1 (DS-19). */}
      <Pita id="paket" latar="bg-surface-sand-deep">
        <div className="mx-auto max-w-[44ch] text-center">
          <h2 className="text-marketing-h2">Satu kredit, satu kelas</h2>
          <p className="mt-rapat text-app-body text-emphasis-sand">
            Kelas pertama gratis — datang dulu, rasakan dulu. Setelah yakin, beli
            paket kredit dan pakai kreditnya untuk mengambil kursi di jadwal.
          </p>
        </div>

        <div className="mt-sedang grid gap-4 lg:grid-cols-3">
          {PAKET.map((p) => (
            <div
              key={p.nama}
              className={`rounded-md p-6 ${
                p.unggulan ? "bg-primary" : "border border-border-warm bg-background"
              }`}
            >
              {p.unggulan && (
                <span className="inline-block rounded-full bg-foreground px-3 py-1 text-app-label uppercase text-background">
                  Paling laku
                </span>
              )}
              <p className={`text-app-section ${p.unggulan ? "mt-3" : ""}`}>{p.nama}</p>
              <p className="mt-2 text-app-number tabular-nums">
                <span className="text-app-body align-middle">Rp </span>
                {p.harga}
              </p>
              <p className="mt-2 text-app-body-sm text-emphasis-sand">{p.per}</p>
              <p className="text-app-body-sm text-emphasis-sand">{p.masa}</p>
              <p className="text-app-body-sm text-emphasis-sand">{p.cakupan}</p>
            </div>
          ))}
        </div>

        {/* Satu-satunya jalan mendaftar di demo ini adalah bicara dengan meja
            depan: pendaftaran member mandiri baru ada di versi real (UC-M13). */}
        <div className="mt-sedang text-center">
          <Tombol anak="Ambil Kelas Gratis" href={WA_COBA} penuh />
        </div>
      </Pita>

      {/* 9 — testimoni. Teks ini placeholder sampai ada kutipan member asli. */}
      <Pita>
        <figure className="mx-auto max-w-[44ch] text-center">
          <blockquote className="font-serif text-app-title">
            &ldquo;Dulu saya harus chat dulu, nunggu dibalas, baru tahu kelasnya
            penuh. Sekarang tinggal lihat sisa kursinya sendiri.&rdquo;
          </blockquote>
          <figcaption className="mt-dekat text-app-label uppercase text-muted-foreground">
            Sari — member sejak 2024
          </figcaption>
        </figure>
      </Pita>

      {/* 10 — site-footer */}
      <footer className="bg-surface-sand-deep">
        <div className="mx-auto w-full max-w-[1200px] px-gutter py-sedang lg:py-lega">
          <div className="grid gap-sedang lg:grid-cols-4">
            <div>
              <p className="text-app-section">Studio Pilates Kenari</p>
              <p className="mt-2 max-w-[28ch] text-app-body-sm text-emphasis-sand">
                Jl. Kenari, Kudus, Jawa Tengah. Buka Senin–Sabtu, 06.00–20.00 WIB.
              </p>
              <Tautan
                href={WA_TANYA}
                anak="Chat WhatsApp"
                kelas="min-h-11 mt-4 inline-flex items-center rounded-sm border border-foreground px-4 text-app-label font-medium uppercase"
              />
            </div>
            {FOOTER.map(([judul, tautan]) => (
              <div key={judul}>
                <p className="text-app-label uppercase text-emphasis-sand">{judul}</p>
                <ul className="mt-1">
                  {tautan.map(([label, href]) => (
                    <li key={label}>
                      <Tautan
                        href={href}
                        anak={label}
                        kelas="min-h-11 inline-flex items-center text-app-body-sm hover:underline"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="mt-lega border-t border-border-warm pt-dekat text-center text-marketing-h2 tracking-[0.12em]">
            KENARI
          </p>
        </div>
      </footer>
    </>
  );
}
