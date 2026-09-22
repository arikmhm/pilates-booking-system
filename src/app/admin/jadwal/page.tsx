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
import { daftarAturan, HARI } from "@/db/kelola";
import { pastikanAdmin } from "@/lib/masuk";
import { Chip, Kartu, Kerangka, Tombol } from "@/components/kerangka";
import { BuatKelas, type ModeBuat } from "@/app/jadwal/buat-kelas";
import { berhentikanAturan } from "../kelola-aksi";

export const dynamic = "force-dynamic";

export default async function A7({
  searchParams,
}: {
  searchParams: Promise<{ kabar?: string; buat?: string }>;
}) {
  const pengguna = await pastikanAdmin();
  // Slot mingguan permanen = beban tiap minggu, kewenangan owner. Kelas
  // sekali jalan tetap milik admin — operasional dan sering mendesak.
  const owner = pengguna.peran === "owner";
  const { kabar, buat } = await searchParams;
  // Di layar INI yang dicari orang adalah slot mingguan, jadi itu tab bawaan.
  // Di sebelah kalender sebaliknya — yang dicari di sana lubang satu minggu.
  const modeBuat: ModeBuat = buat === "sekali" ? "sekali" : "berulang";
  const sekarang = new Date();

  const aturan = await daftarAturan(pg, sekarang);
  const aktif = aturan.filter((a) => !a.berlaku_sampai);

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
                    ) : owner ? (
                      <form action={berhentikanAturan} className="shrink-0">
                        <input type="hidden" name="id" value={a.id} />
                        <Tombol gaya="halus" kecil anak="Hentikan" />
                      </form>
                    ) : (
                      <Chip
                        warna="bg-ok-surface text-ok-foreground"
                        anak="Berjalan"
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Kartu>

        {/* Formulir yang sama persis dengan yang ada di sebelah kalender
            (DS-40). Satu komponen, dua layar — dulu dua salinan yang harus
            diubah bersamaan tiap kali jenis kelas atau batas kursi berubah. */}
        <div>
          <BuatKelas
            owner={owner}
            mode={modeBuat}
            tautan={(m) =>
              m === "sekali" ? "/admin/jadwal?buat=sekali" : "/admin/jadwal"
            }
            kembali="/admin/jadwal"
            sekarang={sekarang}
          />
        </div>
      </div>
    </Kerangka>
  );
}
