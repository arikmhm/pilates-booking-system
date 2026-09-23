// Layar A6 Layanan & paket — UC-O02, UC-O03.
//
// Dua tabel yang menentukan apa yang dijual studio ini: jenis kelas
// (`class_types`) dan paket kredit (`packages`). Keduanya sudah ada sejak
// skema pertama; yang belum ada cuma layarnya, jadi selama ini harga hanya
// bisa diubah lewat SQL.
//
// Jenis kelas bisa DITAMBAH dari sini, tidak bisa diubah. Menambah aman:
// BR-7.3 menyalin kapasitas ke `sessions` saat sesi dibuat, jadi baris baru
// tidak menyentuh satu pun sesi lama. Mengubah nama atau kapasitas jenis yang
// sudah dipakai lain soal — ia mengubah arti kartu paket yang sudah dibeli
// orang, dan itu pantas lewat percakapan, bukan formulir.
//
// Menghapus hanya untuk yang belum dipakai apa pun: salah ketik yang baru
// saja dibuat. Begitu ia menempel di slot, sesi, atau paket, tombolnya tidak
// digambar sama sekali, bukan digambar lalu gagal.

import { pg } from "@/db";
import { daftarJenisKelas, daftarPaket } from "@/db/kelola";
import { pastikanAdmin } from "@/lib/masuk";
import { rupiah } from "@/lib/waktu";
import { Chip, Kartu, Kerangka, Tombol } from "@/components/kerangka";
import {
  buangJenisKelas,
  setAktifPaket,
  tambahJenisKelas,
  tambahPaket,
} from "../kelola-aksi";

export const dynamic = "force-dynamic";

const INPUT =
  "h-12 w-full rounded-sm border border-border bg-background px-3 text-app-body";
const LABEL = "text-app-label uppercase text-muted-foreground";

export default async function A6({
  searchParams,
}: {
  searchParams: Promise<{ kabar?: string }>;
}) {
  const pengguna = await pastikanAdmin();
  // Harga = keputusan bisnis. Admin melihat katalog, owner yang mengubahnya.
  const owner = pengguna.peran === "owner";
  const { kabar } = await searchParams;

  const [jenis, paket] = await Promise.all([
    daftarJenisKelas(pg, new Date()),
    daftarPaket(pg),
  ]);

  return (
    <Kerangka
      nama={pengguna.nama}
      peran={pengguna.peran}
      aktif="/admin/layanan"
      kabar={kabar}
    >
      <div>
        <h1 className="text-app-title">Layanan & paket</h1>
        <p className="text-app-body-sm text-muted-foreground">
          {jenis.length} jenis kelas · {paket.filter((p) => p.aktif).length} paket
          aktif
        </p>
      </div>

      <div className="mt-dekat grid gap-dekat lg:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="space-y-dekat">
          {/* Daftar ini tiga hal sekaligus: yang dijadwalkan di A7, yang
              dicentang sebagai "kelas yang tercakup" di paket (BR-1.4), dan
              yang jadi saringan di layar jadwal. Satu sumber, tiga tempat. */}
          <Kartu
            judul="Jenis kelas"
            catatan="Dipakai tiga tempat: jadwal mingguan, cakupan paket, dan saringan layar jadwal. Kapasitas di sini cuma nilai bawaan — sesi menyalinnya saat dibuat (BR-7.3)."
            padat
          >
            <ul className="divide-y divide-border">
              {jenis.map((j) => (
                <li key={j.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-app-body">{j.nama}</p>
                    <p className="text-app-body-sm text-muted-foreground">
                      {j.durasi_menit} menit · kapasitas bawaan {j.kapasitas_default}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-app-body-sm text-muted-foreground">
                    <p className="tabular-nums">{j.slot_mingguan} slot / minggu</p>
                    <p className="tabular-nums">{j.sesi_mendatang} sesi mendatang</p>
                  </div>
                  {/* Tombolnya cuma ada selama jenis kelasnya belum menempel
                      di mana-mana — tombol yang pasti gagal lebih buruk
                      daripada tombol yang tidak ada. */}
                  {owner && !j.dipakai && (
                    <form action={buangJenisKelas} className="shrink-0">
                      <input type="hidden" name="id" value={j.id} />
                      <input type="hidden" name="nama" value={j.nama} />
                      <Tombol gaya="halus" kecil anak="Hapus" />
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </Kartu>

          <Kartu judul="Paket kredit" catatan="Yang tampil di halaman publik." padat>
            <ul className="divide-y divide-border">
              {paket.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-app-body">{p.nama}</p>
                    <p className="text-app-body-sm text-muted-foreground">
                      {p.jumlah_kredit} kredit · berlaku {p.masa_berlaku_hari} hari ·{" "}
                      {p.kelas.length ? p.kelas.join(", ") : "belum ada jenis kelas"}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-app-body tabular-nums">
                      {rupiah(p.harga_rupiah)}
                    </p>
                    <p className="text-app-label uppercase text-muted-foreground">
                      {rupiah(Math.round(p.harga_rupiah / p.jumlah_kredit))} / kelas
                    </p>
                  </div>

                  <div className="w-24 shrink-0 text-app-body-sm tabular-nums text-muted-foreground">
                    {p.terjual} terjual
                  </div>

                  {/* DS-14 — status punya chip sendiri, tidak diwakili tombol. */}
                  <Chip
                    warna={
                      p.aktif
                        ? "bg-ok-surface text-ok-foreground"
                        : "bg-neutral-surface text-neutral-foreground"
                    }
                    anak={p.aktif ? "Dijual" : "Disembunyikan"}
                  />

                  {owner && (
                    <form action={setAktifPaket} className="shrink-0">
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="aktif" value={p.aktif ? "0" : "1"} />
                      <Tombol
                        gaya="halus"
                        kecil
                        anak={p.aktif ? "Sembunyikan" : "Jual lagi"}
                      />
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </Kartu>
        </div>

        <div className="space-y-dekat">
        {owner && (
          <Kartu
            judul="Jenis kelas baru"
            catatan="Yang ditambah di sini langsung jadi pilihan di formulir paket bawah, di Aturan Jadwal, dan di saringan layar jadwal."
          >
            <form action={tambahJenisKelas} className="space-y-4">
              <div>
                <label className={LABEL} htmlFor="jenis_nama">
                  Nama
                </label>
                <input
                  id="jenis_nama"
                  name="nama"
                  required
                  minLength={2}
                  maxLength={40}
                  placeholder="Barre"
                  className={INPUT}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL} htmlFor="kapasitas_default">
                    Kursi bawaan
                  </label>
                  <input
                    id="kapasitas_default"
                    name="kapasitas_default"
                    type="number"
                    required
                    min={1}
                    max={60}
                    defaultValue={8}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className={LABEL} htmlFor="jenis_durasi">
                    Durasi (menit)
                  </label>
                  <input
                    id="jenis_durasi"
                    name="durasi_menit"
                    type="number"
                    required
                    min={15}
                    max={240}
                    step={5}
                    defaultValue={70}
                    className={INPUT}
                  />
                </div>
              </div>

              <p className="text-app-body-sm text-muted-foreground">
                Keduanya cuma nilai bawaan — tiap slot mingguan dan tiap sesi
                boleh menimpanya (BR-7.2).
              </p>

              <Tombol penuh anak="Tambah jenis kelas" />
            </form>
          </Kartu>
        )}

{owner ? (
        <Kartu
          judul="Paket baru"
          catatan="Paket lama tidak pernah dihapus — member yang sudah beli tetap memegang kreditnya."
        >
          <form action={tambahPaket} className="space-y-4">
            <div>
              <label className={LABEL} htmlFor="nama">
                Nama paket
              </label>
              <input
                id="nama"
                name="nama"
                required
                minLength={3}
                maxLength={60}
                placeholder="8 Sesi Reformer"
                className={INPUT}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LABEL} htmlFor="jumlah_kredit">
                  Jumlah kredit
                </label>
                <input
                  id="jumlah_kredit"
                  name="jumlah_kredit"
                  type="number"
                  required
                  min={1}
                  max={200}
                  defaultValue={8}
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="masa_berlaku_hari">
                  Berlaku (hari)
                </label>
                <input
                  id="masa_berlaku_hari"
                  name="masa_berlaku_hari"
                  type="number"
                  required
                  min={1}
                  max={730}
                  defaultValue={60}
                  className={INPUT}
                />
              </div>
            </div>

            <div>
              <label className={LABEL} htmlFor="harga_rupiah">
                Harga (Rupiah, tanpa titik)
              </label>
              <input
                id="harga_rupiah"
                name="harga_rupiah"
                type="number"
                required
                min={0}
                step={1000}
                defaultValue={1200000}
                className={INPUT}
              />
            </div>

            <fieldset>
              <legend className={LABEL}>Kelas yang tercakup</legend>
              <p className="mb-2 text-app-body-sm text-muted-foreground">
                BR-1.4 — kredit hanya bisa dipakai untuk kelas yang dicentang.
              </p>
              <div className="space-y-1">
                {jenis.map((j) => (
                  <label
                    key={j.id}
                    className="flex min-h-11 items-center gap-3 rounded-sm px-2 text-app-body hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      name="class_type_ids"
                      value={j.id}
                      className="size-4"
                    />
                    {j.nama}
                  </label>
                ))}
              </div>
            </fieldset>

            <Tombol penuh anak="Buat paket" />
          </form>
        </Kartu>
        ) : (
          <Kartu judul="Katalog">
            <p className="text-app-body-sm text-muted-foreground">
              Menambah jenis kelas, membuat paket, dan menentukan harganya
              adalah kewenangan pemilik studio. Kamu tetap bisa melihat
              katalognya, dan memberikan paket ke member lewat layar detail
              member.
            </p>
          </Kartu>
        )}
        </div>
      </div>
    </Kerangka>
  );
}
