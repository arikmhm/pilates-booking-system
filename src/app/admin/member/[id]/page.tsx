// Layar A3 Detail member — 02-rules.md bagian 6.1. Layar sengketa kredit:
// urutannya ringkas ke rinci, buku besar lengkap paling bawah (BR-1.7).

import { notFound } from "next/navigation";
import Link from "next/link";
import { pg } from "@/db";
import { riwayatKredit, type BarisLedger } from "@/db/booking";
import { BATAS_KOREKSI, detailMember, dompetMember } from "@/db/admin";
import { pembelianMember } from "@/db/transaksi";
import { paketDijual } from "@/db/kelola";
import { pastikanAdmin } from "@/lib/masuk";
import {
  hariWib,
  jamWib,
  rupiah,
  selisihManusiawi,
  tanggalRingkasWib,
} from "@/lib/waktu";
import { tautanWa } from "@/lib/wa";
import { Chip, Kartu, Kerangka, Tombol } from "@/components/kerangka";
import { Kembali } from "@/components/kembali";
import { beriPaket, koreksiKreditManual } from "../../aksi";

export const dynamic = "force-dynamic";

const MEPET = 7 * 86_400_000;
const INPUT =
  "h-12 w-full rounded-sm border border-border bg-background px-3 text-app-body";
const LABEL = "text-app-label uppercase text-muted-foreground";

function Fakta({
  label,
  nilai,
  warna = "text-foreground",
}: {
  label: string;
  nilai: React.ReactNode;
  warna?: string;
}) {
  return (
    <div>
      <p className={LABEL}>{label}</p>
      <p className={`text-app-body ${warna}`}>{nilai}</p>
    </div>
  );
}

function Baris({ b }: { b: BarisLedger }) {
  const naik = b.delta > 0;
  return (
    <li className="flex items-baseline gap-4 px-4 py-3">
      <span className="w-40 shrink-0 text-app-body-sm text-muted-foreground">
        {hariWib(b.created_at)} {jamWib(b.created_at)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="text-app-body">{b.alasan}</span>
        {b.kelas && (
          <span className="text-app-body-sm text-muted-foreground">
            {" "}
            · {b.kelas} {b.mulai_at && hariWib(b.mulai_at)}
          </span>
        )}
        {b.catatan && (
          <span className="block text-app-body-sm text-muted-foreground">
            {b.catatan}
          </span>
        )}
      </span>
      <span
        className={`w-12 shrink-0 text-right text-app-body tabular-nums ${
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

  const [dompet, riwayat, katalog, transaksi] = await Promise.all([
    dompetMember(pg, id),
    // Buku besar LENGKAP — ini layar sengketa, bukan ringkasan.
    riwayatKredit(pg, id, 500),
    paketDijual(pg),
    pembelianMember(pg, id),
  ]);

  const hidup = dompet.filter((p) => p.hangus_at > sekarang && p.sisa > 0);
  const sisa = hidup.reduce((t, p) => t + p.sisa, 0);
  const terdekat = [...hidup].sort(
    (a, b) => a.hangus_at.getTime() - b.hangus_at.getTime(),
  )[0];
  const mepet =
    terdekat && terdekat.hangus_at.getTime() - sekarang.getTime() < MEPET;

  return (
    <Kerangka
      nama={pengguna.nama}
      peran={pengguna.peran}
      aktif="/admin/member"
      jejak={[{ label: member.nama }]}
      kabar={kabar}
    >
      <Kembali cadangan="/admin/member" />

      <div className="mt-2">
        <Kartu>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-app-title">{member.nama}</h1>
              <p className="text-app-body-sm text-muted-foreground">
                Member sejak {tanggalRingkasWib(member.created_at)}
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

          <div className="mt-dekat grid gap-4 border-t border-border pt-dekat sm:grid-cols-2 lg:grid-cols-4">
            <Fakta
              label="Nomor HP"
              nilai={<span className="tabular-nums">{member.telepon}</span>}
            />
            <Fakta
              label="Email"
              nilai={member.email ?? "—"}
              warna={member.email ? "text-foreground" : "text-muted-foreground"}
            />
            <Fakta
              label="Kredit aktif"
              nilai={<span className="text-app-number tabular-nums">{sisa}</span>}
            />
            <Fakta
              label="Hangus terdekat"
              nilai={
                terdekat
                  ? `${tanggalRingkasWib(terdekat.hangus_at)} · ${selisihManusiawi(terdekat.hangus_at, sekarang)}`
                  : "Tidak ada paket hidup"
              }
              warna={mepet ? "text-warn-foreground" : "text-muted-foreground"}
            />
          </div>

          {/* BR-1.1 — kredit tidak pernah pindah antar paket. */}
          <div className="mt-dekat border-t border-border pt-dekat">
            <p className={LABEL}>Paket aktif</p>
            {hidup.length === 0 ? (
              <p className="mt-1 text-app-body-sm text-muted-foreground">
                Tidak ada paket yang masih berlaku.
                {dompet.length > 0 &&
                  ` ${dompet.length} paket tercatat di buku besar.`}
              </p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-2">
                {hidup.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-2 rounded-sm border border-border px-3 py-1.5"
                  >
                    <span className="text-app-body-sm">{p.paket}</span>
                    <span className="text-app-body-sm tabular-nums text-muted-foreground">
                      {p.sisa}/{p.jumlah_kredit_awal}
                    </span>
                    <Chip
                      warna={
                        p.hangus_at.getTime() - sekarang.getTime() < MEPET
                          ? "bg-warn-surface text-warn-foreground"
                          : "bg-ok-surface text-ok-foreground"
                      }
                      anak={tanggalRingkasWib(p.hangus_at)}
                    />
                    {/* BR-5.2 — jejak perpanjangan. */}
                    {p.diperpanjang_at && (
                      <span className="text-app-label text-muted-foreground">
                        diperpanjang
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Kartu>
      </div>

      <div className="mt-dekat grid gap-dekat lg:grid-cols-2">
        {/* UC-A13 — masa berlaku = hari ini + masa_berlaku_hari (BR-1.2). */}
        <Kartu
          judul="Berikan paket"
          catatan="Dipakai saat member bayar di tempat. Tercatat sebagai pembelian di buku besar."
        >
          <form action={beriPaket} className="space-y-3">
            <input type="hidden" name="user_id" value={member.id} />
            <label className="sr-only" htmlFor="package_id">
              Paket
            </label>
            <select id="package_id" name="package_id" required className={INPUT}>
              <option value="">Pilih paket…</option>
              {katalog.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama} · {k.jumlah_kredit} kredit · {k.masa_berlaku_hari} hari
                </option>
              ))}
            </select>
            <Tombol penuh anak="Tambahkan paket" />
          </form>
        </Kartu>

        {/* BR-1.8 — alasan wajib. */}
        <Kartu
          judul="Koreksi manual"
          catatan="Alasan wajib — baris ini ikut tampil di layar member."
        >
          <form action={koreksiKreditManual} className="space-y-3">
            <input type="hidden" name="user_id" value={member.id} />

            <div>
              <label className={LABEL} htmlFor="member_package_id">
                Paket yang dikoreksi
              </label>
              <select
                id="member_package_id"
                name="member_package_id"
                required
                className={INPUT}
              >
                {dompet.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.paket} · sisa {p.sisa} · hangus{" "}
                    {tanggalRingkasWib(p.hangus_at)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={LABEL} htmlFor="delta">
                  Jumlah
                </label>
                <input
                  id="delta"
                  name="delta"
                  type="number"
                  required
                  min={-BATAS_KOREKSI}
                  max={BATAS_KOREKSI}
                  placeholder="+1"
                  className={INPUT}
                />
              </div>
              <div className="col-span-2">
                <label className={LABEL} htmlFor="catatan">
                  Alasan
                </label>
                <input
                  id="catatan"
                  name="catatan"
                  required
                  minLength={3}
                  placeholder="Kelas batal karena listrik padam"
                  className={INPUT}
                />
              </div>
            </div>

            <Tombol gaya="garis" penuh anak="Simpan koreksi" />
          </form>
        </Kartu>
      </div>

      <div className="mt-dekat">
        <Kartu
          judul={`Transaksi · ${transaksi.length} pembelian`}
          catatan="Uang yang masuk. Buku besar di bawah menjelaskan kreditnya."
          padat
        >
          {transaksi.length === 0 ? (
            <p className="p-4 text-app-body-sm text-muted-foreground">
              Belum pernah membeli paket.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {transaksi.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/transaksi/${t.id}`}
                      className="text-app-body underline underline-offset-4"
                    >
                      {t.paket}
                    </Link>
                    <p className="text-app-body-sm text-muted-foreground">
                      {tanggalRingkasWib(t.dibeli_at)} · {t.kredit_awal} kredit ·
                      berlaku sampai {tanggalRingkasWib(t.hangus_at)}
                    </p>
                  </div>
                  <span className="shrink-0 text-app-body tabular-nums">
                    {rupiah(t.harga_rupiah)}
                  </span>
                </li>
              ))}
            </ul>
          )}
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
            {riwayat.length === 0 && (
              <li className="px-4 py-3 text-app-body-sm text-muted-foreground">
                Belum ada riwayat kredit.
              </li>
            )}
          </ul>
        </Kartu>
      </div>
    </Kerangka>
  );
}
