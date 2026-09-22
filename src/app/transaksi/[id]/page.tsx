// Detail satu transaksi — isi sebuah pembelian paket, baris per baris.
//
// Yang dijawab layar ini: "kredit yang dibeli tanggal sekian itu jadi apa?"
// Jawabannya buku besar paket tersebut (BR-1.7) — bukan ringkasan, bukan
// saldo, melainkan tiap baris yang pernah menggerakkannya. Sengketa kredit
// diselesaikan di halaman ini.
//
// Kepemilikan dijaga di dalam query: member yang mengetik id paket orang lain
// mendapat 404, bukan halaman orang lain (`transaksiById` dengan `user_id`).

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { pg } from "@/db";
import { penggunaById } from "@/db/admin";
import { bukuPaket, transaksiById } from "@/db/transaksi";
import { userSaatIni } from "@/lib/masuk";
import {
  hariWib,
  jamWib,
  rupiah,
  selisihManusiawi,
  tanggalRingkasWib,
} from "@/lib/waktu";
import { tautanWa } from "@/lib/wa";
import { Angka, Chip, Kartu, Kerangka } from "@/components/kerangka";

export const dynamic = "force-dynamic";

export default async function DetailTransaksi({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user_id = await userSaatIni();
  if (!user_id) redirect("/masuk");
  const saya = await penggunaById(pg, user_id);
  if (!saya) redirect("/masuk");
  // Coach tidak punya urusan dengan pembelian siapa pun (BR-9.4).
  if (saya.peran === "coach") redirect("/transaksi");

  const { id } = await params;
  const staf = saya.peran === "admin" || saya.peran === "owner";
  const t = await transaksiById(pg, id, staf ? undefined : user_id);
  if (!t) notFound();

  const buku = await bukuPaket(pg, id);
  const sekarang = new Date();
  const hidup = t.sisa > 0 && t.hangus_at > sekarang;

  return (
    <Kerangka
      nama={saya.nama}
      peran={saya.peran}
      aktif="/transaksi"
      jejak={[{ label: `${t.paket} · ${tanggalRingkasWib(t.dibeli_at)}` }]}
    >
      <div className="flex flex-wrap items-start justify-between gap-dekat">
        <div>
          <h1 className="text-app-title">{t.paket}</h1>
          <p className="text-app-body-sm text-muted-foreground">
            Dibeli {hariWib(t.dibeli_at)} ·{" "}
            {staf ? (
              <>
                {/* Dari transaksi ke orangnya — arah yang benar. Sebelumnya
                    baris transaksi langsung melompat ke profil member dan
                    transaksinya sendiri tidak punya halaman. */}
                <Link
                  href={`/admin/member/${t.member_id}`}
                  className="underline underline-offset-4"
                >
                  {t.member}
                </Link>{" "}
                · {t.telepon}
              </>
            ) : (
              t.member
            )}
          </p>
        </div>

        {staf && (
          <a
            href={tautanWa(
              t.telepon,
              `Halo ${t.member}, soal paket ${t.paket} yang dibeli ${tanggalRingkasWib(t.dibeli_at)} —`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center rounded-sm border border-foreground px-4 text-app-label font-medium uppercase"
          >
            Chat WhatsApp
          </a>
        )}
      </div>

      <div className="mt-dekat grid gap-dekat sm:grid-cols-2 xl:grid-cols-4">
        <Kartu>
          <Angka
            nilai={rupiah(t.harga_rupiah)}
            label="Harga dibayar"
            catatan={`${rupiah(Math.round(t.harga_rupiah / (t.kredit_awal || 1)))} per kelas`}
          />
        </Kartu>
        <Kartu>
          <Angka
            nilai={t.kredit_awal}
            label="Kredit dibeli"
            catatan={
              t.kredit_awal === t.jumlah_kredit_paket
                ? `Isi baku paket ini: ${t.jumlah_kredit_paket}`
                : `Katalog sekarang ${t.jumlah_kredit_paket} — isi paket boleh berubah tanpa mengubah riwayat`
            }
          />
        </Kartu>
        <Kartu warna={hidup ? "bg-ok-surface border-border" : undefined}>
          <Angka
            nilai={t.sisa}
            label="Sisa kredit"
            catatan={
              hidup
                ? `Hangus ${hariWib(t.hangus_at)} · ${selisihManusiawi(t.hangus_at, sekarang)}`
                : t.sisa <= 0
                  ? "Habis terpakai."
                  : `Hangus ${hariWib(t.hangus_at)} — tidak bisa dipakai lagi.`
            }
            warnaCatatan={hidup ? "text-ok-foreground" : "text-muted-foreground"}
          />
        </Kartu>
        <Kartu>
          <Angka
            nilai={`${t.dipakai} / ${t.kembali} / ${t.hangus}`}
            label="Kelas / kembali / hangus"
            catatan={`Masa berlaku ${t.masa_berlaku_hari} hari sejak dibeli${
              t.diperpanjang_at
                ? ` · diperpanjang ${tanggalRingkasWib(t.diperpanjang_at)}`
                : ""
            }`}
          />
        </Kartu>
      </div>

      <div className="mt-dekat">
        <Kartu
          judul="Buku besar paket ini"
          catatan="Urut dari yang paling awal. Sisa kredit = jumlah kolom kanan (BR-1.7)."
          padat
        >
          <ul className="divide-y divide-border">
            {buku.map((b) => {
              const naik = b.delta > 0;
              return (
                <li
                  key={b.id}
                  className="flex items-baseline justify-between gap-4 px-4 py-3"
                >
                  <div className="min-w-0">
                    {/* AGENTS.md — nilai `alasan` tampil apa adanya dalam
                        Bahasa Indonesia. Hanya garis bawahnya diganti spasi. */}
                    <p className="text-app-body first-letter:uppercase">
                      {b.alasan.replace(/_/g, " ")}
                    </p>
                    <p className="truncate text-app-body-sm text-muted-foreground">
                      {b.kelas && b.mulai_at
                        ? `${b.kelas} · ${hariWib(b.mulai_at)} ${jamWib(b.mulai_at)}`
                        : hariWib(b.created_at)}
                      {b.pelaku && ` · oleh ${b.pelaku}`}
                      {b.catatan && ` · ${b.catatan}`}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-app-section tabular-nums ${
                      naik ? "text-ok-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {naik ? "+" : ""}
                    {b.delta}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="flex items-baseline justify-between gap-4 border-t border-border px-4 py-3">
            <span className="text-app-body">Sisa</span>
            <span className="text-app-section tabular-nums">{t.sisa}</span>
          </div>
        </Kartu>
      </div>

      <div className="mt-dekat">
        <Chip
          warna="bg-neutral-surface text-neutral-foreground"
          anak={`Transaksi ${t.id.slice(0, 8)}`}
        />
      </div>
    </Kerangka>
  );
}
