// Layar A7 Aturan jadwal — UC-O01. Jadwal disimpan sebagai aturan mingguan
// (BR-7.1); menambah aturan lewat layar ini langsung menerbitkan sesinya.
// Menghentikan aturan tidak menghapus barisnya — `sessions.schedule_rule_id`
// menunjuk ke sana; yang dihapus hanya sesi mendatang yang kosong.

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
  const owner = pengguna.peran === "owner";
  const { kabar, buat, hari } = await searchParams;
  // Di layar INI yang dicari slot mingguan, jadi itu tab bawaan.
  const modeBuat: ModeBuat = buat === "sekali" ? "sekali" : "berulang";
  const sekarang = new Date();

  const aturan = await daftarAturan(pg, sekarang);
  const aktif = aturan.filter((a) => !a.berlaku_sampai);

  // Tab hari — DS-41. Nol = semua hari, dan itu bawaannya.
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

                    {/* Tanpa "Jalankan lagi", satu-satunya pembatal Hentikan
                        adalah Reset Demo. */}
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
