// Layar A8 Pesan terkirim — UC-A03, UC-S06.
//
// Tabel `notifications` ditulis dari empat tempat sejak awal — booking,
// pembatalan, promosi antrean, penutupan antrean — dan sampai layar ini
// dibuat tidak pernah dibaca sekali pun. Semua notifikasi demo menumpuk tak
// terlihat, termasuk yang paling penting: "kamu dapat kursi".
//
// Di demo kanalnya `layar`, jadi halaman inilah tempat pesan benar-benar
// sampai ke manusia. Di versi nyata ia jadi jejak audit di samping email.

import Link from "next/link";
import { pg } from "@/db";
import { pesanTerkirim, type Pesan } from "@/db/kelola";
import { pastikanAdmin } from "@/lib/masuk";
import { hariPendekWib, jamWib, selisihManusiawi } from "@/lib/waktu";
import { tautanWa } from "@/lib/wa";
import { Angka, Chip, Kartu, Kerangka } from "@/components/kerangka";

export const dynamic = "force-dynamic";

/**
 * BR-4.3 dan BR-5.3 — dua template ini mendesak: kursi terbuang kalau tidak
 * terbaca dalam hitungan jam. Keduanya dapat tombol kirim-WA; sisanya tidak,
 * supaya tombol yang penting tidak tenggelam di antara yang rutin.
 */
const MENDESAK = new Set(["waitlist_naik", "kelas_batal"]);

const TEMPLATE: Record<string, [string, string]> = {
  booking_ok: ["bg-ok-surface text-ok-foreground", "Booking terkonfirmasi"],
  waitlist_naik: ["bg-primary text-primary-foreground", "Naik dari daftar tunggu"],
  kelas_batal: ["bg-danger-surface text-danger-foreground", "Kelas dibatalkan"],
  kredit_mau_hangus: ["bg-warn-surface text-warn-foreground", "Kredit segera hangus"],
  waitlist_tutup: [
    "bg-neutral-surface text-neutral-foreground",
    "Daftar tunggu ditutup",
  ],
};

function Baris({ p, sekarang }: { p: Pesan; sekarang: Date }) {
  const [warna, label] = TEMPLATE[p.template] ?? [
    "bg-neutral-surface text-neutral-foreground",
    p.template,
  ];

  return (
    <li className="flex flex-wrap items-start gap-4 px-4 py-3">
      {/* DS-28 — waktu jadi jangkar kiri, lebar tetap. */}
      <div className="w-20 shrink-0">
        <p className="text-app-body tabular-nums">{jamWib(p.created_at)}</p>
        <p className="text-app-label uppercase text-muted-foreground">
          {hariPendekWib(p.created_at)}
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-app-body">{p.nama}</span>
          {/* DS-14 — jenis pesan berteks, bukan hanya berwarna. */}
          <Chip warna={warna} anak={label} />
          {p.mulai_at && (
            <span className="text-app-body-sm text-muted-foreground">
              kelas {hariPendekWib(p.mulai_at)} {jamWib(p.mulai_at)} ·{" "}
              {selisihManusiawi(p.mulai_at, sekarang)}
            </span>
          )}
        </div>
        <p className="mt-1 text-app-body-sm text-muted-foreground">{p.isi}</p>
      </div>

      {MENDESAK.has(p.template) && (
        <a
          href={tautanWa(p.telepon, p.isi)}
          className="inline-flex min-h-11 shrink-0 items-center rounded-sm bg-primary px-4 text-app-label font-medium uppercase text-primary-foreground transition hover:brightness-95"
        >
          Chat WA
        </a>
      )}
    </li>
  );
}

export default async function A8({
  searchParams,
}: {
  searchParams: Promise<{ kabar?: string }>;
}) {
  const pengguna = await pastikanAdmin();
  const { kabar } = await searchParams;
  const sekarang = new Date();

  const pesan = await pesanTerkirim(pg);

  const mendesak = pesan.filter((p) => MENDESAK.has(p.template));
  const sejamTerakhir = pesan.filter(
    (p) => sekarang.getTime() - p.created_at.getTime() < 3_600_000,
  );

  return (
    <Kerangka
      nama={pengguna.nama}
      peran={pengguna.peran}
      aktif="/admin/pesan"
      kabar={kabar}
    >
      <div>
        <h1 className="text-app-title">Pesan terkirim</h1>
        <p className="text-app-body-sm text-muted-foreground">
          Semua yang sistem kirim ke member, terbaru di atas.
        </p>
      </div>

      <div className="mt-dekat grid gap-dekat sm:grid-cols-3">
        <Kartu>
          <Angka nilai={pesan.length} label="Pesan terakhir" />
        </Kartu>
        <Kartu>
          <Angka
            nilai={sejamTerakhir.length}
            label="Sejam terakhir"
            catatan="Yang baru saja dipicu aksi di layar."
          />
        </Kartu>
        <Kartu warna="bg-ok-surface border-border">
          <Angka
            nilai={mendesak.length}
            label="Mendesak"
            catatan="Naik antrean & kelas batal — ada tombol WA-nya."
            warnaCatatan="text-ok-foreground"
          />
        </Kartu>
      </div>

      <div className="mt-dekat">
        <Kartu padat>
          {pesan.length === 0 ? (
            <p className="p-4 text-app-body text-muted-foreground">
              Belum ada pesan. Coba booking satu kelas dari{" "}
              <Link href="/jadwal" className="underline underline-offset-4">
                layar jadwal
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {pesan.map((p) => (
                <Baris key={p.id} p={p} sekarang={sekarang} />
              ))}
            </ul>
          )}
        </Kartu>
      </div>
    </Kerangka>
  );
}
