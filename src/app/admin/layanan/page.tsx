// Layar A6 Kelas & paket — UC-O02, UC-O03.
//
// Dua tabel yang menentukan apa yang dijual studio ini: jenis kelas
// (`class_types`) dan paket kredit (`packages`), plus satu ukuran yang
// menghubungkan keduanya dengan kenyataan — kursi vs kredit (DS-55).
//
// DS-56 — barisnya tabel, aksinya di menu "⋯", formulirnya dialog dari URL.
// Versi sebelumnya menaruh dua formulir terbuka di kolom kanan dan sebaris
// penjelasan di tiap kartu; yang tersisa dari layar itu cuma teks.
//
// Apa yang boleh diubah, dan kenapa, dijaga lapisan db — bukan di sini:
//   jenis kelas  selalu boleh (BR-7.3 melindungi sesi yang sudah terbit)
//   paket        hanya selama belum dibeli siapa pun (harga dan nama dibaca
//                hidup-hidup oleh buku transaksi; cakupan menentukan BR-1.4)

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
import { Chip, Kartu, Kerangka } from "@/components/kerangka";
import { MenuAksi, type Aksi } from "@/components/menu-aksi";
import { buangJenisKelas, setAktifPaket } from "../kelola-aksi";
import { DialogJenis, DialogPaket, DialogTanya } from "./dialog";

export const dynamic = "force-dynamic";

const TH =
  "px-3 py-2 text-left text-app-label uppercase text-muted-foreground font-normal";
const TD = "px-3 py-2 align-middle";

/** Tabel yang menggulung sendiri di layar sempit, bukan menggulungkan halaman. */
function Tabel({
  kepala,
  children,
}: {
  kepala: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-app-body-sm">
        <thead>
          <tr className="border-b border-border">{kepala}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Tambah({ href, anak }: { href: string; anak: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-primary px-4 text-app-label font-medium uppercase text-primary-foreground transition hover:brightness-95"
    >
      <Plus className="size-4" />
      {anak}
    </Link>
  );
}

export default async function A6({
  searchParams,
}: {
  searchParams: Promise<{ kabar?: string; panel?: string; id?: string }>;
}) {
  const pengguna = await pastikanAdmin();
  // Harga = keputusan bisnis. Admin melihat katalog, owner yang mengubahnya.
  const owner = pengguna.peran === "owner";
  const { kabar, panel: panelDiminta, id } = await searchParams;

  const sekarang = new Date();
  const [jenis, paket, muat] = await Promise.all([
    daftarJenisKelas(pg, sekarang),
    daftarPaket(pg),
    kursiVsKredit(pg, sekarang),
  ]);
  const kurang = muat.terkunci.filter((t) => t.kursi < t.kredit);

  const tutup = "/admin/layanan";
  const ke = (panel: string, id?: string) =>
    `${tutup}?panel=${panel}${id ? `&id=${id}` : ""}`;

  // `?panel=` bisa diketik siapa saja, jadi syaratnya diperiksa di sini —
  // dan diperiksa ULANG di server action-nya, karena action bisa dipanggil
  // tanpa layar ini sama sekali. Yang di sini menjaga agar formulir yang pasti
  // ditolak tidak pernah digambar; yang di sana yang benar-benar menjaga.
  // Semua dialog di layar ini mengubah katalog, jadi semuanya milik owner.
  // Admin yang mengetik `?panel=` sendiri tidak mendapat formulir apa pun.
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

  return (
    <Kerangka
      nama={pengguna.nama}
      peran={pengguna.peran}
      aktif="/admin/layanan"
      kabar={kabar}
    >
      {/* DS-56 — tidak ada paragraf pembuka. Remah roti sudah menamai
          layarnya, dan penjelasan model bisnis di tiap kunjungan adalah
          pelajaran yang cuma dibutuhkan sekali. Yang tersisa judul kartu yang
          menyebut perannya. */}
      <h1 className="sr-only">Kelas & paket</h1>

      <div className="space-y-dekat">
        <Kartu
          judul="Jenis kelas"
          catatan="Yang diajarkan dan masuk jadwal. Tidak punya harga."
          aksi={owner ? <Tambah href={ke("jenis")} anak="Tambah jenis kelas" /> : undefined}
          padat
        >
          <Tabel
            kepala={
              <>
                <th className={TH}>Nama</th>
                <th className={`${TH} w-24 text-right`}>Kursi</th>
                <th className={`${TH} w-24 text-right`}>Durasi</th>
                <th className={`${TH} w-28 text-right`}>Di paket</th>
                <th className={`${TH} w-32 text-right`}>Slot / minggu</th>
                <th className={`${TH} w-14`}>
                  <span className="sr-only">Aksi</span>
                </th>
              </>
            }
          >
            {jenis.map((j) => (
              <tr key={j.id} className="border-b border-border last:border-0">
                <td className={`${TD} text-app-body`}>{j.nama}</td>
                <td className={`${TD} text-right tabular-nums`}>
                  {j.kapasitas_default}
                </td>
                <td className={`${TD} text-right tabular-nums`}>
                  {j.durasi_menit} m
                </td>
                {/* Nol ditulis "—", bukan "0": yang nol di sini bukan hitungan
                    yang kebetulan kosong, tapi keadaan yang perlu diperbaiki. */}
                <td
                  className={`${TD} text-right tabular-nums ${
                    j.dipakai_paket ? "" : "text-muted-foreground"
                  }`}
                >
                  {j.dipakai_paket || "—"}
                </td>
                <td
                  className={`${TD} text-right tabular-nums ${
                    j.slot_mingguan ? "" : "text-muted-foreground"
                  }`}
                >
                  {j.slot_mingguan || "—"}
                </td>
                <td className={`${TD} text-right`}>
                  <MenuAksi label={j.nama} aksi={aksiJenis(j)} />
                </td>
              </tr>
            ))}
          </Tabel>
        </Kartu>

        <Kartu
          judul="Paket"
          catatan="Yang dibayar member, dan yang tampil di halaman publik."
          aksi={owner ? <Tambah href={ke("paket")} anak="Tambah paket" /> : undefined}
          padat
        >
          <Tabel
            kepala={
              <>
                <th className={TH}>Nama</th>
                <th className={`${TH} w-32 text-right`}>Harga</th>
                <th className={`${TH} w-20 text-right`}>Kredit</th>
                <th className={`${TH} w-24 text-right`}>Berlaku</th>
                <th className={TH}>Kelas</th>
                <th className={`${TH} w-24 text-right`}>Terjual</th>
                <th className={`${TH} w-32`}>Status</th>
                <th className={`${TH} w-14`}>
                  <span className="sr-only">Aksi</span>
                </th>
              </>
            }
          >
            {paket.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className={`${TD} text-app-body`}>{p.nama}</td>
                <td className={`${TD} text-right tabular-nums`}>
                  {rupiah(p.harga_rupiah)}
                </td>
                <td className={`${TD} text-right tabular-nums`}>
                  {p.jumlah_kredit}
                </td>
                <td className={`${TD} text-right tabular-nums`}>
                  {p.masa_berlaku_hari} hari
                </td>
                <td className={`${TD} text-muted-foreground`}>
                  {p.kelas.length ? p.kelas.join(", ") : "—"}
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
          </Tabel>
        </Kartu>

        {/* DS-55 — hanya berbunyi saat ada yang kurang. Kartu yang selalu
            hijau adalah baris yang berhenti dibaca orang. */}
        {kurang.length > 0 && (
          <Kartu
            judul="Kursi kurang dari kredit yang sudah terjual"
            catatan="Kredit hangus pada tanggalnya entah studio menjadwalkan atau tidak."
            warna="bg-warn-surface border-warn-foreground/30"
            aksi={<Tambah href="/admin/jadwal" anak="Tambah jadwal" />}
            padat
          >
            <Tabel
              kepala={
                <>
                  <th className={TH}>Jenis kelas</th>
                  <th className={`${TH} w-28 text-right`}>Kredit</th>
                  <th className={`${TH} w-28 text-right`}>Kursi</th>
                  <th className={`${TH} w-28 text-right`}>Kurang</th>
                  <th className={`${TH} w-40 text-right`}>Mulai hangus</th>
                </>
              }
            >
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
            </Tabel>
            <p className="px-3 pb-3 pt-2 text-app-body-sm text-muted-foreground">
              Hanya kredit dari paket yang cuma mencakup satu jenis kelas yang
              dihitung di sini — pemiliknya tidak punya kelas lain untuk
              memakainya.
            </p>
          </Kartu>
        )}
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
