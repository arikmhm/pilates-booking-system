// Layar A4 Direktori member — UC-A16.
//
// Sampai sekarang satu-satunya jalan ke detail member adalah lewat panel
// "kredit hangus" atau daftar peserta sebuah sesi. Artinya member yang
// kreditnya masih panjang dan tidak sedang ikut kelas apa pun tidak bisa
// dicari sama sekali — padahal itu pertanyaan resepsionis paling sering:
// "Bu Sri tadi telepon, kreditnya masih berapa?"

import Link from "next/link";
import { pg } from "@/db";
import { daftarMember, type BarisMember } from "@/db/kelola";
import { pastikanAdmin } from "@/lib/masuk";
import { hariPendekWib, selisihManusiawi } from "@/lib/waktu";
import { Angka, Chip, Kartu, Kerangka, Tombol } from "@/components/kerangka";

export const dynamic = "force-dynamic";

/** DS-14 — warna tidak pernah jadi satu-satunya penanda; tiap chip berteks. */
function chip(m: BarisMember, sekarang: Date): [string, string] {
  if (m.sisa_kredit <= 0)
    return ["bg-neutral-surface text-neutral-foreground", "Kredit habis"];
  const mepet =
    m.hangus_at &&
    m.hangus_at.getTime() - sekarang.getTime() < 7 * 86_400_000;
  return mepet
    ? ["bg-warn-surface text-warn-foreground", `${m.sisa_kredit} kredit · segera hangus`]
    : ["bg-ok-surface text-ok-foreground", `${m.sisa_kredit} kredit`];
}

export default async function A4({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kabar?: string }>;
}) {
  const pengguna = await pastikanAdmin();
  const { q, kabar } = await searchParams;
  const sekarang = new Date();

  const baris = await daftarMember(pg, { q, sekarang });

  const berkredit = baris.filter((m) => m.sisa_kredit > 0).length;
  const mepet = baris.filter(
    (m) =>
      m.sisa_kredit > 0 &&
      m.hangus_at &&
      m.hangus_at.getTime() - sekarang.getTime() < 7 * 86_400_000,
  ).length;

  return (
    <Kerangka
      nama={pengguna.nama}
      peran={pengguna.peran}
      aktif="/admin/member"
      kabar={kabar}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-app-title">Member</h1>
          <p className="text-app-body-sm text-muted-foreground">
            {q ? `${baris.length} hasil untuk "${q}"` : `${baris.length} orang terdaftar`}
          </p>
        </div>

        {/* GET, bukan server action: hasil pencarian harus bisa ditautkan dan
            di-refresh tanpa mengirim ulang apa pun. */}
        <form className="flex items-center gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Cari nama atau nomor HP"
            className="h-12 w-64 rounded-sm border border-border bg-background px-3 text-app-body"
          />
          <Tombol gaya="halus" kecil anak="Cari" />
        </form>
      </div>

      <div className="mt-dekat grid gap-dekat sm:grid-cols-3">
        <Kartu>
          <Angka nilai={baris.length} label="Member" />
        </Kartu>
        <Kartu>
          <Angka nilai={berkredit} label="Punya kredit hidup" />
        </Kartu>
        <Kartu warna="bg-warn-surface border-border-warm">
          <Angka
            nilai={mepet}
            label="Hangus ≤ 7 hari"
            catatan="Ada tombol chat-nya di Dashboard."
            warnaCatatan="text-warn-foreground"
          />
        </Kartu>
      </div>

      <div className="mt-dekat">
        <Kartu padat>
          {baris.length === 0 ? (
            <p className="p-4 text-app-body text-muted-foreground">
              Tidak ada member yang cocok.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {baris.map((m) => {
                const [warna, teks] = chip(m, sekarang);
                return (
                  <li key={m.id}>
                    <Link
                      href={`/admin/member/${m.id}`}
                      className="flex flex-wrap items-center gap-4 px-4 py-3 transition-colors hover:bg-muted"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-app-body">{m.nama}</p>
                        <p className="text-app-body-sm tabular-nums text-muted-foreground">
                          {m.telepon}
                        </p>
                      </div>

                      <div className="w-40 shrink-0 text-app-body-sm text-muted-foreground">
                        {m.hangus_at
                          ? `Hangus ${hariPendekWib(m.hangus_at)} · ${selisihManusiawi(m.hangus_at, sekarang)}`
                          : "Tidak ada paket hidup"}
                      </div>

                      <div className="w-32 shrink-0 text-app-body-sm text-muted-foreground">
                        {m.booking_aktif > 0
                          ? `${m.booking_aktif} kelas dipesan`
                          : "Belum pesan kelas"}
                      </div>

                      <div className="w-36 shrink-0 text-app-body-sm text-muted-foreground">
                        {m.terakhir_hadir
                          ? `Hadir ${hariPendekWib(m.terakhir_hadir)}`
                          : "Belum pernah hadir"}
                      </div>

                      <Chip warna={warna} anak={teks} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Kartu>
      </div>
    </Kerangka>
  );
}
