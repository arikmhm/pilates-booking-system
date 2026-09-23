// Layar A6 Layanan & paket — UC-O02, UC-O03.
//
// Dua tabel yang menentukan apa yang dijual studio ini: jenis kelas
// (`class_types`) dan paket kredit (`packages`). Keduanya sudah ada sejak
// skema pertama; yang belum ada cuma layarnya, jadi selama ini harga hanya
// bisa diubah lewat SQL.
//
// Jenis kelas bisa DITAMBAH dari sini, tidak bisa diubah. Menambah aman:
// BR-7.3 menyalin kapasitas ke `sessions` saat sesi dibuat, jadi baris baru
// tidak menyentuh satu pun sesi lama. Mengubah nama atau kapasitas jenis yang
// sudah dipakai lain soal — ia mengubah arti kartu paket yang sudah dibeli
// orang, dan itu pantas lewat percakapan, bukan formulir.
//
// Menghapus hanya untuk yang belum dipakai apa pun: salah ketik yang baru
// saja dibuat. Begitu ia menempel di slot, sesi, atau paket, tombolnya tidak
// digambar sama sekali, bukan digambar lalu gagal.

import Link from "next/link";
import { pg } from "@/db";
import { daftarJenisKelas, daftarPaket, kursiVsKredit } from "@/db/kelola";
import { pastikanAdmin } from "@/lib/masuk";
import { rupiah, tanggalRingkasWib } from "@/lib/waktu";
import { Chip, Kartu, Kerangka, Tombol } from "@/components/kerangka";
import {
  buangJenisKelas,
  setAktifPaket,
  tambahJenisKelas,
  tambahPaket,
} from "../kelola-aksi";

export const dynamic = "force-dynamic";

const INPUT =
  "h-12 w-full rounded-sm border border-border bg-background px-3 text-app-body";
const LABEL = "text-app-label uppercase text-muted-foreground";

export default async function A6({
  searchParams,
}: {
  searchParams: Promise<{ kabar?: string }>;
}) {
  const pengguna = await pastikanAdmin();
  // Harga = keputusan bisnis. Admin melihat katalog, owner yang mengubahnya.
  const owner = pengguna.peran === "owner";
  const { kabar } = await searchParams;

  const sekarang = new Date();
  const [jenis, paket, muat] = await Promise.all([
    daftarJenisKelas(pg, sekarang),
    daftarPaket(pg),
    kursiVsKredit(pg, sekarang),
  ]);
  const kurang = muat.terkunci.filter((t) => t.kursi < t.kredit);

  return (
    <Kerangka
      nama={pengguna.nama}
      peran={pengguna.peran}
      aktif="/admin/layanan"
      kabar={kabar}
    >
      <div>
        <h1 className="text-app-title">Kelas & paket</h1>
        {/* DS-54 — layar ini memperkenalkan model bisnisnya, jadi ia harus
            mengatakannya. Tanpa kalimat ini yang tampil cuma dua daftar
            bernama mirip, dan "10 Sesi Reformer" (paket) memang gampang
            tertukar dengan "Reformer" (jenis kelas). */}
        <p className="mt-1 max-w-[70ch] text-app-body text-muted-foreground">
          Studio ini menjual <strong className="text-foreground">kredit</strong>,
          bukan kelas satuan.{" "}
          <strong className="text-foreground">Jenis kelas</strong> adalah apa
          yang diajarkan — itu yang masuk jadwal.{" "}
          <strong className="text-foreground">Paket</strong> adalah apa yang
          dibayar: sejumlah kredit, masa berlakunya, dan daftar jenis kelas
          tempat kredit itu bisa dipakai. Satu kredit menukar satu kursi.
        </p>
      </div>

      {/* DS-54 — dua pasang daftar+formulir, satu pasang per baris:
          jenis kelas dulu (yang diajarkan), baru paket (yang dijual).
          Disusun per kolom, "Jenis kelas baru" mendarat di sebelah
          daftar paket dan terbaca seperti formulir untuk daftar yang
          salah. Di dalam tiap baris tetap DS-34: daftar kiri, formulir
          kanan. */}
      <div className="mt-dekat space-y-dekat">
        <div className="grid items-start gap-dekat lg:grid-cols-[minmax(0,1fr)_26rem]">
          {/* Daftar ini tiga hal sekaligus: yang dijadwalkan di A7, yang
              dicentang sebagai "kelas yang tercakup" di paket (BR-1.4), dan
              yang jadi saringan di layar jadwal. Satu sumber, tiga tempat. */}
          <Kartu
            judul="Jenis kelas — apa yang diajarkan"
            catatan="Tidak punya harga. Yang dijual paket di bawah; jenis kelas cuma menentukan kelas apa yang dijadwalkan, dan di kelas mana sebuah paket berlaku."
            padat
          >
            <ul className="divide-y divide-border">
              {jenis.map((j) => (
                <li key={j.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-app-body">{j.nama}</p>
                    <p className="text-app-body-sm text-muted-foreground">
                      {j.durasi_menit} menit · kapasitas bawaan {j.kapasitas_default}
                    </p>
                  </div>
                  {/* Dua angka yang menjawab pertanyaan layar INI: sudah
                      masuk paket mana pun belum, dan sudah dijadwalkan belum.
                      Jenis kelas yang kosong di keduanya tidak bisa dibeli
                      dan tidak pernah berjalan — dan itu yang harus ketahuan
                      dari sini, bukan jumlah sesi mendatangnya. */}
                  <div className="shrink-0 text-right text-app-body-sm text-muted-foreground">
                    <p>
                      {j.dipakai_paket
                        ? `Masuk ${j.dipakai_paket} paket`
                        : "Belum masuk paket"}
                    </p>
                    <p>
                      {j.slot_mingguan
                        ? `${j.slot_mingguan} slot / minggu`
                        : "Belum dijadwalkan"}
                    </p>
                  </div>
                  {/* Tombolnya cuma ada selama jenis kelasnya belum menempel
                      di mana-mana — tombol yang pasti gagal lebih buruk
                      daripada tombol yang tidak ada. */}
                  {owner && !j.dipakai && (
                    <form action={buangJenisKelas} className="shrink-0">
                      <input type="hidden" name="id" value={j.id} />
                      <input type="hidden" name="nama" value={j.nama} />
                      <Tombol gaya="halus" kecil anak="Hapus" />
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </Kartu>
          {!owner && (
            <Kartu judul="Katalog">
              <p className="text-app-body-sm text-muted-foreground">
                Menambah jenis kelas, membuat paket, dan menentukan harganya
                adalah kewenangan pemilik studio. Kamu tetap bisa melihat
                katalognya, dan memberikan paket ke member lewat layar detail
                member.
              </p>
            </Kartu>
          )}

          {owner && (
            <Kartu
              judul="Jenis kelas baru"
              catatan="Belum bisa dibeli sampai dicentang di sebuah paket, dan belum berjalan sampai dijadwalkan di Aturan Jadwal."
            >
              <form action={tambahJenisKelas} className="space-y-4">
                <div>
                  <label className={LABEL} htmlFor="jenis_nama">
                    Nama
                  </label>
                  <input
                    id="jenis_nama"
                    name="nama"
                    required
                    minLength={2}
                    maxLength={40}
                    placeholder="Barre"
                    className={INPUT}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL} htmlFor="kapasitas_default">
                      Kursi bawaan
                    </label>
                    <input
                      id="kapasitas_default"
                      name="kapasitas_default"
                      type="number"
                      required
                      min={1}
                      max={60}
                      defaultValue={8}
                      className={INPUT}
                    />
                  </div>
                  <div>
                    <label className={LABEL} htmlFor="jenis_durasi">
                      Durasi (menit)
                    </label>
                    <input
                      id="jenis_durasi"
                      name="durasi_menit"
                      type="number"
                      required
                      min={15}
                      max={240}
                      step={5}
                      defaultValue={70}
                      className={INPUT}
                    />
                  </div>
                </div>

                <p className="text-app-body-sm text-muted-foreground">
                  Keduanya cuma nilai bawaan. Tiap slot mingguan dan tiap sesi
                  boleh memakai angka lain — Sabtu boleh 45 menit walau
                  bawaannya 70.
                </p>

                <Tombol penuh anak="Tambah jenis kelas" />
              </form>
            </Kartu>
          )}
        </div>

        <div className="grid items-start gap-dekat lg:grid-cols-[minmax(0,1fr)_26rem]">
          <Kartu
            judul="Paket — apa yang dibeli"
            catatan="Inilah yang dibayar member, dan yang tampil di halaman publik. Tiap paket menyebut jumlah kreditnya, masa berlakunya, dan jenis kelas mana saja yang boleh dipakai."
            padat
          >
            <ul className="divide-y divide-border">
              {paket.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-app-body">{p.nama}</p>
                    <p className="text-app-body-sm text-muted-foreground">
                      {p.jumlah_kredit} kredit · berlaku {p.masa_berlaku_hari} hari ·{" "}
                      {p.kelas.length ? p.kelas.join(", ") : "belum ada jenis kelas"}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-app-body tabular-nums">
                      {rupiah(p.harga_rupiah)}
                    </p>
                    <p className="text-app-label uppercase text-muted-foreground">
                      {rupiah(Math.round(p.harga_rupiah / p.jumlah_kredit))} / kelas
                    </p>
                  </div>

                  <div className="w-24 shrink-0 text-app-body-sm tabular-nums text-muted-foreground">
                    {p.terjual} terjual
                  </div>

                  {/* DS-14 — status punya chip sendiri, tidak diwakili tombol. */}
                  <Chip
                    warna={
                      p.aktif
                        ? "bg-ok-surface text-ok-foreground"
                        : "bg-neutral-surface text-neutral-foreground"
                    }
                    anak={p.aktif ? "Dijual" : "Disembunyikan"}
                  />

                  {owner && (
                    <form action={setAktifPaket} className="shrink-0">
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="aktif" value={p.aktif ? "0" : "1"} />
                      <Tombol
                        gaya="halus"
                        kecil
                        anak={p.aktif ? "Sembunyikan" : "Jual lagi"}
                      />
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </Kartu>
          {owner && (
          <Kartu
            judul="Paket baru"
            catatan="Paket lama tidak pernah dihapus — member yang sudah beli tetap memegang kreditnya."
          >
            <form action={tambahPaket} className="space-y-4">
              <div>
                <label className={LABEL} htmlFor="nama">
                  Nama paket
                </label>
                <input
                  id="nama"
                  name="nama"
                  required
                  minLength={3}
                  maxLength={60}
                  placeholder="8 Sesi Reformer"
                  className={INPUT}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LABEL} htmlFor="jumlah_kredit">
                    Jumlah kredit
                  </label>
                  <input
                    id="jumlah_kredit"
                    name="jumlah_kredit"
                    type="number"
                    required
                    min={1}
                    max={200}
                    defaultValue={8}
                    className={INPUT}
                  />
                </div>
                <div>
                  <label className={LABEL} htmlFor="masa_berlaku_hari">
                    Berlaku (hari)
                  </label>
                  <input
                    id="masa_berlaku_hari"
                    name="masa_berlaku_hari"
                    type="number"
                    required
                    min={1}
                    max={730}
                    defaultValue={60}
                    className={INPUT}
                  />
                </div>
              </div>

              <div>
                <label className={LABEL} htmlFor="harga_rupiah">
                  Harga (Rupiah, tanpa titik)
                </label>
                <input
                  id="harga_rupiah"
                  name="harga_rupiah"
                  type="number"
                  required
                  min={0}
                  step={1000}
                  defaultValue={1200000}
                  className={INPUT}
                />
              </div>

              <fieldset>
                <legend className={LABEL}>Kelas yang tercakup</legend>
                <p className="mb-2 text-app-body-sm text-muted-foreground">
                  Kredit paket ini hanya bisa dipakai di kelas yang dicentang.
                  Yang tidak dicentang akan ditolak saat member mencoba memesan.
                </p>
                <div className="space-y-1">
                  {jenis.map((j) => (
                    <label
                      key={j.id}
                      className="flex min-h-11 items-center gap-3 rounded-sm px-2 text-app-body hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        name="class_type_ids"
                        value={j.id}
                        className="size-4"
                      />
                      {j.nama}
                    </label>
                  ))}
                </div>
              </fieldset>

              <Tombol penuh anak="Buat paket" />
            </form>
          </Kartu>
          )}
        </div>

        {/* DS-55 — pertanyaan terakhir layar ini, dan satu-satunya yang
            menuntut tindakan: kredit yang sudah dijual, kursinya sudah ada
            belum? Ia duduk paling bawah karena ia akibat dari dua blok di
            atasnya, dan melebar penuh karena tidak punya formulir pasangan. */}
        <Kartu
          judul="Kursi vs kredit"
          catatan="Kredit hangus pada tanggalnya entah studio menjadwalkan atau tidak. Kalau kursinya kurang, uangnya tetap di studio dan kelasnya hilang di member."
          warna={
            kurang.length
              ? "bg-warn-surface border-warn-foreground/30"
              : "bg-background border-border"
          }
        >
          {muat.terkunci.length > 0 && (
            <ul className="divide-y divide-border">
              {muat.terkunci.map((t) => {
                const selisih = t.kredit - t.kursi;
                return (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3 first:pt-0"
                  >
                    <p className="min-w-32 text-app-body">{t.nama}</p>
                    <p className="text-app-body-sm text-muted-foreground">
                      <span className="text-foreground tabular-nums">
                        {t.kredit} kredit
                      </span>{" "}
                      cuma bisa dipakai di sini, mulai hangus{" "}
                      {tanggalRingkasWib(t.hangus_terdekat)}
                    </p>
                    <p className="text-app-body-sm text-muted-foreground">
                      <span className="text-foreground tabular-nums">
                        {t.kursi} kursi
                      </span>{" "}
                      kosong terjadwal sampai {tanggalRingkasWib(t.hangus_terakhir)}
                    </p>
                    {selisih > 0 ? (
                      <Chip
                        warna="bg-warn-surface text-warn-foreground"
                        anak={`Kurang ${selisih} kursi`}
                      />
                    ) : (
                      <Chip
                        warna="bg-ok-surface text-ok-foreground"
                        anak="Cukup"
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {/* Kredit dari paket yang mencakup beberapa jenis kelas tidak bisa
              dibebankan ke satu jenis pun — pemiliknya punya pilihan. Yang
              masih berarti cuma totalnya. */}
          <p
            className={`text-app-body-sm text-muted-foreground ${
              muat.terkunci.length ? "mt-4" : ""
            }`}
          >
            {muat.bebas.kredit > 0 ? (
              <>
                Di luar itu ada{" "}
                <span className="tabular-nums text-foreground">
                  {muat.bebas.kredit} kredit
                </span>{" "}
                dari paket yang mencakup beberapa jenis kelas — pemiliknya punya
                pilihan, jadi tidak dibebankan ke satu jenis pun. Lawan{" "}
                <span className="tabular-nums text-foreground">
                  {muat.bebas.kursi} kursi
                </span>{" "}
                kosong terjadwal sampai{" "}
                {muat.bebas.hangus_terakhir
                  ? tanggalRingkasWib(muat.bebas.hangus_terakhir)
                  : "—"}
                .
              </>
            ) : (
              "Belum ada kredit aktif dari paket yang mencakup beberapa jenis kelas."
            )}
          </p>

          <p className="mt-2 max-w-[70ch] text-app-body-sm text-muted-foreground">
            Hitungan ini menjawab &ldquo;cukup atau tidak&rdquo; untuk
            keseluruhan, bukan untuk tiap member: kursi yang baru tersedia
            sesudah kredit seseorang hangus tetap terhitung di sini. Tanggal
            hangus terdekat disebut supaya sisanya bisa kamu nilai sendiri.
          </p>

          {kurang.length > 0 && (
            <Link
              href="/admin/jadwal"
              className="mt-4 inline-flex min-h-11 items-center rounded-sm border border-foreground px-4 text-app-label font-medium uppercase"
            >
              Buka Aturan Jadwal
            </Link>
          )}
        </Kartu>
      </div>
    </Kerangka>
  );
}
