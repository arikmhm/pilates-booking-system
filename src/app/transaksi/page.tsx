// Layar Transaksi — satu rute, empat peran (UC-M14, UC-A17, UC-O09, UC-C03).
//
// Demo belum punya tabel `payments` (BR-8.1–8.2 bertanda R), jadi "transaksi"
// di sini berarti dua hal yang memang tercatat: pembelian paket dan tiap gerak
// kredit di buku besar. Querynya di `src/db/transaksi.ts`.
//
// Yang membedakan keempat tampilan bukan hiasannya, tapi pertanyaannya:
//
// | Peran  | Pertanyaan yang dijawab                                  |
// |--------|----------------------------------------------------------|
// | Member | "Uang saya jadi apa?" — tiap paket, tiap kreditnya        |
// | Coach  | "Kelas saya memakan berapa kredit?" — tanpa rupiah        |
// | Admin  | "Kapan Bu Sari beli, dan siapa mengoreksi kreditnya?"     |
// | Owner  | semua milik admin, **+ angka uangnya** (BR-9.3)          |
//
// BR-9.3 dijaga di sini dengan cara yang paling sulit dilanggar: `ringkasUang()`
// hanya dipanggil di dalam cabang pemilik. Kolom rupiah per baris tetap terlihat
// admin — meja depan harus bisa menjawab "paketnya berapa" — yang dikunci adalah
// penjumlahannya: omzet, rata-rata, dan nilai kredit yang hangus.

import Link from "next/link";
import { redirect } from "next/navigation";
import { pg } from "@/db";
import { penggunaById } from "@/db/admin";
import {
  bukuTransaksi,
  kelasTerpakaiCoach,
  koreksiTerakhir,
  pembelianMember,
  ringkasUang,
  type Pembelian,
} from "@/db/transaksi";
import { userSaatIni } from "@/lib/masuk";
import {
  hariPendekWib,
  jamWib,
  rupiah,
  selisihManusiawi,
  tanggalRingkasWib,
} from "@/lib/waktu";
import { Angka, Chip, Halaman, Kartu, Kerangka } from "@/components/kerangka";

export const dynamic = "force-dynamic";

const TH =
  "px-3 py-2 text-left text-app-label uppercase tracking-[0.08em] text-muted-foreground font-medium";
const TD = "px-3 py-2 align-middle";

/** Buku transaksi dipotong per halaman di database, bukan di memori. */
const PER_HALAMAN = 25;

/** Pilihan periode. 30 hari jadi baku: sebulan penuh, tapi masih satu layar. */
const PERIODE: [number, string][] = [
  [7, "7 hari"],
  [30, "30 hari"],
  [90, "90 hari"],
];

function Periode({ hari, dasar }: { hari: number; dasar: string }) {
  return (
    <div className="flex items-center gap-1 rounded-sm border border-border p-1">
      {PERIODE.map(([n, label]) => (
        <Link
          key={n}
          href={n === 30 ? dasar : `${dasar}?hari=${n}`}
          aria-current={n === hari ? "true" : undefined}
          className={`inline-flex min-h-11 shrink-0 items-center rounded-sm px-3 text-app-label uppercase transition-colors ${
            n === hari
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}

/**
 * Nasib sebuah paket — satu chip, tiga kemungkinan. Urutannya penting:
 * paket yang kreditnya habis sebelum tanggalnya lewat bukan "kedaluwarsa",
 * dan member yang bertanya ingin tahu yang mana dari keduanya.
 */
function status(p: Pembelian, sekarang: Date): [string, string] {
  if (p.sisa > 0 && p.hangus_at > sekarang)
    return ["bg-ok-surface text-ok-foreground", `${p.sisa} kredit tersisa`];
  if (p.sisa <= 0) return ["bg-muted text-muted-foreground", "Kredit habis"];
  return [
    "bg-neutral-surface text-neutral-foreground",
    `${p.sisa} kredit hangus`,
  ];
}

/** Rincian nasib kredit — dipakai baris tabel member dan staf. */
function Rincian({ p }: { p: Pembelian }) {
  const bagian: [number, string][] = [
    [p.dipakai, "jadi kelas"],
    [p.kembali, "kembali"],
    [p.hangus, "hangus"],
  ];
  const isi = bagian.filter(([n]) => n > 0);
  return (
    <span className="text-app-body-sm text-muted-foreground">
      {isi.length === 0
        ? "Belum terpakai"
        : isi.map(([n, l]) => `${n} ${l}`).join(" · ")}
    </span>
  );
}

export default async function Transaksi({
  searchParams,
}: {
  searchParams: Promise<{ hari?: string; hal?: string }>;
}) {
  const user_id = await userSaatIni();
  if (!user_id) redirect("/masuk");
  const saya = await penggunaById(pg, user_id);
  if (!saya) redirect("/masuk");

  const { hari: hariParam, hal } = await searchParams;
  const hari = PERIODE.some(([n]) => String(n) === hariParam)
    ? Number(hariParam)
    : 30;
  const sekarang = new Date();
  const sejak = new Date(sekarang.getTime() - hari * 86_400_000);

  /* ── Member — UC-M14 ──────────────────────────────────────────────────── */
  if (saya.peran === "member") {
    const beli = await pembelianMember(pg, user_id);
    const belanja = beli.reduce((t, p) => t + p.harga_rupiah, 0);
    const dipakai = beli.reduce((t, p) => t + p.dipakai, 0);
    const hangus = beli.reduce((t, p) => t + p.hangus, 0);

    return (
      <Kerangka nama={saya.nama} peran={saya.peran} aktif="/transaksi">
        <div>
          <h1 className="text-app-title">Transaksi saya</h1>
          <p className="text-app-body-sm text-muted-foreground">
            Tiap paket yang pernah dibeli, dan ke mana kreditnya pergi.
          </p>
        </div>

        <div className="mt-dekat grid gap-dekat sm:grid-cols-3">
          <Kartu>
            <Angka
              nilai={rupiah(belanja)}
              label="Total belanja"
              catatan={`${beli.length} paket`}
            />
          </Kartu>
          <Kartu>
            <Angka nilai={dipakai} label="Kredit jadi kelas" />
          </Kartu>
          <Kartu warna={hangus ? "bg-warn-surface border-border" : undefined}>
            <Angka
              nilai={hangus}
              label="Kredit hangus"
              catatan={
                hangus
                  ? "Masa berlaku lewat, batal telat, atau tidak datang."
                  : "Belum ada yang terbuang."
              }
              warnaCatatan={
                hangus ? "text-warn-foreground" : "text-muted-foreground"
              }
            />
          </Kartu>
        </div>

        <div className="mt-dekat">
          <Kartu padat>
            {beli.length === 0 ? (
              <p className="p-4 text-app-body text-muted-foreground">
                Belum ada pembelian. Paket ditambahkan meja depan setelah
                pembayaran — di versi nyata pembeliannya mandiri (UC-M11).
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-app-body-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className={`${TH} w-32`}>Dibeli</th>
                      <th className={TH}>Paket</th>
                      <th className={`${TH} w-28 text-right`}>Harga</th>
                      <th className={`${TH} w-20 text-right`}>Kredit</th>
                      <th className={TH}>Rincian</th>
                      <th className={`${TH} w-40`}>Berlaku sampai</th>
                      <th className={`${TH} w-40`}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {beli.map((p) => {
                      const [warna, label] = status(p, sekarang);
                      return (
                        <tr
                          key={p.id}
                          className="border-b border-border last:border-0"
                        >
                          <td className={`${TD} tabular-nums`}>
                            <Link
                              href={`/transaksi/${p.id}`}
                              className="underline underline-offset-4"
                            >
                              {tanggalRingkasWib(p.dibeli_at)}
                            </Link>
                          </td>
                          <td className={`${TD} text-app-body`}>{p.paket}</td>
                          <td className={`${TD} text-right tabular-nums`}>
                            {rupiah(p.harga_rupiah)}
                          </td>
                          <td className={`${TD} text-right tabular-nums`}>
                            {p.kredit_awal}
                          </td>
                          <td className={TD}>
                            <Rincian p={p} />
                          </td>
                          <td className={`${TD} tabular-nums`}>
                            {tanggalRingkasWib(p.hangus_at)}
                            {p.diperpanjang_at && (
                              <span className="block text-app-label uppercase text-ok-foreground">
                                diperpanjang
                              </span>
                            )}
                          </td>
                          <td className={TD}>
                            <Chip warna={warna} anak={label} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Kartu>
        </div>

        <p className="mt-dekat text-app-body-sm text-muted-foreground">
          Gerak kredit baris per baris ada di{" "}
          <Link href="/akun" className="underline underline-offset-4">
            Akun Saya
          </Link>
          .
        </p>
      </Kerangka>
    );
  }

  /* ── Coach — UC-C03 ───────────────────────────────────────────────────── */
  if (saya.peran === "coach") {
    const kelas = await kelasTerpakaiCoach(pg, {
      coach_id: user_id,
      sejak,
      sampai: sekarang,
    });
    const kursi = kelas.reduce((t, k) => t + k.kursi, 0);
    const kredit = kelas.reduce((t, k) => t + k.kredit, 0);
    const kapasitas = kelas.reduce((t, k) => t + k.kapasitas, 0);

    return (
      <Kerangka nama={saya.nama} peran={saya.peran} aktif="/transaksi">
        <div className="flex flex-wrap items-center justify-between gap-dekat">
          <div>
            <h1 className="text-app-title">Kredit dari kelas saya</h1>
            <p className="text-app-body-sm text-muted-foreground">
              Berapa kredit member yang terpakai di kelas yang kamu ajar.
            </p>
          </div>
          <Periode hari={hari} dasar="/transaksi" />
        </div>

        <div className="mt-dekat grid gap-dekat sm:grid-cols-3">
          <Kartu>
            <Angka
              nilai={kelas.length}
              label="Kelas diajar"
              catatan={`${hari} hari terakhir`}
            />
          </Kartu>
          <Kartu>
            <Angka
              nilai={kursi}
              label="Kursi terisi"
              catatan={
                kapasitas
                  ? `${Math.round((kursi / kapasitas) * 100)}% dari ${kapasitas} kursi`
                  : "Belum ada kelas."
              }
            />
          </Kartu>
          <Kartu>
            <Angka
              nilai={kredit}
              label="Kredit terpakai"
              catatan="Satu kursi terisi = satu kredit member."
            />
          </Kartu>
        </div>

        <div className="mt-dekat">
          <Kartu padat>
            {kelas.length === 0 ? (
              <p className="p-4 text-app-body text-muted-foreground">
                Belum ada kelas di rentang ini.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-app-body-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className={`${TH} w-40`}>Tanggal</th>
                      <th className={`${TH} w-20`}>Jam</th>
                      <th className={TH}>Kelas</th>
                      <th className={`${TH} w-28 text-right`}>Kursi</th>
                      <th className={`${TH} w-28 text-right`}>Kredit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kelas.map((k) => (
                      <tr
                        key={k.id}
                        className="border-b border-border last:border-0"
                      >
                        <td className={`${TD} tabular-nums`}>
                          {hariPendekWib(k.mulai_at)}
                        </td>
                        <td className={`${TD} tabular-nums`}>
                          {jamWib(k.mulai_at)}
                        </td>
                        <td className={`${TD} text-app-body`}>{k.kelas}</td>
                        <td className={`${TD} text-right tabular-nums`}>
                          {k.kursi}/{k.kapasitas}
                        </td>
                        <td className={`${TD} text-right tabular-nums`}>
                          {k.kredit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Kartu>
        </div>
      </Kerangka>
    );
  }

  /* ── Admin & owner — UC-A17, UC-O09 ───────────────────────────────────── */
  const owner = saya.peran === "owner";
  const halaman = Math.max(1, Math.trunc(Number(hal)) || 1);
  const lewati = (halaman - 1) * PER_HALAMAN;

  const [{ baris, total }, koreksi, uang] = await Promise.all([
    bukuTransaksi(pg, { sejak, per: PER_HALAMAN, lewati }),
    koreksiTerakhir(pg),
    // BR-9.3 — penjumlahan uang tidak pernah diminta kalau yang membuka admin.
    owner ? ringkasUang(pg, { sejak }) : null,
  ]);

  // Dua angka ini milik halaman yang sedang dibuka, bukan seluruh periode —
  // dan labelnya menyebutkannya, supaya tidak terbaca sebagai total studio.
  const kreditTerjual = baris.reduce((t, b) => t + b.kredit_awal, 0);
  const aktif = baris.filter((b) => b.sisa > 0 && b.hangus_at > sekarang).length;

  const tautanHal = (n: number) =>
    `/transaksi?${new URLSearchParams({
      ...(hari === 30 ? {} : { hari: String(hari) }),
      ...(n === 1 ? {} : { hal: String(n) }),
    })}`.replace(/\?$/, "");

  return (
    <Kerangka nama={saya.nama} peran={saya.peran} aktif="/transaksi">
      <div className="flex flex-wrap items-center justify-between gap-dekat">
        <div>
          <h1 className="text-app-title">Buku transaksi</h1>
          <p className="text-app-body-sm text-muted-foreground">
            Tiap paket yang berpindah ke member, terbaru di atas.
          </p>
        </div>
        <Periode hari={hari} dasar="/transaksi" />
      </div>

      {uang && (
        <div className="mt-dekat grid gap-dekat sm:grid-cols-3">
          <Kartu>
            <Angka
              nilai={rupiah(uang.omzet)}
              label="Omzet"
              catatan={`${uang.jumlah} transaksi · ${hari} hari terakhir`}
            />
          </Kartu>
          <Kartu>
            <Angka nilai={rupiah(uang.rata)} label="Rata-rata per transaksi" />
          </Kartu>
          <Kartu warna="bg-warn-surface border-border">
            <Angka
              nilai={rupiah(uang.hangus_rupiah)}
              label="Nilai kredit hangus"
              catatan={`${uang.hangus_kredit} kredit — uang masuk yang tidak jadi kelas.`}
              warnaCatatan="text-warn-foreground"
            />
          </Kartu>
        </div>
      )}

      <div className="mt-dekat grid gap-dekat sm:grid-cols-3">
        <Kartu>
          <Angka
            nilai={total}
            label="Transaksi"
            catatan={`${hari} hari terakhir`}
          />
        </Kartu>
        <Kartu>
          <Angka
            nilai={kreditTerjual}
            label="Kredit terjual"
            catatan="Di halaman ini."
          />
        </Kartu>
        <Kartu>
          <Angka
            nilai={aktif}
            label="Paket masih hidup"
            catatan="Di halaman ini — masih bersisa dan belum lewat tanggalnya."
          />
        </Kartu>
      </div>

      <div className="mt-dekat">
        <Kartu padat>
          {baris.length === 0 ? (
            <p className="p-4 text-app-body text-muted-foreground">
              Belum ada pembelian di rentang ini. Paket diberikan lewat layar
              detail member (UC-A13).
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-app-body-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className={`${TH} w-32`}>Dibeli</th>
                    <th className={TH}>Member</th>
                    <th className={TH}>Paket</th>
                    <th className={`${TH} w-28 text-right`}>Harga</th>
                    <th className={`${TH} w-20 text-right`}>Kredit</th>
                    <th className={TH}>Rincian</th>
                    <th className={`${TH} w-40`}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {baris.map((b) => {
                    const [warna, label] = status(b, sekarang);
                    return (
                      <tr
                        key={b.id}
                        className="border-b border-border last:border-0 transition-colors hover:bg-muted"
                      >
                        <td className={`${TD} tabular-nums`}>
                          {/* Satu baris = satu transaksi, jadi tautannya ke
                              transaksi itu. Profil membernya satu klik lagi
                              dari sana — bukan sebaliknya. */}
                          <Link
                            href={`/transaksi/${b.id}`}
                            className="underline underline-offset-4"
                          >
                            {tanggalRingkasWib(b.dibeli_at)}
                          </Link>
                        </td>
                        <td className={`${TD} text-app-body`}>{b.member}</td>
                        <td className={`${TD} text-app-body`}>{b.paket}</td>
                        <td className={`${TD} text-right tabular-nums`}>
                          {rupiah(b.harga_rupiah)}
                        </td>
                        <td className={`${TD} text-right tabular-nums`}>
                          {b.kredit_awal}
                        </td>
                        <td className={TD}>
                          <Rincian p={b} />
                        </td>
                        <td className={TD}>
                          <Chip warna={warna} anak={label} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="flex justify-end border-t border-border px-4 py-3">
                <Halaman
                  mulai={lewati}
                  tampil={baris.length}
                  total={total}
                  sebelum={halaman > 1 ? tautanHal(halaman - 1) : null}
                  sesudah={
                    lewati + baris.length < total ? tautanHal(halaman + 1) : null
                  }
                />
              </div>
            </div>
          )}
        </Kartu>
      </div>

      {/* BR-1.8 — kredit yang berpindah tanpa kelas. Baris beginilah yang
          ditanyakan saat angka seorang member terasa aneh. */}
      <div className="mt-dekat">
        <Kartu
          judul="Kredit yang dipindah tangan"
          catatan="Koreksi manual staf dan perpanjangan karena kelas dibatalkan studio."
          padat
        >
          {koreksi.length === 0 ? (
            <p className="p-4 text-app-body text-muted-foreground">
              Belum ada koreksi.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {koreksi.map((k) => (
                <li key={k.id} className="flex items-start gap-4 px-4 py-3">
                  <span
                    className={`w-12 shrink-0 text-app-section tabular-nums ${
                      k.delta > 0 ? "text-ok-foreground" : "text-danger-foreground"
                    }`}
                  >
                    {k.delta > 0 ? `+${k.delta}` : k.delta}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-app-body">
                      <Link
                        href={`/admin/member/${k.member_id}`}
                        className="underline underline-offset-4"
                      >
                        {k.member}
                      </Link>
                      {k.pelaku && (
                        <span className="text-muted-foreground"> · oleh {k.pelaku}</span>
                      )}
                    </p>
                    {k.catatan && (
                      <p className="text-app-body-sm text-muted-foreground">
                        {k.catatan}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 text-app-body-sm text-muted-foreground">
                    {selisihManusiawi(k.created_at, sekarang)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Kartu>
      </div>

      {!owner && (
        <p className="mt-dekat text-app-body-sm text-muted-foreground">
          Omzet, rata-rata transaksi, dan nilai kredit yang hangus hanya terlihat
          pemilik (BR-9.3).
        </p>
      )}
    </Kerangka>
  );
}
