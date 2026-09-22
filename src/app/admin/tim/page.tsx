// Layar A5 Pelatih & staf — UC-A17.
//
// Bukan layar CRUD. Coach adalah baris `users` dengan `peran='coach'`
// (05-data-model.md bagian 7), jadi yang berguna di sini bukan formulir
// melainkan jawaban atas satu pertanyaan: siapa mengajar berapa kelas.
// Beban yang timpang baru terlihat kalau diletakkan bersebelahan.

import Link from "next/link";
import { pg } from "@/db";
import { daftarTim } from "@/db/kelola";
import { pastikanAdmin } from "@/lib/masuk";
import { tautanWa } from "@/lib/wa";
import { Chip, Kartu, Kerangka } from "@/components/kerangka";

export const dynamic = "force-dynamic";

const WARNA: Record<string, string> = {
  owner: "bg-primary text-primary-foreground",
  admin: "bg-neutral-surface text-neutral-foreground",
  coach: "bg-ok-surface text-ok-foreground",
};
const LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  coach: "Coach",
};

export default async function A5({
  searchParams,
}: {
  searchParams: Promise<{ kabar?: string }>;
}) {
  const pengguna = await pastikanAdmin();
  const { kabar } = await searchParams;

  const tim = await daftarTim(pg, new Date());
  const coach = tim.filter((t) => t.peran === "coach");
  const staf = tim.filter((t) => t.peran !== "coach");

  return (
    <Kerangka
      nama={pengguna.nama}
      peran={pengguna.peran}
      aktif="/admin/tim"
      kabar={kabar}
    >
      <div>
        <h1 className="text-app-title">Pelatih & staf</h1>
        <p className="text-app-body-sm text-muted-foreground">
          {coach.length} pelatih · {staf.length} staf
        </p>
      </div>

      <div className="mt-dekat grid gap-dekat lg:grid-cols-2">
        <Kartu
          judul="Pelatih"
          catatan="Beban mengajar tujuh hari ke depan."
          padat
        >
          <ul className="divide-y divide-border">
            {coach.map((c) => (
              <li key={c.id} className="flex items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-app-body">{c.nama}</p>
                  <p className="text-app-body-sm tabular-nums text-muted-foreground">
                    {c.telepon}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-app-body tabular-nums">
                    {c.kelas_pekan_ini}
                  </p>
                  <p className="text-app-label uppercase text-muted-foreground">
                    kelas / 7 hari
                  </p>
                </div>
                <a
                  href={tautanWa(
                    c.telepon,
                    `Halo ${c.nama}, ada perubahan jadwal mengajar. Boleh dicek?`,
                  )}
                  className="inline-flex min-h-11 shrink-0 items-center rounded-sm border border-border px-3 text-app-label uppercase transition-colors hover:border-foreground"
                >
                  Chat WA
                </a>
              </li>
            ))}
            {coach.length === 0 && (
              <li className="px-4 py-4 text-app-body text-muted-foreground">
                Belum ada pelatih.
              </li>
            )}
          </ul>
        </Kartu>

        <Kartu judul="Staf" catatan="Siapa boleh membuka layar mana." padat>
          <ul className="divide-y divide-border">
            {staf.map((s) => (
              <li key={s.id} className="flex items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-app-body">{s.nama}</p>
                  <p className="truncate text-app-body-sm text-muted-foreground">
                    {s.email ?? s.telepon}
                  </p>
                </div>
                <Chip
                  warna={WARNA[s.peran] ?? WARNA.admin}
                  anak={LABEL[s.peran] ?? s.peran}
                />
              </li>
            ))}
          </ul>
        </Kartu>
      </div>

      <div className="mt-dekat">
        <Kartu judul="Menambah orang" catatan="BR-9.1 · BR-9.4">
          <p className="max-w-[60ch] text-app-body text-muted-foreground">
            Pelatih dan staf adalah baris <code>users</code> dengan{" "}
            <code>peran</code> berbeda — tidak ada tabel terpisah
            (05-data-model.md bagian 7). Formulir tambah-orang butuh undangan
            lewat email, dan itu satu paket dengan login magic link yang belum
            dibangun. Di demo daftarnya datang dari seed.
          </p>
          <p className="mt-2 max-w-[60ch] text-app-body-sm text-muted-foreground">
            Yang sudah berjalan sekarang: <strong>Owner</strong> melihat
            Laporan, <strong>Admin</strong> tidak.{" "}
            <Link href="/masuk" className="underline underline-offset-4">
              Coba masuk sebagai keduanya
            </Link>{" "}
            untuk melihat menunya berubah.
          </p>
        </Kartu>
      </div>
    </Kerangka>
  );
}
