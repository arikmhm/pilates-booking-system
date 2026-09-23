// Layar A6 Kelas & paket — UC-O02, UC-O03.
//
// Dua tabel yang menentukan apa yang dijual studio ini: kelas (`class_types`)
// dan paket kredit (`packages`), di atasnya tiga angka ringkas, dan satu
// peringatan yang cuma muncul saat kursi terjadwal kurang dari kredit yang
// sudah terjual (DS-55).
//
// DS-56 — barisnya tabel dengan cari + halaman seperti direktori member (A4),
// aksinya di menu "⋯", formulirnya dialog dari URL. Paket dapat 8 kolom dan
// kelas 4: paket punya enam kolom angka, kelas cuma dua.
//
// Apa yang boleh diubah, dan kenapa, dijaga lapisan db — bukan di sini:
//   kelas   selalu boleh (BR-7.3 melindungi sesi yang sudah terbit)
//   paket   hanya selama belum dibeli siapa pun (harga dan nama dibaca
//           hidup-hidup oleh buku transaksi; cakupan menentukan BR-1.4)

import Link from "next/link";
import { Plus } from "lucide-react";
import { pg } from "@/db";
import {
  daftarJenisKelas,
  daftarPaket,
  kursiVsKredit,
  type BarisPaket,
  type JenisKelas,
} from "@/db/kelola";
import { pastikanAdmin } from "@/lib/masuk";
import { rupiah, tanggalRingkasWib } from "@/lib/waktu";
import {
  Angka,
  Chip,
  Halaman,
  Kartu,
  Kerangka,
  Tombol,
} from "@/components/kerangka";
import { MenuAksi, type Aksi } from "@/components/menu-aksi";
import { buangJenisKelas, setAktifPaket } from "../kelola-aksi";
import { DialogJenis, DialogPaket, DialogTanya } from "./dialog";

export const dynamic = "force-dynamic";

const PER_HALAMAN = 8;

const TH =
  "px-3 py-2 text-left text-app-label uppercase tracking-[0.08em] text-muted-foreground font-medium";
const TD = "px-3 py-2 align-middle";

/** Potong satu halaman, dengan nomor halaman yang selalu di dalam rentang. */
function sepotong<T>(semua: T[], hal: string | undefined) {
  const total = Math.ceil(semua.length / PER_HALAMAN) || 1;
  const halaman = Math.max(1, Math.min(total, Math.trunc(Number(hal)) || 1));
  const mulai = (halaman - 1) * PER_HALAMAN;
  return { baris: semua.slice(mulai, mulai + PER_HALAMAN), mulai, halaman, total };
}

function Tambah({ href, anak }: { href: string; anak: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-sm bg-primary px-4 text-app-label font-medium uppercase text-primary-foreground transition hover:brightness-95"
    >
      <Plus className="size-4" />
      {anak}
    </Link>
  );
}

/**
 * Kepala tabel: namanya, tombol tambah, lalu baris cari — semuanya di dalam
 * kartu yang sama, tanpa kalimat penjelasan. Nama layarnya sudah disebut remah
 * roti, dan peran tiap tabel terbaca dari isinya (DS-54).
 */
function KepalaTabel({
  nama,
  jumlah,
  kunci,
  nilai,
  bawa,
  hapus,
  tambah,
}: {
  nama: string;
  jumlah: number;
  /** Nama parameter pencarian di URL — tiap tabel punya sendiri. */
  kunci: string;
  nilai: string;
  /**
   * Parameter tabel SEBELAH yang harus ikut terkirim. Formulir GET cuma
   * mengirim kolomnya sendiri, jadi tanpa ini mencari paket akan menghapus
   * pencarian kelas yang sedang berjalan di kartu di sebelahnya.
   */
  bawa: Record<string, string>;
  /** URL tanpa filternya; null saat memang tidak sedang memfilter. */
  hapus: string | null;
  tambah?: React.ReactNode;
}) {
  return (
    <div className="space-y-3 border-b border-border px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-app-section">
          {nama}{" "}
          <span className="text-app-body-sm tabular-nums text-muted-foreground">
            {jumlah}
          </span>
        </h2>
        {tambah}
      </div>

      {/* GET biasa: hasilnya bisa ditautkan dan di-refresh tanpa mengirim
          ulang apa pun, sama seperti A4. */}
      <div className="flex flex-wrap items-center gap-2">
        <form className="flex min-w-0 flex-1 items-center gap-2">
          {Object.entries(bawa).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          <input
            type="search"
            name={kunci}
            defaultValue={nilai}
            placeholder={`Cari ${nama.toLowerCase()}`}
            aria-label={`Cari ${nama.toLowerCase()}`}
            className="h-11 min-w-0 flex-1 rounded-sm border border-border bg-background px-3 text-app-body-sm"
          />
          <Tombol gaya="halus" kecil anak="Cari" />
        </form>
        {hapus && (
          <Link
            href={hapus}
            className="inline-flex min-h-11 items-center text-app-body-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Hapus filter
          </Link>
        )}
      </div>
    </div>
  );
}

export default async function A6({
  searchParams,
}: {
  searchParams: Promise<{
    kabar?: string;
    panel?: string;
    id?: string;
    qk?: string;
    halk?: string;
    qp?: string;
    halp?: string;
  }>;
}) {
  const pengguna = await pastikanAdmin();
  // Harga = keputusan bisnis. Admin melihat katalog, owner yang mengubahnya.
  const owner = pengguna.peran === "owner";
  const { kabar, panel: panelDiminta, id, qk, halk, qp, halp } = await searchParams;

  const sekarang = new Date();
  const [jenis, paket, muat] = await Promise.all([
    daftarJenisKelas(pg, sekarang),
    daftarPaket(pg),
    kursiVsKredit(pg, sekarang),
  ]);
  const kurang = muat.terkunci.filter((t) => t.kursi < t.kredit);

  // Dicari di sini, bukan di query: katalog studio puluhan baris, bukan
  // puluhan ribu. Menambah `where` di dua query untuk itu cuma memindahkan
  // kerja yang sama ke tempat yang lebih sulit diubah.
  const cocok = (teks: string, q: string | undefined) =>
    !q || teks.toLowerCase().includes(q.trim().toLowerCase());
  const jenisCocok = jenis.filter((j) => cocok(j.nama, qk));
  const paketCocok = paket.filter((p) => cocok(`${p.nama} ${p.kelas.join(" ")}`, qp));

  const halamanJenis = sepotong(jenisCocok, halk);
  const halamanPaket = sepotong(paketCocok, halp);

  /** Tautan yang mempertahankan parameter lain — ganti satu, sisanya utuh. */
  const kini = new URLSearchParams();
  if (qk) kini.set("qk", qk);
  if (qp) kini.set("qp", qp);
  if (halk) kini.set("halk", halk);
  if (halp) kini.set("halp", halp);
  const tautan = (ubah: Record<string, string | null>) => {
    const p = new URLSearchParams(kini);
    for (const [k, v] of Object.entries(ubah)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    const s = p.toString();
    return s ? `/admin/layanan?${s}` : "/admin/layanan";
  };

  const tutup = tautan({});
  const ke = (panel: string, id?: string) => tautan({ panel, id: id ?? null });

  // `?panel=` bisa diketik siapa saja. Semua dialog di layar ini mengubah
  // katalog, jadi semuanya milik owner — dan syaratnya diperiksa ULANG di
  // server action-nya, karena action bisa dipanggil tanpa layar ini.
  const panel = owner ? panelDiminta : undefined;
  const jenisPanel = jenis.find((j) => j.id === id) ?? null;
  const paketPanel = paket.find((p) => p.id === id) ?? null;
  const bolehUbahPaket = paketPanel?.terjual === 0;
  const bolehHapusJenis = jenisPanel ? !jenisPanel.dipakai : false;

  const aksiJenis = (j: JenisKelas): Aksi[] =>
    owner
      ? [
          { label: "Ubah", href: ke("jenis", j.id) },
          ...(j.dipakai
            ? []
            : [{ label: "Hapus", href: ke("hapus-jenis", j.id), bahaya: true }]),
        ]
      : [];

  const aksiPaket = (p: BarisPaket): Aksi[] =>
    owner
      ? [
          ...(p.terjual === 0 ? [{ label: "Ubah", href: ke("paket", p.id) }] : []),
          {
            label: p.aktif ? "Sembunyikan" : "Jual lagi",
            href: ke(p.aktif ? "sembunyikan" : "jual", p.id),
            bahaya: p.aktif,
          },
        ]
      : [];

  const pager = (h: ReturnType<typeof sepotong>, kunci: string, total: number) => (
    <div className="border-t border-border px-4 py-3">
      <Halaman
        mulai={h.mulai}
        tampil={h.baris.length}
        total={total}
        sebelum={h.halaman > 1 ? tautan({ [kunci]: String(h.halaman - 1) }) : null}
        sesudah={
          h.halaman < h.total ? tautan({ [kunci]: String(h.halaman + 1) }) : null
        }
      />
    </div>
  );

  return (
    <Kerangka
      nama={pengguna.nama}
      peran={pengguna.peran}
      aktif="/admin/layanan"
      kabar={kabar}
    >
      <h1 className="sr-only">Kelas & paket</h1>

      {/* Tiga angka yang menjawab "katalognya seberapa besar" sebelum mata
          turun ke tabelnya. Terjual dijumlahkan dari baris yang sama — tidak
          perlu query kedua. */}
      <div className="grid gap-dekat sm:grid-cols-3">
        <Kartu>
          <Angka nilai={jenis.length} label="Kelas" />
        </Kartu>
        <Kartu>
          <Angka
            nilai={paket.length}
            label="Paket"
            catatan={`${paket.filter((p) => p.aktif).length} sedang dijual`}
          />
        </Kartu>
        <Kartu>
          <Angka
            nilai={paket.reduce((t, p) => t + p.terjual, 0)}
            label="Paket terjual"
          />
        </Kartu>
      </div>

      {/* DS-55 — hanya digambar saat ada yang kurang. Kartu yang selalu hijau
          adalah baris yang berhenti dibaca orang. */}
      {kurang.length > 0 && (
        <div className="mt-dekat">
          <Kartu
            judul="Kursi kurang dari kredit yang sudah terjual"
            catatan="Kredit hangus pada tanggalnya entah studio menjadwalkan atau tidak. Hanya kredit dari paket yang cuma mencakup satu kelas yang dihitung."
            warna="bg-warn-surface border-warn-foreground/30"
            aksi={<Tambah href="/admin/jadwal" anak="Tambah jadwal" />}
            padat
          >
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-app-body-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className={TH}>Kelas</th>
                    <th className={`${TH} w-28 text-right`}>Kredit</th>
                    <th className={`${TH} w-28 text-right`}>Kursi</th>
                    <th className={`${TH} w-28 text-right`}>Kurang</th>
                    <th className={`${TH} w-40 text-right`}>Mulai hangus</th>
                  </tr>
                </thead>
                <tbody>
                  {kurang.map((t) => (
                    <tr key={t.id} className="border-b border-border last:border-0">
                      <td className={`${TD} text-app-body`}>{t.nama}</td>
                      <td className={`${TD} text-right tabular-nums`}>{t.kredit}</td>
                      <td className={`${TD} text-right tabular-nums`}>{t.kursi}</td>
                      <td className={`${TD} text-right tabular-nums font-medium`}>
                        {t.kredit - t.kursi}
                      </td>
                      <td className={`${TD} text-right tabular-nums`}>
                        {tanggalRingkasWib(t.hangus_terdekat)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Kartu>
        </div>
      )}

      {/* Paket 8 kolom, kelas 4. Pisahnya di 1280px seperti A4: di 1024 kolom
          kanan tinggal 227px dan tabelnya menggulir sejak kolom pertama. */}
      <div className="mt-dekat grid grid-cols-12 items-start gap-dekat">
        <div className="col-span-12 xl:col-span-8">
          <Kartu padat min0>
            <KepalaTabel
              nama="Paket"
              jumlah={paketCocok.length}
              kunci="qp"
              nilai={qp ?? ""}
              bawa={qk ? { qk } : {}}
              hapus={qp ? tautan({ qp: null, halp: null }) : null}
              tambah={
                owner ? <Tambah href={ke("paket")} anak="Tambah paket" /> : undefined
              }
            />

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-app-body-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className={TH}>Nama</th>
                    <th className={`${TH} w-32 text-right`}>Harga</th>
                    <th className={`${TH} w-20 text-right`}>Kredit</th>
                    <th className={`${TH} w-24 text-right`}>Berlaku</th>
                    <th className={`${TH} w-24 text-right`}>Terjual</th>
                    <th className={`${TH} w-32`}>Status</th>
                    <th className={`${TH} w-14`}>
                      <span className="sr-only">Aksi</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {halamanPaket.baris.map((p) => (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className={TD}>
                        <p className="text-app-body">{p.nama}</p>
                        {/* Cakupan jadi baris kedua, bukan kolom: "Chair, Mat,
                            Reformer, Tower" terlalu panjang untuk kolom yang
                            harus berbagi ruang dengan lima angka. */}
                        <p className="text-app-label text-muted-foreground">
                          {p.kelas.length ? p.kelas.join(" · ") : "belum ada kelas"}
                        </p>
                      </td>
                      <td className={`${TD} text-right tabular-nums`}>
                        {rupiah(p.harga_rupiah)}
                      </td>
                      <td className={`${TD} text-right tabular-nums`}>
                        {p.jumlah_kredit}
                      </td>
                      <td className={`${TD} text-right tabular-nums`}>
                        {p.masa_berlaku_hari} hari
                      </td>
                      <td className={`${TD} text-right tabular-nums`}>{p.terjual}</td>
                      <td className={TD}>
                        {/* DS-14 — status punya chip berteks, bukan warna saja. */}
                        <Chip
                          warna={
                            p.aktif
                              ? "bg-ok-surface text-ok-foreground"
                              : "bg-neutral-surface text-neutral-foreground"
                          }
                          anak={p.aktif ? "Dijual" : "Disembunyikan"}
                        />
                      </td>
                      <td className={`${TD} text-right`}>
                        <MenuAksi label={p.nama} aksi={aksiPaket(p)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {halamanPaket.baris.length === 0 && (
              <p className="px-4 py-6 text-app-body-sm text-muted-foreground">
                Tidak ada paket yang cocok.
              </p>
            )}

            {pager(halamanPaket, "halp", paketCocok.length)}
          </Kartu>
        </div>

        <div className="col-span-12 xl:col-span-4">
          <Kartu padat min0>
            <KepalaTabel
              nama="Kelas"
              jumlah={jenisCocok.length}
              kunci="qk"
              nilai={qk ?? ""}
              bawa={qp ? { qp } : {}}
              hapus={qk ? tautan({ qk: null, halk: null }) : null}
              tambah={owner ? <Tambah href={ke("jenis")} anak="Tambah" /> : undefined}
            />

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-app-body-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className={TH}>Nama</th>
                    <th className={`${TH} w-20 text-right`}>Kursi</th>
                    <th className={`${TH} w-20 text-right`}>Durasi</th>
                    <th className={`${TH} w-14`}>
                      <span className="sr-only">Aksi</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {halamanJenis.baris.map((j) => (
                    <tr key={j.id} className="border-b border-border last:border-0">
                      <td className={TD}>
                        <p className="text-app-body">{j.nama}</p>
                        {/* Keadaan yang menuntut tindakan disebut; yang baik
                            tidak. Kelas yang sudah masuk paket dan sudah
                            dijadwalkan tidak punya baris kedua sama sekali. */}
                        {(!j.dipakai_paket || !j.slot_mingguan) && (
                          <p className="text-app-label text-warn-foreground">
                            {!j.dipakai_paket && "Belum masuk paket"}
                            {!j.dipakai_paket && !j.slot_mingguan && " · "}
                            {!j.slot_mingguan && "Belum dijadwalkan"}
                          </p>
                        )}
                      </td>
                      <td className={`${TD} text-right tabular-nums`}>
                        {j.kapasitas_default}
                      </td>
                      <td className={`${TD} text-right tabular-nums`}>
                        {j.durasi_menit} m
                      </td>
                      <td className={`${TD} text-right`}>
                        <MenuAksi label={j.nama} aksi={aksiJenis(j)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {halamanJenis.baris.length === 0 && (
              <p className="px-4 py-6 text-app-body-sm text-muted-foreground">
                Tidak ada kelas yang cocok.
              </p>
            )}

            {pager(halamanJenis, "halk", jenisCocok.length)}
          </Kartu>
        </div>
      </div>

      {panel === "jenis" && <DialogJenis jenis={jenisPanel} tutup={tutup} />}
      {panel === "paket" && (!paketPanel || bolehUbahPaket) && (
        <DialogPaket paket={paketPanel} jenis={jenis} tutup={tutup} />
      )}
      {panel === "hapus-jenis" && jenisPanel && bolehHapusJenis && (
        <DialogTanya
          judul={`Hapus ${jenisPanel.nama}?`}
          catatan="Belum dipakai jadwal, sesi, maupun paket, jadi tidak ada yang ikut hilang."
          tombol="Hapus"
          aksi={buangJenisKelas}
          kolom={{ id: jenisPanel.id, nama: jenisPanel.nama }}
          tutup={tutup}
        />
      )}
      {panel === "sembunyikan" && paketPanel && (
        <DialogTanya
          judul={`Sembunyikan ${paketPanel.nama}?`}
          catatan="Hilang dari halaman publik. Member yang sudah membelinya tetap memegang kreditnya, dan paketnya bisa dijual lagi kapan saja."
          tombol="Sembunyikan"
          aksi={setAktifPaket}
          kolom={{ id: paketPanel.id, aktif: "0" }}
          tutup={tutup}
        />
      )}
      {panel === "jual" && paketPanel && (
        <DialogTanya
          judul={`Jual lagi ${paketPanel.nama}?`}
          catatan="Muncul kembali di halaman publik dengan harga dan isi yang sekarang."
          tombol="Jual lagi"
          aksi={setAktifPaket}
          kolom={{ id: paketPanel.id, aktif: "1" }}
          tutup={tutup}
        />
      )}
    </Kerangka>
  );
}
