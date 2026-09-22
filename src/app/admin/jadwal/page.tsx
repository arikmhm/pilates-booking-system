// Layar A7 Aturan jadwal — UC-O01.
//
// Jadwal studio disimpan sebagai aturan berulang mingguan, bukan sebagai
// daftar tanggal (BR-7.1). Yang diketik di sini "Selasa 07.00 Reformer";
// sesi nyatanya diterbitkan job harian sampai `generate_weeks_ahead` minggu
// ke depan. Menambah aturan lewat layar ini langsung memanggil job yang sama
// supaya hasilnya terlihat seketika.
//
// Menghentikan aturan TIDAK menghapus barisnya: `sessions.schedule_rule_id`
// menunjuk ke sana, dan sesi yang sudah punya peserta tidak boleh hilang
// diam-diam. Yang dihapus hanya sesi mendatang yang benar-benar kosong.

import { pg } from "@/db";
import { daftarJenisKelas, daftarAturan, daftarTim, HARI } from "@/db/kelola";
import { pastikanAdmin } from "@/lib/masuk";
import { kunciHariWib } from "@/lib/waktu";
import { Chip, Kartu, Kerangka, Tombol } from "@/components/kerangka";
import { berhentikanAturan, tambahAturan, tambahSesi } from "../kelola-aksi";

export const dynamic = "force-dynamic";

const INPUT =
  "h-12 w-full rounded-sm border border-border bg-background px-3 text-app-body";
const LABEL = "text-app-label uppercase text-muted-foreground";

export default async function A7({
  searchParams,
}: {
  searchParams: Promise<{ kabar?: string }>;
}) {
  const pengguna = await pastikanAdmin();
  const { kabar } = await searchParams;
  const sekarang = new Date();

  const [aturan, jenis, tim] = await Promise.all([
    daftarAturan(pg, sekarang),
    daftarJenisKelas(pg, sekarang),
    daftarTim(pg, sekarang),
  ]);
  const coach = tim.filter((t) => t.peran === "coach");

  const aktif = aturan.filter((a) => !a.berlaku_sampai);
  const besok = kunciHariWib(new Date(sekarang.getTime() + 86_400_000));

  return (
    <Kerangka
      nama={pengguna.nama}
      peran={pengguna.peran}
      aktif="/admin/jadwal"
      kabar={kabar}
    >
      <div>
        <h1 className="text-app-title">Aturan jadwal</h1>
        <p className="text-app-body-sm text-muted-foreground">
          {aktif.length} slot mingguan aktif · sesi diterbitkan otomatis tiap
          malam
        </p>
      </div>

      <div className="mt-dekat grid gap-dekat lg:grid-cols-[minmax(0,1fr)_26rem]">
        <Kartu judul="Slot mingguan" padat>
          {aturan.length === 0 ? (
            <p className="p-4 text-app-body text-muted-foreground">
              Belum ada aturan jadwal.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {aturan.map((a) => {
                const berhenti = Boolean(a.berlaku_sampai);
                return (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center gap-4 px-4 py-3"
                  >
                    {/* DS-28 — hari dan jam jadi jangkar kiri, lebar tetap. */}
                    <div className="w-24 shrink-0">
                      <p className="text-app-body">{HARI[a.hari - 1]}</p>
                      <p className="text-app-body-sm tabular-nums text-muted-foreground">
                        {String(a.jam_mulai).slice(0, 5).replace(":", ".")}
                      </p>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-app-body">{a.kelas}</p>
                      <p className="truncate text-app-body-sm text-muted-foreground">
                        {a.coach ?? "Tanpa coach"} · {a.durasi_menit} menit ·
                        kapasitas {a.kapasitas ?? a.kapasitas_default}
                        {a.kapasitas === null && " (bawaan)"}
                      </p>
                    </div>

                    <div className="w-32 shrink-0 text-app-body-sm tabular-nums text-muted-foreground">
                      {a.sesi_mendatang} sesi mendatang
                    </div>

                    {berhenti ? (
                      <Chip
                        warna="bg-neutral-surface text-neutral-foreground"
                        anak="Dihentikan"
                      />
                    ) : (
                      <form action={berhentikanAturan} className="shrink-0">
                        <input type="hidden" name="id" value={a.id} />
                        <Tombol gaya="halus" kecil anak="Hentikan" />
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Kartu>

        <div className="space-y-dekat">
          <Kartu
            judul="Slot mingguan baru"
            catatan="Berulang tiap minggu sampai dihentikan."
          >
            <form action={tambahAturan} className="space-y-4">
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
                    Jam mulai (WIB)
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
                    Kapasitas
                  </label>
                  <input
                    id="kapasitas"
                    name="kapasitas"
                    type="number"
                    min={1}
                    max={60}
                    placeholder="bawaan jenis kelas"
                    className={INPUT}
                  />
                </div>
              </div>

              <Tombol penuh anak="Tambah slot" />
            </form>
          </Kartu>

          <Kartu
            judul="Kelas tambahan sekali jalan"
            catatan="Workshop, kelas pengganti, jam titipan. Tidak berulang."
          >
            <form action={tambahSesi} className="space-y-4">
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
                  Jenis kelas
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

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
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

              <Tombol gaya="garis" penuh anak="Buat kelas tambahan" />
            </form>
          </Kartu>
        </div>
      </div>
    </Kerangka>
  );
}
