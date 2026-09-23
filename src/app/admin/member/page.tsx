// Layar A4 Direktori member — UC-A16. Cari, halaman, dan jumlah baris lewat
// URL (`?q=`, `?hal=`, `?per=`), jadi hasilnya bisa ditautkan. Server Component.

import Link from "next/link";
import { pg } from "@/db";
import { daftarMember, type BarisMember } from "@/db/kelola";
import { pastikanAdmin } from "@/lib/masuk";
import { selisihManusiawi, tanggalRingkasWib } from "@/lib/waktu";
import { tautanWa } from "@/lib/wa";
import { Angka, Halaman, Kartu, Kerangka, Tombol } from "@/components/kerangka";
import { StatusKredit, type StatusKredit as Status } from "@/components/status-kredit";

export const dynamic = "force-dynamic";

const MEPET = 7 * 86_400_000;
const LAMA = 30 * 86_400_000;
const PER_HALAMAN = [10, 25, 50] as const;
const BAKU = 10;

/** Tiga status yang menentukan TINDAKAN: kuning "hubungi hari ini", abu
 *  "tawarkan paket". */
function status(m: BarisMember, kini: number): [Status, string] {
  if (m.sisa_kredit <= 0 || !m.hangus_at)
    return ["kosong", "Tidak punya kredit aktif — tawarkan paket"];
  if (m.hangus_at.getTime() - kini < MEPET)
    return [
      "segera",
      `${m.sisa_kredit} kredit hangus ${selisihManusiawi(m.hangus_at, new Date(kini))}`,
    ];
  return ["aman", `${m.sisa_kredit} kredit, masa berlaku masih panjang`];
}

function tautan(kini: URLSearchParams, ubah: Record<string, string | null>) {
  const p = new URLSearchParams(kini);
  for (const [k, v] of Object.entries(ubah)) {
    if (v === null) p.delete(k);
    else p.set(k, v);
  }
  const s = p.toString();
  return s ? `/admin/member?${s}` : "/admin/member";
}

const TH =
  "px-3 py-2 text-left text-app-label uppercase tracking-[0.08em] text-muted-foreground font-medium";
const TD = "px-3 py-2 align-middle";

export default async function A4({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; hal?: string; per?: string; kabar?: string }>;
}) {
  const pengguna = await pastikanAdmin();
  const { q, hal, per, kabar } = await searchParams;
  const sekarang = new Date();
  const kini = sekarang.getTime();

  const semua = await daftarMember(pg, { q, sekarang });

  // Batas dijaga di sini, bukan dipercayakan ke tautan kita sendiri: `?per=99999`
  // cuma perlu diketik sekali.
  const perHalaman = PER_HALAMAN.includes(Number(per) as never)
    ? Number(per)
    : BAKU;
  const halaman = Math.max(
    1,
    Math.min(Math.ceil(semua.length / perHalaman) || 1, Math.trunc(Number(hal)) || 1),
  );
  const mulai = (halaman - 1) * perHalaman;
  const baris = semua.slice(mulai, mulai + perHalaman);

  const mepet = semua
    .filter(
      (m) => m.sisa_kredit > 0 && m.hangus_at && m.hangus_at.getTime() - kini < MEPET,
    )
    .sort((a, b) => a.hangus_at!.getTime() - b.hangus_at!.getTime());
  const menghilang = semua
    .filter(
      (m) =>
        m.sisa_kredit > 0 &&
        m.booking_aktif === 0 &&
        (!m.terakhir_hadir || kini - m.terakhir_hadir.getTime() > LAMA),
    )
    .slice(0, 6);

  const param = new URLSearchParams();
  if (q) param.set("q", q);
  if (per) param.set("per", per);

  return (
    <Kerangka
      nama={pengguna.nama}
      peran={pengguna.peran}
      aktif="/admin/member"
      kabar={kabar}
    >
      <div className="grid grid-cols-12 gap-dekat">
        <div className="col-span-12 xl:col-span-8">
          <Kartu padat>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
              <form className="flex items-center gap-2">
                {per && <input type="hidden" name="per" value={per} />}
                <input
                  type="search"
                  name="q"
                  defaultValue={q ?? ""}
                  placeholder="Cari nama atau nomor HP"
                  aria-label="Cari member"
                  className="h-11 w-64 rounded-sm border border-border bg-background px-3 text-app-body-sm"
                />
                <Tombol gaya="halus" kecil anak="Cari" />
              </form>

              {q && (
                <Link
                  href={tautan(param, { q: null, hal: null })}
                  className="inline-flex min-h-11 items-center text-app-body-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Hapus filter
                </Link>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-app-body-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className={`${TH} w-11`}>
                      <span className="sr-only">Status kredit</span>
                    </th>
                    <th className={TH}>Nama</th>
                    <th className={`${TH} w-36`}>No. HP</th>
                    <th className={`${TH} w-20 text-right`}>Kredit</th>
                    <th className={`${TH} w-32`}>Hangus</th>
                    <th className={`${TH} w-32`}>Terakhir hadir</th>
                    <th className={`${TH} w-32 text-right`}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {baris.map((m) => {
                    const [kode, judul] = status(m, kini);
                    return (
                      <tr
                        key={m.id}
                        className="border-b border-border last:border-0 transition-colors hover:bg-muted"
                      >
                        <td className="pl-1 align-middle">
                          <StatusKredit status={kode} judul={judul} />
                        </td>
                        <td className={TD}>
                          <Link
                            href={`/admin/member/${m.id}`}
                            className="text-app-body underline underline-offset-4"
                          >
                            {m.nama}
                          </Link>
                        </td>
                        <td className={`${TD} tabular-nums text-muted-foreground`}>
                          {m.telepon}
                        </td>
                        <td className={`${TD} text-right tabular-nums`}>
                          {m.sisa_kredit || "—"}
                        </td>
                        <td className={`${TD} whitespace-nowrap text-muted-foreground`}>
                          {m.sisa_kredit > 0 && m.hangus_at
                            ? tanggalRingkasWib(m.hangus_at)
                            : "—"}
                        </td>
                        <td className={`${TD} whitespace-nowrap text-muted-foreground`}>
                          {m.terakhir_hadir
                            ? tanggalRingkasWib(m.terakhir_hadir)
                            : "—"}
                        </td>
                        <td className={`${TD} text-right`}>
                          <div className="flex justify-end gap-1">
                            <Link
                              href={`/admin/member/${m.id}`}
                              className="inline-flex min-h-11 items-center rounded-sm px-2 text-app-label uppercase text-muted-foreground transition-colors hover:text-foreground"
                            >
                              Lihat
                            </Link>
                            <a
                              href={tautanWa(
                                m.telepon,
                                `Halo ${m.nama}, dari Studio Pilates Kenari.`,
                              )}
                              className="inline-flex min-h-11 items-center rounded-sm px-2 text-app-label uppercase text-muted-foreground transition-colors hover:text-foreground"
                            >
                              WA
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {baris.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-app-body text-muted-foreground"
                      >
                        {q
                          ? `Tidak ada member yang cocok dengan "${q}".`
                          : "Belum ada member terdaftar."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
              <div className="flex items-center gap-2 text-app-body-sm text-muted-foreground">
                <span>Baris</span>
                {PER_HALAMAN.map((n) => (
                  <Link
                    key={n}
                    // Ganti jumlah baris selalu balik ke halaman 1.
                    href={tautan(param, {
                      per: n === BAKU ? null : String(n),
                      hal: null,
                    })}
                    className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm border px-2 tabular-nums transition-colors ${
                      perHalaman === n
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:border-foreground"
                    }`}
                  >
                    {n}
                  </Link>
                ))}
              </div>

              <Halaman
                mulai={mulai}
                tampil={baris.length}
                total={semua.length}
                sebelum={
                  halaman > 1 ? tautan(param, { hal: String(halaman - 1) }) : null
                }
                sesudah={
                  mulai + baris.length < semua.length
                    ? tautan(param, { hal: String(halaman + 1) })
                    : null
                }
              />
            </div>
          </Kartu>
        </div>

        <div className="col-span-12 space-y-dekat xl:col-span-4">
          <Kartu>
            <Angka
              nilai={semua.filter((m) => m.sisa_kredit > 0).length}
              label="Punya kredit hidup"
              catatan={`dari ${semua.length} member terdaftar`}
            />
          </Kartu>

          {/* Bukan ringkasan — daftar orang yang harus dihubungi hari ini. */}
          <Kartu
            judul="Kredit hangus ≤ 7 hari"
            catatan={`${mepet.length} orang. Urut dari yang paling dekat.`}
            warna="bg-warn-surface border-border-warm"
            padat
          >
            <ul className="divide-y divide-border-warm">
              {mepet.slice(0, 6).map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/member/${m.id}`}
                      className="text-app-body-sm underline underline-offset-4"
                    >
                      {m.nama}
                    </Link>
                    <p className="text-app-label tabular-nums text-warn-foreground">
                      {m.sisa_kredit} kredit ·{" "}
                      {selisihManusiawi(m.hangus_at!, sekarang)}
                    </p>
                  </div>
                  <a
                    href={tautanWa(
                      m.telepon,
                      `Halo ${m.nama}, sisa ${m.sisa_kredit} kredit kamu hangus ${tanggalRingkasWib(m.hangus_at!)}. Mau saya bookingkan kelas?`,
                    )}
                    className="inline-flex min-h-11 shrink-0 items-center rounded-sm bg-primary px-3 text-app-label font-medium uppercase text-primary-foreground transition hover:brightness-95"
                  >
                    Chat
                  </a>
                </li>
              ))}
              {mepet.length === 0 && (
                <li className="px-4 py-4 text-app-body-sm text-warn-foreground">
                  Tidak ada yang mendesak minggu ini.
                </li>
              )}
            </ul>
          </Kartu>

          {/* Punya kredit, tidak memesan apa pun, lama tidak kelihatan. */}
          <Kartu
            judul="Punya kredit, lama tak datang"
            catatan="Belum pesan kelas dan tidak hadir 30 hari terakhir."
            padat
          >
            <ul className="divide-y divide-border">
              {menghilang.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/member/${m.id}`}
                      className="text-app-body-sm underline underline-offset-4"
                    >
                      {m.nama}
                    </Link>
                    <p className="text-app-label tabular-nums text-muted-foreground">
                      {m.sisa_kredit} kredit ·{" "}
                      {m.terakhir_hadir
                        ? `hadir ${tanggalRingkasWib(m.terakhir_hadir)}`
                        : "belum pernah hadir"}
                    </p>
                  </div>
                  <a
                    href={tautanWa(
                      m.telepon,
                      `Halo ${m.nama}, lama tidak lihat kamu di studio. Kreditnya masih ${m.sisa_kredit} lho — mau saya carikan jadwal?`,
                    )}
                    className="inline-flex min-h-11 shrink-0 items-center rounded-sm border border-border px-3 text-app-label uppercase transition-colors hover:border-foreground"
                  >
                    Chat
                  </a>
                </li>
              ))}
              {menghilang.length === 0 && (
                <li className="px-4 py-4 text-app-body-sm text-muted-foreground">
                  Semua yang punya kredit sedang aktif.
                </li>
              )}
            </ul>
          </Kartu>
        </div>
      </div>
    </Kerangka>
  );
}
