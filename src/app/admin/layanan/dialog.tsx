// Dialog layar A6 — DS-56. Hidup di URL (`?panel=`), pola yang sama dengan
// panel konfirmasi M1 (DS-42): dirender server, menutupnya cuma tautan.
// Formulir buat dan ubah satu berkas; `name="id"` kosong berarti baru.

import Link from "next/link";
import { Tombol } from "@/components/kerangka";
import type { BarisPaket, JenisKelas } from "@/db/kelola";
import { simpanJenisKelas, simpanPaket } from "../kelola-aksi";

const INPUT =
  "h-12 w-full rounded-sm border border-border bg-background px-3 text-app-body";
const LABEL = "text-app-label uppercase text-muted-foreground";

function Bingkai({
  judul,
  catatan,
  tutup,
  children,
}: {
  judul: string;
  catatan?: string;
  tutup: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <Link
        href={tutup}
        aria-label="Tutup"
        className="absolute inset-0 bg-foreground/40"
      />

      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-t-md border border-border bg-background sm:rounded-md">
        <div className="border-b border-border px-4 py-4">
          <h2 className="text-app-section">{judul}</h2>
          {catatan && (
            <p className="mt-1 text-app-body-sm text-muted-foreground">{catatan}</p>
          )}
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function Batal({ tutup }: { tutup: string }) {
  return (
    <Link
      href={tutup}
      className="inline-flex h-12 items-center justify-center rounded-sm border border-border px-6 text-app-label font-medium uppercase transition-colors hover:border-foreground"
    >
      Batal
    </Link>
  );
}

export function DialogJenis({
  jenis,
  tutup,
}: {
  /** Null = formulir baru. */
  jenis: JenisKelas | null;
  tutup: string;
}) {
  return (
    <Bingkai
      judul={jenis ? `Ubah ${jenis.nama}` : "Jenis kelas baru"}
      catatan={
        jenis
          ? "Sesi yang sudah terbit tidak ikut berubah — kursi dan durasinya disalin saat sesi dibuat."
          : "Kursi dan durasi di sini nilai bawaan; tiap jadwal boleh memakai angka lain."
      }
      tutup={tutup}
    >
      <form action={simpanJenisKelas} className="space-y-4">
        {jenis && <input type="hidden" name="id" value={jenis.id} />}

        <div>
          <label className={LABEL} htmlFor="nama">
            Nama
          </label>
          <input
            id="nama"
            name="nama"
            required
            minLength={2}
            maxLength={40}
            defaultValue={jenis?.nama}
            placeholder="Barre"
            className={INPUT}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL} htmlFor="kapasitas_default">
              Kursi
            </label>
            <input
              id="kapasitas_default"
              name="kapasitas_default"
              type="number"
              required
              min={1}
              max={60}
              defaultValue={jenis?.kapasitas_default ?? 8}
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
              step={5}
              defaultValue={jenis?.durasi_menit ?? 70}
              className={INPUT}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Tombol anak={jenis ? "Simpan" : "Tambah"} />
          <Batal tutup={tutup} />
        </div>
      </form>
    </Bingkai>
  );
}

export function DialogPaket({
  paket,
  jenis,
  tutup,
}: {
  /** Null = formulir baru. */
  paket: BarisPaket | null;
  jenis: JenisKelas[];
  tutup: string;
}) {
  return (
    <Bingkai
      judul={paket ? `Ubah ${paket.nama}` : "Paket baru"}
      catatan="Kredit hanya bisa dipakai di kelas yang dicentang."
      tutup={tutup}
    >
      <form action={simpanPaket} className="space-y-4">
        {paket && <input type="hidden" name="id" value={paket.id} />}

        <div>
          <label className={LABEL} htmlFor="nama">
            Nama
          </label>
          <input
            id="nama"
            name="nama"
            required
            minLength={3}
            maxLength={60}
            defaultValue={paket?.nama}
            placeholder="8 Sesi Reformer"
            className={INPUT}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={LABEL} htmlFor="jumlah_kredit">
              Kredit
            </label>
            <input
              id="jumlah_kredit"
              name="jumlah_kredit"
              type="number"
              required
              min={1}
              max={200}
              defaultValue={paket?.jumlah_kredit ?? 8}
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
              defaultValue={paket?.masa_berlaku_hari ?? 60}
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL} htmlFor="harga_rupiah">
              Harga (Rp)
            </label>
            <input
              id="harga_rupiah"
              name="harga_rupiah"
              type="number"
              required
              min={0}
              step={1000}
              defaultValue={paket?.harga_rupiah ?? 1200000}
              className={INPUT}
            />
          </div>
        </div>

        <fieldset>
          <legend className={LABEL}>Kelas yang tercakup</legend>
          <div className="mt-2 flex flex-wrap gap-x-4">
            {jenis.map((j) => (
              <label
                key={j.id}
                className="flex min-h-11 items-center gap-2 text-app-body"
              >
                <input
                  type="checkbox"
                  name="class_type_ids"
                  value={j.id}
                  defaultChecked={paket?.kelas_ids.includes(j.id) ?? false}
                  className="size-4"
                />
                {j.nama}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex gap-3">
          <Tombol anak={paket ? "Simpan" : "Tambah"} />
          <Batal tutup={tutup} />
        </div>
      </form>
    </Bingkai>
  );
}

/** Konfirmasi: sembunyikan mencabut paket dari halaman publik. */
export function DialogTanya({
  judul,
  catatan,
  tombol,
  aksi,
  kolom,
  tutup,
}: {
  judul: string;
  catatan: string;
  tombol: string;
  aksi: (formData: FormData) => Promise<void>;
  kolom: Record<string, string>;
  tutup: string;
}) {
  return (
    <Bingkai judul={judul} catatan={catatan} tutup={tutup}>
      <form action={aksi} className="flex gap-3">
        {Object.entries(kolom).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <Tombol gaya="garis" anak={tombol} />
        <Batal tutup={tutup} />
      </form>
    </Bingkai>
  );
}
