// Layar A7 Aturan jadwal — UC-O01.
//
// Jadwal studio disimpan sebagai aturan berulang mingguan, bukan sebagai
// daftar tanggal (BR-7.1). Yang diketik di sini "Selasa 07.00 Reformer";
// sesi nyatanya terbit sampai `generate_weeks_ahead` minggu ke depan saat
// tombol "Terbitkan sekarang" ditekan — tidak lagi tiap malam sendiri.
// Menambah aturan lewat layar ini langsung menerbitkan sesinya juga, supaya
// slot yang baru diketik tidak menghilang sampai ada yang ingat menekan
// tombolnya.
//
// Menghentikan aturan TIDAK menghapus barisnya: `sessions.schedule_rule_id`
// menunjuk ke sana, dan sesi yang sudah punya peserta tidak boleh hilang
// diam-diam. Yang dihapus hanya sesi mendatang yang benar-benar kosong.

import Link from "next/link";
import { pg } from "@/db";
import { daftarAturan, HARI } from "@/db/kelola";
import { pastikanAdmin } from "@/lib/masuk";
import { Chip, Kartu, Kerangka, Tombol } from "@/components/kerangka";
import { BuatKelas, type ModeBuat } from "@/app/jadwal/buat-kelas";
import { berhentikanAturan, jalankanLagiAturan } from "../kelola-aksi";

export const dynamic = "force-dynamic";

export default async function A7({
  searchParams,
}: {
  searchParams: Promise<{ kabar?: string; buat?: string; hari?: string }>;
}) {
  const pengguna = await pastikanAdmin();
  // Slot mingguan permanen = beban tiap minggu, kewenangan owner. Kelas
  // sekali jalan tetap milik admin — operasional dan sering mendesak.
  const owner = pengguna.peran === "owner";
  const { kabar, buat, hari } = await searchParams;
  // Di layar INI yang dicari orang adalah slot mingguan, jadi itu tab bawaan.
  // Di sebelah kalender sebaliknya — yang dicari di sana lubang satu minggu.
  const modeBuat: ModeBuat = buat === "sekali" ? "sekali" : "berulang";
  const sekarang = new Date();

  const aturan = await daftarAturan(pg, sekarang);
  const aktif = aturan.filter((a) => !a.berlaku_sampai);

  // Tab hari — DS-41. Empat puluh baris dalam satu daftar berarti menggulir
  // untuk menjawab "Selasa isinya apa?", padahal jadwal studio selalu dibaca
  // per hari. Nol = semua hari, dan itu tetap bawaannya: yang baru membuka
  // layar ini ingin melihat seluruhnya dulu.
  const hariAktif = HARI[Number(hari) - 1] ? Number(hari) : 0;
  const tampil = hariAktif ? aturan.filter((a) => a.hari === hariAktif) : aturan;
  const tautanHari = (h: number) => {
    const q = new URLSearchParams();
    if (h) q.set("hari", String(h));
    if (buat) q.set("buat", buat);
    const sisa = q.toString();
    return sisa ? `/admin/jadwal?${sisa}` : "/admin/jadwal";
  };

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
          {aktif.length} dari {aturan.length} kelas rutin berjalan · sesi
          diterbitkan dari panel di kanan, bukan otomatis
        </p>
      </div>

      {/* min-w-0 di kedua sisi: butir grid bawaannya `min-width:auto`, dan
          lebar min-content sebuah <select> ditentukan opsi terpanjangnya —
          cukup untuk mendorong seluruh halaman melar di layar 375px. */}
      <div className="mt-dekat grid gap-dekat lg:grid-cols-[minmax(0,1fr)_30rem]">
        <Kartu judul="Jadwal mingguan" padat min0>
          <div className="flex flex-wrap items-center gap-1 border-b border-border px-2 py-2">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((h) => {
              const n = h ? aturan.filter((a) => a.hari === h).length : aturan.length;
              const dipilih = h === hariAktif;
              return (
                <Link
                  key={h}
                  href={tautanHari(h)}
                  aria-current={dipilih ? "true" : undefined}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-sm px-3 text-app-label uppercase transition-colors ${
                    dipilih
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {h ? HARI[h - 1].slice(0, 3) : "Semua"}
                  <span className="tabular-nums opacity-70">{n}</span>
                </Link>
              );
            })}
          </div>

          {tampil.length === 0 ? (
            <p className="p-4 text-app-body text-muted-foreground">
              {aturan.length === 0
                ? "Belum ada jadwal mingguan."
                : `Tidak ada kelas rutin di hari ${HARI[hariAktif - 1]}.`}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {tampil.map((a) => {
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
                        {a.coach ?? "Tanpa coach"} · {a.durasi_menit} menit
                        {a.durasi_rule === null && " (bawaan)"} ·{" "}
                        {a.kapasitas ?? a.kapasitas_default} kursi
                        {a.kapasitas === null && " (bawaan)"}
                      </p>
                    </div>

                    <div className="w-32 shrink-0 text-app-body-sm tabular-nums text-muted-foreground">
                      {a.sesi_mendatang} sesi mendatang
                    </div>

                    {/* Dihentikan bukan keadaan akhir — tanpa "Jalankan
                        lagi", satu klik Hentikan cuma bisa dibatalkan dengan
                        Reset Demo, yang membuang seluruh data lain sekalian. */}
                    {berhenti ? (
                      owner ? (
                        <form action={jalankanLagiAturan} className="shrink-0">
                          <input type="hidden" name="id" value={a.id} />
                          <input
                            type="hidden"
                            name="dari"
                            value="/admin/jadwal"
                          />
                          <Tombol gaya="halus" kecil anak="Jalankan lagi" />
                        </form>
                      ) : (
                        <Chip
                          warna="bg-neutral-surface text-neutral-foreground"
                          anak="Dihentikan"
                        />
                      )
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
        <div className="min-w-0">
          <BuatKelas
            owner={owner}
            mode={modeBuat}
            tautan={(m) =>
              m === "sekali" ? "/admin/jadwal?buat=sekali" : "/admin/jadwal"
            }
            kembali="/admin/jadwal"
            sekarang={sekarang}
            terbit
          />
        </div>
      </div>
    </Kerangka>
  );
}
