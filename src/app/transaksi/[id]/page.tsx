// Detail satu transaksi — peristiwa UANG (rupiah, satu baris per pembayaran),
// bukan buku kredit (saldo bergerak, banyak baris; layarnya M3 dan A3).
// Keduanya bertemu di satu titik: transaksi MENERBITKAN sejumlah kredit, jadi
// halaman ini memuat ringkasan nasibnya — empat angka, bukan buku besar.
// Kepemilikan dijaga di dalam query: id orang lain menghasilkan 404.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { pg } from "@/db";
import { penggunaById } from "@/db/admin";
import { transaksiById } from "@/db/transaksi";
import { userSaatIni } from "@/lib/masuk";
import {
  hariWib,
  rupiah,
  selisihManusiawi,
  tanggalRingkasWib,
} from "@/lib/waktu";
import { tautanWa } from "@/lib/wa";
import { Angka, Chip, Kartu, Kerangka } from "@/components/kerangka";

export const dynamic = "force-dynamic";

function Fakta({
  label,
  nilai,
  catatan,
}: {
  label: string;
  nilai: React.ReactNode;
  catatan?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-3 last:border-0">
      <span className="shrink-0 text-app-body-sm text-muted-foreground">
        {label}
      </span>
      <span className="text-right text-app-body">
        {nilai}
        {catatan && (
          <span className="block text-app-body-sm text-muted-foreground">
            {catatan}
          </span>
        )}
      </span>
    </div>
  );
}

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

  const sekarang = new Date();
  const hidup = t.sisa > 0 && t.hangus_at > sekarang;
  const bukuKredit = staf ? `/admin/member/${t.member_id}` : "/akun";

  return (
    <Kerangka
      nama={saya.nama}
      peran={saya.peran}
      aktif="/transaksi"
      jejak={[{ label: `${t.paket} · ${tanggalRingkasWib(t.dibeli_at)}` }]}
    >
      <div className="flex flex-wrap items-start justify-between gap-dekat">
        <div>
          <p className="text-app-label uppercase text-muted-foreground">
            Pembelian paket
          </p>
          <h1 className="mt-1 text-app-title">{rupiah(t.harga_rupiah)}</h1>
          <p className="text-app-body-sm text-muted-foreground">
            {hariWib(t.dibeli_at)} ·{" "}
            {staf ? (
              <Link
                href={`/admin/member/${t.member_id}`}
                className="underline underline-offset-4"
              >
                {t.member}
              </Link>
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

      <div className="mt-dekat grid items-start gap-dekat lg:grid-cols-2">
        {/* Semuanya terkunci saat bayar — katalog boleh berubah tanpa mengubah
            baris ini. */}
        <Kartu judul="Yang dibeli" catatan="Syaratnya terkunci sejak dibayar.">
          <Fakta label="Paket" nilai={t.paket} />
          <Fakta
            label="Kredit diterbitkan"
            nilai={<span className="tabular-nums">{t.kredit_awal}</span>}
            catatan={`${rupiah(Math.round(t.harga_rupiah / (t.kredit_awal || 1)))} per kelas`}
          />
          <Fakta
            label="Masa berlaku"
            nilai={`${t.masa_berlaku_hari} hari`}
            catatan={`Sampai ${tanggalRingkasWib(t.hangus_at)}${
              t.diperpanjang_at
                ? ` · diperpanjang ${tanggalRingkasWib(t.diperpanjang_at)}`
                : ""
            }`}
          />
          {/* BR-1.4 — jenis kelas yang tercakup bagian dari barangnya. */}
          <Fakta
            label="Berlaku untuk"
            nilai={t.kelas.length ? t.kelas.join(" · ") : "—"}
            catatan={
              t.kelas.length ? "Kelas di luar daftar ini tidak bisa dipesan." : undefined
            }
          />
          {staf && <Fakta label="Nomor HP" nilai={t.telepon} />}
        </Kartu>

        <Kartu
          judul="Nasib kreditnya"
          catatan="Ringkasan. Baris per barisnya ada di buku kredit."
        >
          <div className="grid grid-cols-2 gap-4">
            <Angka
              nilai={t.dipakai}
              label="Jadi kelas"
              catatan="Kursi yang benar-benar dipesan."
            />
            <Angka
              nilai={t.kembali}
              label="Kembali"
              catatan="Batal tepat waktu (BR-3.1)."
            />
            <Angka
              nilai={t.hangus}
              label="Hangus"
              catatan="Lewat masa berlaku, batal telat, atau tidak datang."
              warnaCatatan={
                t.hangus ? "text-warn-foreground" : "text-muted-foreground"
              }
            />
            <Angka
              nilai={t.sisa}
              label="Sisa"
              catatan={
                hidup
                  ? `Bisa dipakai ${selisihManusiawi(t.hangus_at, sekarang)} lagi`
                  : t.sisa <= 0
                    ? "Habis terpakai."
                    : "Tidak bisa dipakai lagi — masa berlakunya lewat."
              }
              warnaCatatan={
                hidup ? "text-ok-foreground" : "text-muted-foreground"
              }
            />
          </div>

          <div className="mt-dekat flex flex-wrap items-center gap-3 border-t border-border pt-dekat">
            <Link
              href={bukuKredit}
              className="inline-flex min-h-11 items-center rounded-sm border border-foreground px-4 text-app-label font-medium uppercase"
            >
              Buku kredit
            </Link>
            <span className="text-app-body-sm text-muted-foreground">
              {t.kredit_awal} − {t.dipakai} + {t.kembali} − {t.hangus} ={" "}
              <span className="tabular-nums">{t.sisa}</span>
            </span>
          </div>
        </Kartu>
      </div>

      <div className="mt-dekat flex flex-wrap items-center gap-3">
        <Chip
          warna="bg-neutral-surface text-neutral-foreground"
          anak={`Transaksi ${t.id.slice(0, 8)}`}
        />
        <span className="text-app-body-sm text-muted-foreground">
          Demo belum punya pembayaran sungguhan — paket diberikan meja depan
          setelah bayar di tempat (UC-A13). Bukti bayar, refund, dan pembayaran
          gagal menyusul bersama tabel `payments` (BR-8.1–8.2).
        </span>
      </div>
    </Kerangka>
  );
}
