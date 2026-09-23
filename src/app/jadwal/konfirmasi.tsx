// Layar M2 Konfirmasi — panel geser di atas jadwal, bukan halaman sendiri.
// Buka-tutupnya lewat `?pilih=<session_id>`, jadi tanpa state klien dan tanpa JS.
// BR-2.6 — memilih alat sifatnya pilihan; radio kosong pertama sudah tercentang.

import Link from "next/link";
import { Tombol } from "@/components/kerangka";
import { hariWib, jamWib } from "@/lib/waktu";
import type { BarisJadwal } from "@/db/booking";
import type { Setelan } from "@/rules";
import { booking } from "./aksi";

function Baris({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="text-app-body-sm text-muted-foreground">{label}</span>
      <span className="text-app-body text-right">{nilai}</span>
    </div>
  );
}

export function Konfirmasi({
  sesi,
  terpakai,
  setelan,
  sisa,
  tutup,
}: {
  sesi: BarisJadwal;
  /** Nomor tempat yang sudah terisi — tampil mati. */
  terpakai: number[];
  setelan: Setelan;
  sisa: number;
  tutup: string;
}) {
  const dipakai = new Set(terpakai);
  const alat = Array.from({ length: sesi.kapasitas }, (_, i) => i + 1);
  const baku = alat.find((a) => !dipakai.has(a));

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Tirai sekaligus tombol tutup. Tautan, bukan tombol — tanpa JS pun jalan. */}
      <Link
        href={tutup}
        aria-label="Tutup konfirmasi"
        className="absolute inset-0 bg-foreground/40"
      />

      <div className="relative ml-auto flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-background">
        <div className="border-b border-border px-4 py-4">
          <p className="text-app-label uppercase text-muted-foreground">
            Konfirmasi booking
          </p>
          <h2 className="text-app-section">{sesi.kelas}</h2>
        </div>

        <form action={booking} className="flex flex-1 flex-col">
          <input type="hidden" name="session_id" value={sesi.id} />
          <input type="hidden" name="kembali" value={tutup} />

          <div className="divide-y divide-border px-4">
            <div className="py-2">
              <Baris label="Hari" nilai={hariWib(sesi.mulai_at)} />
              <Baris
                label="Jam"
                nilai={`${jamWib(sesi.mulai_at)} · ${sesi.durasi_menit} menit`}
              />
              <Baris label="Pelatih" nilai={sesi.coach ?? "—"} />
            </div>

            <fieldset className="py-4">
              <legend className="text-app-label uppercase text-muted-foreground">
                Pilih tempat
              </legend>
              {/* "Tempat", bukan "alat": nomor 3 itu matras di kelas Mat.
                  Kolomnya tetap `nomor_alat`. */}
              <p className="mt-1 text-app-body-sm text-muted-foreground">
                {sesi.kapasitas - sesi.terisi} dari {sesi.kapasitas} tempat masih
                kosong. Tidak memilih pun boleh — yang tercentang sudah siap.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {alat.map((a) => {
                  const mati = dipakai.has(a);
                  return (
                    <label key={a} className="block">
                      <input
                        type="radio"
                        name="nomor_alat"
                        value={a}
                        defaultChecked={a === baku}
                        disabled={mati}
                        className="peer sr-only"
                      />
                      <span
                        className={`flex size-11 items-center justify-center rounded-full border text-app-body tabular-nums transition peer-focus-visible:ring-2 peer-focus-visible:ring-foreground peer-focus-visible:ring-offset-2 ${
                          mati
                            ? "cursor-not-allowed border-border bg-muted text-muted-foreground line-through"
                            : "cursor-pointer border-border hover:border-foreground peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground"
                        }`}
                      >
                        {a}
                      </span>
                      <span className="sr-only">
                        {mati ? "sudah terisi" : "kosong"}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {/* BR-2.2 dan BR-3.1/BR-3.2 disebut sebelum tombolnya ditekan. */}
            <div className="py-4">
              <p className="text-app-body">
                1 kredit dipotong sekarang. Sisa kredit {sisa} → {sisa - 1}.
              </p>
              <p className="mt-2 text-app-body-sm text-muted-foreground">
                Batal paling lambat {setelan.cancel_window_hours} jam sebelum
                kelas: kredit kembali utuh dan masa berlakunya tidak berubah.
                Lewat dari itu, kreditnya hangus.
              </p>
            </div>
          </div>

          <div className="mt-auto flex items-center gap-2 border-t border-border px-4 py-4">
            <Tombol anak="Konfirmasi booking" penuh />
            <Link
              href={tutup}
              className="inline-flex h-12 items-center justify-center rounded-sm border border-border px-6 text-app-label font-medium uppercase transition hover:border-foreground"
            >
              Batal
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
