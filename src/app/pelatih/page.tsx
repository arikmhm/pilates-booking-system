// Layar C1 Kelas saya — UC-C01, UC-C02. Murni baca; absensi milik admin (BR-9.4).

import { pg } from "@/db";
import { kelasCoach } from "@/db/kelola";
import { pastikanCoach } from "@/lib/masuk";
import { hariWib, jamWib, kunciHariWib } from "@/lib/waktu";
import { Angka, Chip, Kartu, Kerangka } from "@/components/kerangka";

export const dynamic = "force-dynamic";

const CHIP: Record<string, [string, string]> = {
  confirmed: ["bg-ok-surface text-ok-foreground", "Terdaftar"],
  attended: ["bg-primary text-primary-foreground", "Hadir"],
  no_show: ["bg-danger-surface text-danger-foreground", "Tidak datang"],
};

export default async function C1({
  searchParams,
}: {
  searchParams: Promise<{ kabar?: string }>;
}) {
  const pengguna = await pastikanCoach();
  const { kabar } = await searchParams;
  const sekarang = new Date();

  const kelas = await kelasCoach(pg, { coach_id: pengguna.id, sekarang });

  const hariIni = kunciHariWib(sekarang);
  const kelasHariIni = kelas.filter((k) => kunciHariWib(k.mulai_at) === hariIni);
  const pekanIni = kelas.filter(
    (k) => k.mulai_at.getTime() < sekarang.getTime() + 7 * 86_400_000,
  );
  const orang = pekanIni.reduce((t, k) => t + k.peserta.length, 0);

  // Dikelompokkan per hari WIB, bukan UTC (BR-7.5).
  const perHari = new Map<string, typeof kelas>();
  for (const k of kelas) {
    const kunci = kunciHariWib(k.mulai_at);
    perHari.set(kunci, [...(perHari.get(kunci) ?? []), k]);
  }

  return (
    <Kerangka
      nama={pengguna.nama}
      peran={pengguna.peran}
      aktif="/pelatih"
      judul="Kelas Saya"
      kabar={kabar}
    >
      <div>
        <h1 className="text-app-title">Kelas saya</h1>
        <p className="text-app-body-sm text-muted-foreground">
          Jadwal mengajar {pengguna.nama}
        </p>
      </div>

      <div className="mt-dekat grid gap-dekat sm:grid-cols-3">
        <Kartu>
          <Angka nilai={kelasHariIni.length} label="Kelas hari ini" />
        </Kartu>
        <Kartu>
          <Angka nilai={pekanIni.length} label="Kelas 7 hari ke depan" />
        </Kartu>
        <Kartu>
          <Angka
            nilai={orang}
            label="Peserta 7 hari ke depan"
            catatan="Termasuk yang belum dicentang hadir."
          />
        </Kartu>
      </div>

      {kelas.length === 0 && (
        <p className="mt-sedang text-app-body text-muted-foreground">
          Belum ada kelas terjadwal atas nama kamu.
        </p>
      )}

      <div className="mt-dekat space-y-dekat">
        {[...perHari.entries()].map(([kunci, sesi]) => (
          <Kartu key={kunci} judul={hariWib(sesi[0].mulai_at)} padat>
            <ul className="divide-y divide-border">
              {sesi.map((k) => (
                <li key={k.id} className="flex flex-wrap gap-4 px-4 py-4">
                  <div className="w-16 shrink-0">
                    <p className="text-app-section tabular-nums">
                      {jamWib(k.mulai_at)}
                    </p>
                    <p className="text-app-label uppercase text-muted-foreground">
                      {k.durasi_menit}m
                    </p>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-app-body">{k.kelas}</p>
                      {k.status === "cancelled" ? (
                        <Chip
                          warna="bg-danger-surface text-danger-foreground"
                          anak="Kelas dibatalkan"
                        />
                      ) : (
                        <Chip
                          warna="bg-neutral-surface text-neutral-foreground"
                          anak={`${k.peserta.length}/${k.kapasitas} kursi`}
                        />
                      )}
                    </div>

                    {k.peserta.length === 0 ? (
                      <p className="mt-1 text-app-body-sm text-muted-foreground">
                        Belum ada yang mendaftar.
                      </p>
                    ) : (
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {k.peserta.map((p) => {
                          const [warna, teks] = CHIP[p.status] ?? CHIP.confirmed;
                          return (
                            <li
                              key={`${k.id}-${p.nomor_alat}`}
                              className="flex items-center gap-2 rounded-sm border border-border px-3 py-1"
                            >
                              <span className="text-app-body-sm tabular-nums text-muted-foreground">
                                {p.nomor_alat}
                              </span>
                              <span className="text-app-body-sm">{p.nama}</span>
                              <Chip warna={warna} anak={teks} />
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Kartu>
        ))}
      </div>
    </Kerangka>
  );
}
