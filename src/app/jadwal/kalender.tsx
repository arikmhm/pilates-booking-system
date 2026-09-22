// Kalender mingguan — tampilan utama layar M1 di layar lebar.
//
// Pola Google Calendar: hari jadi kolom, jam jadi sumbu tegak, sesi jadi blok
// yang tingginya sebanding dengan durasinya. Yang dibeli dari pola itu bukan
// kemiripannya, tapi satu hal yang tidak bisa dilakukan daftar: jeda antar
// kelas jadi terlihat. Pemilik studio membaca lubang jadwal dari ruang kosong.
//
// Komponen server murni — semua perpindahan minggu lewat tautan, tidak ada
// state klien. Blok digambar `position: absolute` di dalam kolom harinya,
// karena grid CSS tidak bisa menaruh sesi 06.00 dan 06.50 di baris yang sama.
//
// DS-40 — kalender menggulung SENDIRI, dua arah, bukan menggulungkan halaman.
// Sejak kalender cuma memakai 8 dari 12 kolom, panel di sebelahnya harus tetap
// terbaca saat jadwalnya panjang. Baris hari menempel di atas dan lajur jam
// menempel di kiri, kalau tidak yang tergulung kehilangan sumbunya.

import { kunciHariWib, menitHariWib, namaHariWib, tanggalWib } from "@/lib/waktu";
import type { BarisJadwal } from "@/db/booking";

/** Tinggi satu jam. 72px membuat kelas 50 menit masih muat tiga baris teks. */
const JAM_PX = 72;

/** Dipakai kalau minggu yang dibuka kosong — jangan sampai tingginya nol. */
const RENTANG_BAKU = { awal: 6, akhir: 20 };

export type IsiBlok = {
  /** Warna latar + garis blok, dari palet status 07-design.md bagian 7. */
  warna: string;
  /** Baris terakhir di dalam blok: ajakan, status, atau alasan tolak. */
  catatan: string;
  /** Dibungkus form (booking) atau tautan (staf). Null = blok mati. */
  bungkus?: (anak: React.ReactNode) => React.ReactNode;
};

/**
 * Lajur untuk sesi yang tumpang tindih. Dua kelas di jam yang sama harus
 * berdampingan, bukan bertumpuk — blok yang tertutup blok lain sama saja
 * dengan kelas yang tidak ada.
 */
function lajur(sesi: BarisJadwal[]) {
  const akhirLajur: number[] = [];
  const peta = new Map<string, number>();
  for (const b of sesi) {
    const mulai = menitHariWib(b.mulai_at);
    let i = akhirLajur.findIndex((akhir) => akhir <= mulai);
    if (i === -1) i = akhirLajur.length;
    akhirLajur[i] = mulai + b.durasi_menit;
    peta.set(b.id, i);
  }
  return { peta, jumlah: Math.max(1, akhirLajur.length) };
}

export function Kalender({
  senin,
  baris,
  isi,
  hariIni,
}: {
  /** Senin 00.00 WIB. Tujuh kolomnya dihitung dari sini. */
  senin: Date;
  baris: BarisJadwal[];
  isi: (b: BarisJadwal) => IsiBlok;
  hariIni: string;
}) {
  const hari = Array.from(
    { length: 7 },
    (_, i) => new Date(senin.getTime() + i * 86_400_000),
  );

  const perHari = new Map<string, BarisJadwal[]>();
  for (const b of baris) {
    const k = kunciHariWib(b.mulai_at);
    perHari.set(k, [...(perHari.get(k) ?? []), b]);
  }

  // Rentang jam mengikuti isi minggunya. Menggambar 00.00–24.00 berarti 1728px
  // yang dua pertiganya kosong.
  const menitMulai = baris.map((b) => menitHariWib(b.mulai_at));
  const menitSelesai = baris.map(
    (b) => menitHariWib(b.mulai_at) + b.durasi_menit,
  );
  const jamAwal = baris.length
    ? Math.min(RENTANG_BAKU.awal, Math.floor(Math.min(...menitMulai) / 60))
    : RENTANG_BAKU.awal;
  const jamAkhir = baris.length
    ? Math.max(RENTANG_BAKU.akhir, Math.ceil(Math.max(...menitSelesai) / 60))
    : RENTANG_BAKU.akhir;

  const tinggi = (jamAkhir - jamAwal) * JAM_PX;
  const jamLabel = Array.from({ length: jamAkhir - jamAwal + 1 }, (_, i) => jamAwal + i);
  const kolom = "grid grid-cols-[3rem_repeat(7,minmax(0,1fr))]";

  // Garis jam digambar sebagai latar, bukan 105 div kosong.
  const garis = {
    backgroundImage:
      "repeating-linear-gradient(to bottom, var(--border) 0 1px, transparent 1px " +
      `${JAM_PX}px)`,
  };

  return (
    <div className="max-h-[calc(100svh-15rem)] overflow-auto rounded-md border border-border bg-background">
      {/* 44rem = 7 kolom hari @ ~93px + lajur jam. Di bawah itu barulah muncul
          gulung mendatar, dan ia berhenti di tepi kotak ini — bukan di tepi
          halaman (DS-40). */}
      <div className="min-w-[44rem]">
        <div className={`${kolom} sticky top-0 z-30 border-b border-border bg-background`}>
          <div className="sticky left-0 bg-background" />
          {hari.map((h) => {
            const ini = kunciHariWib(h) === hariIni;
            return (
              <div
                key={kunciHariWib(h)}
                className={`border-l border-border px-2 py-2 text-center ${
                  ini ? "bg-primary" : ""
                }`}
              >
                <p
                  className={`text-app-label uppercase ${
                    ini ? "text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {namaHariWib(h)}
                </p>
                <p className="text-app-body">{tanggalWib(h)}</p>
              </div>
            );
          })}
        </div>

        <div className={kolom}>
          <div
            className="sticky left-0 z-20 bg-background"
            style={{ height: tinggi }}
          >
            {jamLabel.map((j, i) => (
              <span
                key={j}
                className="absolute right-2 -translate-y-1/2 text-app-label tabular-nums text-muted-foreground"
                style={{ top: i * JAM_PX }}
              >
                {String(j).padStart(2, "0")}.00
              </span>
            ))}
          </div>

          {hari.map((h) => {
            const kunci = kunciHariWib(h);
            const sesi = perHari.get(kunci) ?? [];
            const { peta, jumlah } = lajur(sesi);

            return (
              <div
                key={kunci}
                className="relative border-l border-border"
                style={{ height: tinggi, ...garis }}
              >
                {sesi.map((b) => {
                  const { warna, catatan, bungkus } = isi(b);
                  const mulai = menitHariWib(b.mulai_at);
                  const i = peta.get(b.id) ?? 0;
                  const dalam = (
                    <div
                      className={`flex h-full w-full flex-col overflow-hidden rounded-sm border px-2 py-1 text-left ${warna}`}
                    >
                      <p className="text-app-label tabular-nums">
                        {String(Math.floor(mulai / 60)).padStart(2, "0")}.
                        {String(mulai % 60).padStart(2, "0")}
                      </p>
                      <p className="truncate text-app-body-sm font-medium">
                        {b.kelas}
                      </p>
                      <p className="truncate text-app-label opacity-70">
                        {b.coach ?? "—"}
                      </p>
                      <p className="mt-auto truncate text-app-label">{catatan}</p>
                    </div>
                  );

                  return (
                    <div
                      key={b.id}
                      className="absolute p-[2px]"
                      style={{
                        top: ((mulai - jamAwal * 60) / 60) * JAM_PX,
                        height: (b.durasi_menit / 60) * JAM_PX,
                        left: `${(i * 100) / jumlah}%`,
                        width: `${100 / jumlah}%`,
                      }}
                    >
                      {bungkus ? bungkus(dalam) : dalam}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
