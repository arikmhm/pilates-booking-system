// Panel "Buat kelas" — kolom kanan layar M1 dan A7 (UC-O01, UC-A14).
//
// Dua tab, dan tiap tab adalah SATU keputusan yang selesai: isi formulirnya,
// tekan satu tombol, kelasnya ada. Sebelumnya membuat kelas mingguan butuh
// dua tombol di dua tempat — "Tambah slot" lalu "Terbitkan sekarang" — dan
// orang yang cuma menekan yang pertama melihat kalender yang tidak berubah
// sejauh yang dia lihat (DS-41).
//
// Sakelarnya lewat URL, bukan state klien: layar ini server component penuh.
//
// BR-9.3 — jadwal mingguan tetap kewenangan owner: satu slot berarti beban
// coach tiap minggu. Kelas sekali jalan milik admin; itu operasional.

import Link from "next/link";
import { pg } from "@/db";
import {
  BATAS_TERBIT,
  daftarJenisKelas,
  daftarTim,
  HARI,
  statusTerbit,
} from "@/db/kelola";
import { kunciHariWib, tanggalRingkasWib } from "@/lib/waktu";
import { Kartu, Tombol } from "@/components/kerangka";
import {
  tambahAturan,
  tambahSesi,
  terbitkanJadwal,
} from "@/app/admin/kelola-aksi";

const INPUT =
  "h-12 w-full rounded-sm border border-border bg-background px-3 text-app-body";
const LABEL = "text-app-label uppercase text-muted-foreground";

export type ModeBuat = "sekali" | "berulang";

const JAM = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MENIT = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

/**
 * Jam dinding 24 jam dari dua select.
 *
 * `<input type="time">` menampilkan AM/PM atau 24 jam menurut locale browser,
 * bukan menurut kita — dua orang bisa melihat jam yang sama dengan dua rupa.
 * Studio ini menulis jadwal dalam 24 jam di mana pun (DS-41), dan select juga
 * menutup kemungkinan mengetik jam yang tidak ada.
 */
function PilihJam({ jam, menit }: { jam: string; menit: string }) {
  return (
    <div>
      <label className={LABEL} htmlFor="jam">
        Jam (WIB)
      </label>
      <div className="flex items-center gap-2">
        <select id="jam" name="jam" defaultValue={jam} className={INPUT}>
          {JAM.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </select>
        <span className="text-app-body text-muted-foreground">.</span>
        <select
          id="menit"
          name="menit"
          defaultValue={menit}
          className={INPUT}
          aria-label="Menit"
        >
          {MENIT.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function Sakelar({
  mode,
  tautan,
}: {
  mode: ModeBuat;
  tautan: (m: ModeBuat) => string;
}) {
  return (
    <div className="flex rounded-sm border border-border p-1">
      {(
        [
          ["sekali", "Sekali jalan"],
          ["berulang", "Tiap minggu"],
        ] as const
      ).map(([nilai, label]) => (
        <Link
          key={nilai}
          href={tautan(nilai)}
          aria-current={mode === nilai ? "true" : undefined}
          className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-sm px-3 text-app-label uppercase transition-colors ${
            mode === nilai
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

export async function BuatKelas({
  owner,
  mode,
  tautan,
  kembali,
  sekarang,
  terbit,
}: {
  owner: boolean;
  mode: ModeBuat;
  /** URL layar ini dengan mode lain — filter dan minggu ikut terbawa. */
  tautan: (m: ModeBuat) => string;
  /** Ke mana aksinya kembali setelah selesai. */
  kembali: string;
  sekarang: Date;
  /** Tampilkan panel terbit ulang. Hanya di layar Aturan Jadwal. */
  terbit?: boolean;
}) {
  const [jenis, tim, status] = await Promise.all([
    daftarJenisKelas(pg, sekarang),
    daftarTim(pg, sekarang),
    terbit ? statusTerbit(pg, sekarang) : null,
  ]);
  const coach = tim.filter((t) => t.peran === "coach");
  const besok = kunciHariWib(new Date(sekarang.getTime() + 86_400_000));

  // Admin tidak punya mode berulang sama sekali — menampilkan tab yang
  // ditolak servernya cuma memancing klik yang gagal.
  const berulang = owner && mode === "berulang";

  /** Jenis kelas, pelatih, kursi, durasi — sama persis di kedua tab. */
  const isiKelas = (
    <>
      <div>
        <label className={LABEL} htmlFor="class_type_id">
          Jenis kelas
        </label>
        <select
          id="class_type_id"
          name="class_type_id"
          required
          className={INPUT}
        >
          {jenis.map((j) => (
            <option key={j.id} value={j.id}>
              {j.nama}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={LABEL} htmlFor="coach_id">
          Pelatih
        </label>
        <select id="coach_id" name="coach_id" className={INPUT}>
          <option value="">Belum ditentukan</option>
          {coach.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nama}
            </option>
          ))}
        </select>
      </div>

      {/* DS-41b — kursi dan durasi TIDAK diisi lebih dulu. Keduanya sudah
          ditentukan di jenis kelasnya (BR-7.2), jadi mengisinya di sini
          berarti keputusan yang sama diambil dua kali — dan yang kedua
          diam-diam menang. Versi sebelumnya mengisi angka dari jenis kelas
          PERTAMA menurut abjad apa pun yang dipilih, jadi "Private 1 kursi"
          terbit sebagai kelas 6 kursi selama kolomnya tidak disentuh.
          Kosong = ikut jenis kelasnya; diisi = sengaja ditimpa untuk slot
          ini saja. Angka yang berlaku disebut lagi di pesan hasilnya. */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL} htmlFor="kapasitas">
            Kursi
          </label>
          <input
            id="kapasitas"
            name="kapasitas"
            type="number"
            min={1}
            max={60}
            placeholder="Ikut jenis kelas"
            className={INPUT}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="durasi_menit">
            Durasi (menit)
          </label>
          <input
            id="durasi_menit"
            name="durasi_menit"
            type="number"
            min={15}
            max={240}
            placeholder="Ikut jenis kelas"
            className={INPUT}
          />
        </div>
      </div>

      <p className="text-app-body-sm text-muted-foreground">
        Kosongkan keduanya untuk memakai kursi dan durasi jenis kelasnya. Isi
        hanya kalau kelas ini memang beda — Sabtu 45 menit, misalnya.
      </p>
    </>
  );

  return (
    <Kartu
      judul="Buat kelas"
      catatan={
        berulang
          ? "Berulang tiap minggu sampai dihentikan."
          : "Workshop, kelas pengganti, jam titipan. Tidak berulang."
      }
    >
      <div className="space-y-4">
        {owner ? (
          <Sakelar mode={mode} tautan={tautan} />
        ) : (
          <p className="text-app-body-sm text-muted-foreground">
            Jadwal mingguan adalah kewenangan pemilik studio — satu slot berarti
            beban coach tiap minggu.
          </p>
        )}

        {berulang ? (
          <form action={tambahAturan} className="space-y-4">
            <input type="hidden" name="dari" value={kembali} />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL} htmlFor="hari">
                  Hari
                </label>
                <select id="hari" name="hari" className={INPUT} defaultValue={2}>
                  {HARI.map((h, i) => (
                    <option key={h} value={i + 1}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
              <PilihJam jam="09" menit="00" />
            </div>

            {isiKelas}

            {/* Satu keputusan, bukan dua: berapa lama kelas ini berjalan
                adalah bagian dari membuatnya (DS-41). */}
            <div className="rounded-sm border border-border p-3">
              <label className={LABEL} htmlFor="minggu">
                Terbitkan untuk
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="minggu"
                  name="minggu"
                  type="number"
                  required
                  min={BATAS_TERBIT[0]}
                  max={BATAS_TERBIT[1]}
                  defaultValue={status?.minggu ?? 8}
                  className="h-12 w-20 rounded-sm border border-border bg-background px-3 text-app-body tabular-nums"
                />
                <span className="text-app-body text-muted-foreground">
                  minggu ke depan
                </span>
              </div>
              <p className="mt-2 text-app-body-sm text-muted-foreground">
                Sesi pertama jatuh di hari itu yang terdekat; yang jamnya sudah
                lewat hari ini dilewati.
              </p>
            </div>

            <Tombol penuh anak="Buat & terbitkan jadwal mingguan" />
          </form>
        ) : (
          <form action={tambahSesi} className="space-y-4">
            <input type="hidden" name="dari" value={kembali} />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL} htmlFor="tanggal">
                  Tanggal
                </label>
                <input
                  id="tanggal"
                  name="tanggal"
                  type="date"
                  required
                  defaultValue={besok}
                  className={INPUT}
                />
              </div>
              <PilihJam jam="10" menit="00" />
            </div>

            {isiKelas}

            <Tombol gaya="garis" penuh anak="Buat kelas" />
          </form>
        )}

        {/* ── Terbitkan ulang — BR-7.1 ───────────────────────────────────────
            Tab di atas sudah menerbitkan sesinya sendiri, jadi panel ini
            bukan langkah kedua yang wajib. Ia untuk jadwal yang SUDAH ada:
            memperpanjang jangkanya, atau mengisi lagi kalender yang kosong
            setelah Reset Jadwal — tanpa membuat kelas baru. */}
        {status && (
          <div className="border-t border-border pt-4">
            <p className="text-app-section">Terbitkan ulang</p>
            <p className="text-app-body-sm text-muted-foreground">
              {status.sampai
                ? `${status.mendatang} sesi terbit, sampai ${tanggalRingkasWib(status.sampai)}.`
                : "Belum ada sesi terbit dari jadwal mingguan."}
            </p>

            {/* Tombol yang tidak mungkin berhasil harus mengatakannya SEBELUM
                ditekan. */}
            {status.aturan_aktif === 0 && (
              <p className="mt-2 rounded-sm bg-warn-surface px-3 py-2 text-app-body-sm text-warn-foreground">
                Belum ada jadwal mingguan yang berjalan, jadi belum ada yang
                bisa diterbitkan. Buat lewat tab “Tiap minggu”, atau jalankan
                lagi yang dihentikan di daftar sebelah.
              </p>
            )}

            <form action={terbitkanJadwal} className="mt-3 space-y-3">
              <input type="hidden" name="dari" value={kembali} />

              {owner ? (
                <label className="flex items-center justify-between gap-4">
                  <span className="text-app-body">Terbitkan untuk</span>
                  <span className="flex items-center gap-2">
                    <input
                      name="minggu"
                      type="number"
                      required
                      min={BATAS_TERBIT[0]}
                      max={BATAS_TERBIT[1]}
                      defaultValue={status.minggu}
                      className="h-12 w-20 rounded-sm border border-border bg-background px-3 text-app-body tabular-nums"
                      aria-label="Jangka terbit dalam minggu"
                    />
                    <span className="text-app-body-sm text-muted-foreground">
                      minggu
                    </span>
                  </span>
                </label>
              ) : (
                /* Tanpa field `minggu`, aksinya cuma menerbitkan — jangkanya
                   tidak ikut terkirim, jadi tidak ada yang bisa diubah. */
                <p className="text-app-body-sm text-muted-foreground">
                  Terbit {status.minggu} minggu ke depan, diatur pemilik studio.
                </p>
              )}

              <Tombol gaya="garis" penuh anak="Terbitkan ulang sekarang" />
            </form>
          </div>
        )}
      </div>
    </Kartu>
  );
}
