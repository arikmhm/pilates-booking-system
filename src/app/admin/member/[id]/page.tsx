// Layar A3 Detail member — 02-rules.md bagian 6.1. Tampilan laptop (DS-16).
// "Dompet kredit · buku besar lengkap · koreksi manual"
//
// Ini layar yang dibuka saat member protes: "kredit saya kok berkurang?"
// Jawabannya harus ada di sini, baris per baris (BR-1.7).

import Link from "next/link";
import { notFound } from "next/navigation";
import { pg } from "@/db";
import { riwayatKredit, type BarisLedger } from "@/db/booking";
import {
  BATAS_KOREKSI,
  detailMember,
  dompetMember,
  type BarisDompet,
} from "@/db/admin";
import { pastikanAdmin } from "@/lib/masuk";
import { hariWib, jamWib, selisihManusiawi } from "@/lib/waktu";
import { tautanWa } from "@/lib/wa";
import { Angka, Chip, Kartu, Kerangka, Tombol } from "@/components/kerangka";
import { koreksiKreditManual } from "../../aksi";

export const dynamic = "force-dynamic";

function Paket({ p, sekarang }: { p: BarisDompet; sekarang: Date }) {
  const hangus = p.hangus_at <= sekarang;
  const mepet = !hangus && p.hangus_at.getTime() - sekarang.getTime() < 7 * 86_400_000;
  const [warna, teks] = hangus
    ? ["bg-neutral-surface text-neutral-foreground", "Hangus"]
    : mepet
      ? ["bg-warn-surface text-warn-foreground", selisihManusiawi(p.hangus_at, sekarang)]
      : ["bg-ok-surface text-ok-foreground", "Aktif"];

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-app-body">{p.paket}</p>
        <p className="truncate text-app-body-sm text-muted-foreground">
          Dibeli {hariWib(p.dibeli_at)} · hangus {hariWib(p.hangus_at)}
          {/* BR-5.2 — jejak perpanjangan disimpan supaya bisa dijelaskan */}
          {p.diperpanjang_at && " · diperpanjang setelah kelas dibatalkan"}
        </p>
      </div>
      <Chip warna={warna} anak={teks} />
      <span className="w-16 shrink-0 text-right text-app-section tabular-nums">
        {p.sisa}
        <span className="text-app-body-sm text-muted-foreground">
          /{p.jumlah_kredit_awal}
        </span>
      </span>
    </li>
  );
}

function Baris({ b }: { b: BarisLedger }) {
  const naik = b.delta > 0;
  return (
    <li className="flex items-baseline gap-4 px-4 py-3">
      <span className="w-40 shrink-0 text-app-body-sm text-muted-foreground">
        {hariWib(b.created_at)}
      </span>
      <span className="w-32 shrink-0 text-app-body first-letter:uppercase">
        {b.alasan.replace(/_/g, " ")}
      </span>
      <span className="min-w-0 flex-1 truncate text-app-body-sm text-muted-foreground">
        {b.kelas && b.mulai_at
          ? `${b.kelas} · ${hariWib(b.mulai_at)} ${jamWib(b.mulai_at)}`
          : (b.catatan ?? "—")}
      </span>
      <span
        className={`w-10 shrink-0 text-right text-app-body tabular-nums ${
          naik ? "text-ok-foreground" : "text-muted-foreground"
        }`}
      >
        {naik ? "+" : ""}
        {b.delta}
      </span>
    </li>
  );
}

export default async function A3({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ kabar?: string }>;
}) {
  const pengguna = await pastikanAdmin();
  const { id } = await params;
  const { kabar } = await searchParams;
  const sekarang = new Date();

  const member = await detailMember(pg, id);
  if (!member) notFound();

  const [dompet, riwayat] = await Promise.all([
    dompetMember(pg, id),
    // Buku besar LENGKAP — ini layar sengketa, bukan ringkasan.
    riwayatKredit(pg, id, 500),
  ]);

  const aktif = dompet.filter((p) => p.hangus_at > sekarang && p.sisa > 0);
  const sisa = aktif.reduce((t, p) => t + p.sisa, 0);

  return (
    <Kerangka
      nama={pengguna.nama}
      peran={pengguna.peran}
      aktif="/admin"
      kabar={kabar}
    >
      <Link
        href="/admin"
        className="inline-flex min-h-11 items-center text-app-body-sm text-muted-foreground hover:text-foreground"
      >
        ← Dashboard
      </Link>

      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-app-title">{member.nama}</h1>
          <p className="text-app-body-sm text-muted-foreground">
            {member.telepon} · {member.email ?? "tanpa email"} · member sejak{" "}
            {hariWib(member.created_at)}
          </p>
        </div>
        <a
          href={tautanWa(
            member.telepon,
            `Halo ${member.nama}, ini dari Studio Pilates Kenari.`,
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center rounded-sm bg-primary px-4 text-app-label font-medium uppercase text-primary-foreground transition hover:brightness-95"
        >
          Chat WA
        </a>
      </div>

      <div className="mt-sedang grid items-start gap-sedang lg:grid-cols-[3fr_2fr]">
        <div className="space-y-sedang">
          <Kartu judul="Dompet kredit" padat>
            <ul className="divide-y divide-border">
              {dompet.map((p) => (
                <Paket key={p.id} p={p} sekarang={sekarang} />
              ))}
              {dompet.length === 0 && (
                <li className="px-4 py-3 text-app-body-sm text-muted-foreground">
                  Belum pernah beli paket.
                </li>
              )}
            </ul>
          </Kartu>

          <Kartu
            judul={`Buku besar · ${riwayat.length} baris`}
            catatan="Sisa kredit = jumlah kolom kanan. Tidak ada angka saldo yang disimpan terpisah, jadi tidak ada yang bisa melenceng."
            padat
          >
            <ul className="divide-y divide-border">
              {riwayat.map((b) => (
                <Baris key={b.id} b={b} />
              ))}
            </ul>
          </Kartu>
        </div>

        <div className="space-y-sedang">
          <Kartu>
            <Angka nilai={sisa} label="Kredit aktif" catatan={`${dompet.length} paket tercatat`} />
          </Kartu>

          <Kartu
            judul="Koreksi manual"
            catatan="Alasan wajib — baris ini ikut tampil di layar member."
          >
            {dompet.length === 0 ? (
              <p className="text-app-body-sm text-muted-foreground">
                Belum ada paket untuk dikoreksi.
              </p>
            ) : (
              <form action={koreksiKreditManual} className="space-y-3">
                <input type="hidden" name="user_id" value={member.id} />
                <label className="block">
                  <span className="text-app-label uppercase text-muted-foreground">
                    Paket
                  </span>
                  <select
                    name="member_package_id"
                    className="mt-1 h-11 w-full rounded-sm border border-border bg-background px-3 text-app-body focus:border-foreground"
                  >
                    {dompet.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.paket} · sisa {p.sisa} · hangus {hariWib(p.hangus_at)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-app-label uppercase text-muted-foreground">
                    Jumlah (boleh minus)
                  </span>
                  <input
                    type="number"
                    name="delta"
                    defaultValue={1}
                    min={-BATAS_KOREKSI}
                    max={BATAS_KOREKSI}
                    className="mt-1 h-11 w-full rounded-sm border border-border px-3 text-app-body tabular-nums focus:border-foreground"
                  />
                </label>
                <label className="block">
                  <span className="text-app-label uppercase text-muted-foreground">
                    Alasan
                  </span>
                  <input
                    name="catatan"
                    required
                    minLength={3}
                    placeholder="mis. kompensasi kelas pindah jadwal"
                    className="mt-1 h-11 w-full rounded-sm border border-border px-3 text-app-body focus:border-foreground"
                  />
                </label>
                <Tombol gaya="garis" penuh anak="Simpan koreksi" />
              </form>
            )}
          </Kartu>
        </div>
      </div>
    </Kerangka>
  );
}
