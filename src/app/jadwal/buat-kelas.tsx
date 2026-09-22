// Panel "Buat kelas" — kolom kanan layar M1 untuk staf (UC-O01, UC-A14).
//
// Dulu dua kartu terpisah di layar Aturan Jadwal: satu untuk slot mingguan,
// satu untuk kelas sekali jalan. Keduanya menjawab pertanyaan yang sama —
// "ada lubang di kalender ini, isi apa?" — dan pertanyaan itu muncul sambil
// MELIHAT kalendernya, bukan di layar lain. Jadi formulirnya pindah ke sini,
// di sebelah kalender, dengan sakelar antara sekali jalan dan berulang.
//
// Sakelarnya lewat URL, bukan state klien: layar ini server component penuh,
// dan satu `?buat=berulang` lebih murah daripada membuatnya interaktif.
//
// BR-9.1 — slot mingguan tetap kewenangan owner: satu slot berarti beban
// coach tiap minggu. Kelas sekali jalan milik admin; itu operasional.

import Link from "next/link";
import { pg } from "@/db";
import { daftarJenisKelas, daftarTim, HARI } from "@/db/kelola";
import { kunciHariWib } from "@/lib/waktu";
import { Kartu, Tombol } from "@/components/kerangka";
import { tambahAturan, tambahSesi } from "@/app/admin/kelola-aksi";

const INPUT =
  "h-12 w-full rounded-sm border border-border bg-background px-3 text-app-body";
const LABEL = "text-app-label uppercase text-muted-foreground";

export type ModeBuat = "sekali" | "berulang";

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
}: {
  owner: boolean;
  mode: ModeBuat;
  /** URL layar ini dengan mode lain — filter dan minggu ikut terbawa. */
  tautan: (m: ModeBuat) => string;
  /** Ke mana aksinya kembali setelah selesai. */
  kembali: string;
  sekarang: Date;
}) {
  const [jenis, tim] = await Promise.all([
    daftarJenisKelas(pg, sekarang),
    daftarTim(pg, sekarang),
  ]);
  const coach = tim.filter((t) => t.peran === "coach");
  const besok = kunciHariWib(new Date(sekarang.getTime() + 86_400_000));

  // Admin tidak punya mode berulang sama sekali — menampilkan tab yang
  // ditolak servernya cuma memancing klik yang gagal.
  const berulang = owner && mode === "berulang";

  return (
    <Kartu
      judul="Buat kelas"
      catatan={
        berulang
          ? "Slot mingguan: terbit otomatis tiap minggu sampai dihentikan."
          : "Workshop, kelas pengganti, jam titipan. Tidak berulang."
      }
    >
      <div className="space-y-4">
        {owner ? (
          <Sakelar mode={mode} tautan={tautan} />
        ) : (
          <p className="text-app-body-sm text-muted-foreground">
            Slot mingguan permanen adalah kewenangan pemilik studio — satu slot
            berarti beban coach tiap minggu.
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
              <div>
                <label className={LABEL} htmlFor="jam_mulai">
                  Jam (WIB)
                </label>
                <input
                  id="jam_mulai"
                  name="jam_mulai"
                  type="time"
                  required
                  defaultValue="09:00"
                  className={INPUT}
                />
              </div>
            </div>

            <div>
              <label className={LABEL} htmlFor="class_type_id">
                Alat / jenis kelas
              </label>
              <select
                id="class_type_id"
                name="class_type_id"
                required
                className={INPUT}
              >
                {jenis.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.nama} · {j.durasi_menit} menit
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                  placeholder="bawaan"
                  className={INPUT}
                />
              </div>
            </div>

            <Tombol penuh anak="Tambah slot mingguan" />
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
              <div>
                <label className={LABEL} htmlFor="jam">
                  Jam (WIB)
                </label>
                <input
                  id="jam"
                  name="jam"
                  type="time"
                  required
                  defaultValue="10:00"
                  className={INPUT}
                />
              </div>
            </div>

            <div>
              <label className={LABEL} htmlFor="sesi_class_type_id">
                Alat / jenis kelas
              </label>
              <select
                id="sesi_class_type_id"
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
              <label className={LABEL} htmlFor="sesi_coach_id">
                Pelatih
              </label>
              <select id="sesi_coach_id" name="coach_id" className={INPUT}>
                <option value="">Belum ditentukan</option>
                {coach.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nama}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL} htmlFor="sesi_kapasitas">
                  Kursi
                </label>
                <input
                  id="sesi_kapasitas"
                  name="kapasitas"
                  type="number"
                  required
                  min={1}
                  max={60}
                  defaultValue={jenis[0]?.kapasitas_default ?? 8}
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
                  required
                  min={15}
                  max={240}
                  defaultValue={jenis[0]?.durasi_menit ?? 60}
                  className={INPUT}
                />
              </div>
            </div>

            <Tombol gaya="garis" penuh anak="Buat kelas tambahan" />
          </form>
        )}
      </div>
    </Kartu>
  );
}
