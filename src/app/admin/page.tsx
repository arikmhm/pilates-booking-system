// Layar A1 Dashboard hari ini — 02-rules.md bagian 6.1. Tampilan laptop (DS-16).
//
// Satu layar, dua fokus (DS-47). Admin membuka ini untuk tahu **apa yang harus
// dikerjakan sekarang**: kelas hari ini, siapa yang menunggu kursi, kelas mana
// yang absennya belum dicentang. Owner membuka ini untuk tahu **bagaimana
// studionya berjalan**: omzet bulan ini dan nilai kredit yang masih
// menggantung — angka yang cuma boleh dilihat pemilik (BR-9.3).
//
// Bukan dua rute. Riset padanan produk (`docs/riset-dashboard-peran.md`)
// menemukan pola yang sama di Vagaro, WellnessLiving, dan TeamUp: satu
// dashboard, blok yang disaring per-permission. Mindbody memang memisahkan
// layarnya, tapi layar stafnya sebuah kalender — bukan versi ringkas dashboard
// pemiliknya.
//
// Panel kredit hangus tetap milik KEDUANYA. Itu bukan laporan; itu daftar
// orang yang harus di-chat hari ini, lengkap dengan tombolnya — dan di produk
// pembanding pun ia pekerjaan meja depan. Kalimat menit 2:15: "5 orang habis
// minggu ini. Sistemnya yang cari, bukan Kakak."

import Link from "next/link";
import { pg } from "@/db";
import {
  antreMenunggu,
  BATAS_SETELAN,
  belumDiabsen,
  kreditMauHangus,
  sesiHariIni,
  setelanLengkap,
  type SesiHariIni,
} from "@/db/admin";
import { kreditMenggantung, ringkasUang } from "@/db/transaksi";
import { STUDIO_DEMO } from "@/db/seed";
import { pastikanAdmin } from "@/lib/masuk";
import {
  hariPendekWib,
  hariWib,
  jamWib,
  rupiah,
  selisihManusiawi,
} from "@/lib/waktu";
import { tautanWa } from "@/lib/wa";
import { Angka, Chip, Kartu, Kerangka, Tombol } from "@/components/kerangka";
import { resetDemo, resetJadwalDemo, ubahSetelan } from "./aksi";

export const dynamic = "force-dynamic";

const LABEL_SETELAN: Record<string, string> = {
  cancel_window_hours: "Batas pembatalan (jam)",
  booking_opens_days: "Booking dibuka (hari)",
  waitlist_max: "Maksimal daftar tunggu",
};

function chipSesi(s: SesiHariIni): [string, string] {
  if (s.status === "cancelled")
    return ["bg-danger-surface text-danger-foreground", "Dibatalkan"];
  if (s.terisi >= s.kapasitas)
    return [
      "bg-neutral-surface text-neutral-foreground",
      s.antre ? `Penuh · ${s.antre} antre` : "Penuh",
    ];
  return ["bg-ok-surface text-ok-foreground", `${s.kapasitas - s.terisi} kursi`];
}

export default async function A1({
  searchParams,
}: {
  searchParams: Promise<{ kabar?: string; hari?: string }>;
}) {
  const pengguna = await pastikanAdmin();
  const { kabar, hari } = await searchParams;
  const sekarang = new Date();
  // Sesi penuh + daftar tunggu yang dipakai skenario B ada BESOK pagi
  // (02-rules.md 6.2). Tanpa pengalih ini presenter tidak punya jalan ke A2
  // sesi itu di tengah demo.
  const owner = pengguna.peran === "owner";
  const geser = hari === "besok" ? 1 : 0;
  const tanggal = new Date(sekarang.getTime() + geser * 86_400_000);

  // Tiga query pertama milik siapa saja; dua terakhir dipilih menurut peran,
  // dan angka uang tidak pernah diminta kalau yang membuka admin (BR-9.3).
  const awalBulan = new Date(
    Date.UTC(sekarang.getUTCFullYear(), sekarang.getUTCMonth(), 1),
  );
  const [sesi, hangus, setelan, kerja, bisnis] = await Promise.all([
    sesiHariIni(pg, geser),
    kreditMauHangus(pg),
    setelanLengkap(pg),
    owner
      ? null
      : Promise.all([
          antreMenunggu(pg, { sekarang }),
          belumDiabsen(pg, { sekarang }),
        ]),
    owner
      ? Promise.all([
          ringkasUang(pg, { sejak: awalBulan }),
          kreditMenggantung(pg, { sekarang }),
        ])
      : null,
  ]);
  const [antre, absen] = kerja ?? [[], []];
  const [uang, menggantung] = bisnis ?? [null, null];

  const terisi = sesi.reduce((t, s) => t + s.terisi, 0);
  const kursi = sesi.reduce((t, s) => t + s.kapasitas, 0);
  const menunggu = antre.length;
  const belum = absen.reduce((t, a) => t + a.belum, 0);

  return (
    <Kerangka
      nama={pengguna.nama}
      peran={pengguna.peran}
      aktif="/admin"
      kabar={kabar}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-app-title">{setelan.nama}</h1>
          <p className="text-app-body-sm text-muted-foreground">
            {hariWib(tanggal)}
          </p>
        </div>
        <nav className="flex gap-2">
          {[
            ["/admin", "Hari ini", 0],
            ["/admin?hari=besok", "Besok", 1],
          ].map(([href, label, g]) => (
            <Link
              key={String(label)}
              href={String(href)}
              className={`inline-flex min-h-11 items-center rounded-sm border px-4 text-app-label uppercase transition-colors ${
                g === geser
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background hover:border-foreground"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Baris angka paling atas menjawab pertanyaan yang berbeda untuk dua
          peran, jadi isinya pun berbeda — bukan angka yang sama dengan satu
          kolom disembunyikan. */}
      <div className="mt-dekat grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kartu>
          <Angka nilai={sesi.length} label={geser ? "Kelas besok" : "Kelas hari ini"} />
        </Kartu>
        <Kartu>
          <Angka
            nilai={`${terisi}/${kursi}`}
            label="Kursi terisi"
            catatan={kursi ? `${Math.round((terisi / kursi) * 100)}% okupansi` : undefined}
          />
        </Kartu>

        {owner && uang && menggantung ? (
          <>
            <Kartu>
              <Angka
                nilai={rupiah(uang.omzet)}
                label="Omzet bulan ini"
                catatan={`${uang.jumlah} paket terjual`}
              />
            </Kartu>
            <Kartu>
              <Angka
                nilai={rupiah(menggantung.rupiah)}
                label="Kredit menggantung"
                catatan={`${menggantung.kredit} kredit di ${menggantung.paket} paket — sudah dibayar, belum jadi kelas.`}
              />
            </Kartu>
          </>
        ) : (
          <>
            <Kartu warna={menunggu ? "bg-warn-surface border-border-warm" : undefined}>
              <Angka
                nilai={menunggu}
                label="Menunggu kursi"
                catatan={menunggu ? "Ada yang bisa dinaikkan begitu kursi kosong." : undefined}
                warnaCatatan="text-warn-foreground"
              />
            </Kartu>
            <Kartu warna={belum ? "bg-warn-surface border-border-warm" : undefined}>
              <Angka
                nilai={belum}
                label="Belum diabsen"
                catatan={belum ? `di ${absen.length} kelas yang sudah selesai` : undefined}
                warnaCatatan="text-warn-foreground"
              />
            </Kartu>
          </>
        )}
      </div>

      <div className="mt-sedang grid items-start gap-sedang lg:grid-cols-[3fr_2fr]">
        <Kartu judul={geser ? "Kelas besok" : "Kelas hari ini"} padat>
          {sesi.length === 0 ? (
            <p className="p-4 text-app-body-sm text-muted-foreground">
              Tidak ada kelas terjadwal.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {sesi.map((s) => {
                const [warna, teks] = chipSesi(s);
                return (
                  <li key={s.id}>
                    <Link
                      href={`/admin/sesi/${s.id}`}
                      className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-muted"
                    >
                      <span className="w-14 shrink-0 text-app-section tabular-nums">
                        {jamWib(s.mulai_at)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-app-body">{s.kelas}</span>
                        <span className="block truncate text-app-body-sm text-muted-foreground">
                          {s.coach ?? "—"}
                        </span>
                      </span>
                      <span className="w-14 shrink-0 text-right text-app-body tabular-nums">
                        {s.terisi}/{s.kapasitas}
                      </span>
                      <span className="w-28 shrink-0 text-right">
                        <Chip warna={warna} anak={teks} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Kartu>

        <div className="space-y-sedang">
          {/* Dua antrean kerja meja depan. Keduanya hilang dari layar pemilik:
              ia tidak mengurus absensi, dan daftar tugas orang lain di
              dashboard sendiri cuma kebisingan (DS-47). */}
          {!owner && antre.length > 0 && (
            <Kartu
              judul="Menunggu kursi"
              catatan={`${antre.length} orang di daftar tunggu kelas terdekat.`}
              padat
            >
              <ul className="divide-y divide-border">
                {antre.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-app-body">{a.nama}</p>
                      <p className="truncate text-app-body-sm text-muted-foreground">
                        {a.kelas} · {hariPendekWib(a.mulai_at)} {jamWib(a.mulai_at)} ·{" "}
                        {a.terisi}/{a.kapasitas} kursi
                      </p>
                    </div>
                    <Link
                      href={`/admin/sesi/${a.session_id}`}
                      className="inline-flex min-h-11 shrink-0 items-center rounded-sm border border-border px-3 text-app-label uppercase transition-colors hover:border-foreground"
                    >
                      Buka kelas
                    </Link>
                  </li>
                ))}
              </ul>
            </Kartu>
          )}

          {!owner && absen.length > 0 && (
            <Kartu
              judul="Belum diabsen"
              catatan="Job no-show akan menandainya sendiri beberapa jam lagi — sesudah itu koreksinya per orang (BR-6.2, BR-6.4)."
              padat
            >
              <ul className="divide-y divide-border">
                {absen.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-app-body">
                        {a.kelas} · {jamWib(a.mulai_at)}
                      </p>
                      <p className="truncate text-app-body-sm text-muted-foreground">
                        {hariPendekWib(a.mulai_at)} · {a.coach ?? "—"} · {a.belum} orang
                      </p>
                    </div>
                    <Link
                      href={`/admin/sesi/${a.id}`}
                      className="inline-flex min-h-11 shrink-0 items-center rounded-sm bg-primary px-3 text-app-label font-medium uppercase text-primary-foreground transition hover:brightness-95"
                    >
                      Absen
                    </Link>
                  </li>
                ))}
              </ul>
            </Kartu>
          )}

          {/* Satu-satunya blok berwarna di halaman — DS, supaya mata langsung
              ke sini. Ini yang ditunjuk saat presentasi. */}
          <Kartu
            judul="Kredit hangus ≤ 7 hari"
            catatan={`${hangus.length} orang. Sistem yang mencari, bukan kamu.`}
            warna="bg-warn-surface border-border-warm"
            padat
          >
            {hangus.length === 0 ? (
              <p className="p-4 text-app-body-sm text-warn-foreground">
                Tidak ada yang mendesak minggu ini.
              </p>
            ) : (
              <ul className="divide-y divide-border-warm">
                {hangus.map((o) => (
                  <li
                    key={o.user_id + o.hangus_at.toISOString()}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/admin/member/${o.user_id}`}
                        className="text-app-body underline underline-offset-4"
                      >
                        {o.nama}
                      </Link>
                      <p className="text-app-body-sm text-warn-foreground">
                        {o.sisa} kredit · {selisihManusiawi(o.hangus_at, sekarang)}
                      </p>
                    </div>
                    <a
                      href={tautanWa(
                        o.telepon,
                        `Halo ${o.nama}, sisa ${o.sisa} kredit pilates kamu hangus ${hariWib(
                          o.hangus_at,
                        )}. Masih sempat dipakai — mau dibookingkan kelas minggu ini?`,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 shrink-0 items-center rounded-sm bg-primary px-4 text-app-label font-medium uppercase text-primary-foreground transition hover:brightness-95"
                    >
                      Chat WA
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Kartu>

          {/* Kewenangan owner (02-rules.md bagian 5): ini syarat studio
              untuk semua member sekaligus, bukan tugas harian meja depan.
              Penjaga sebenarnya ada di server action — yang ini cuma
              menghindari tombol yang pasti ditolak. */}
          {owner ? (
            <Kartu
              judul="Setelan aturan"
              catatan="Ini aturan studio kamu, bukan aturan sistem. Ubah kapan saja."
            >
              <form action={ubahSetelan} className="space-y-3">
                {(Object.keys(BATAS_SETELAN) as (keyof typeof BATAS_SETELAN)[]).map(
                  (kunci) => (
                    <label
                      key={kunci}
                      className="flex items-center justify-between gap-4"
                    >
                      <span className="text-app-body">{LABEL_SETELAN[kunci]}</span>
                      <input
                        type="number"
                        name={kunci}
                        defaultValue={setelan[kunci]}
                        min={BATAS_SETELAN[kunci][0]}
                        max={BATAS_SETELAN[kunci][1]}
                        className="h-11 w-24 rounded-sm border border-border px-3 text-app-body tabular-nums focus:border-foreground"
                      />
                    </label>
                  ),
                )}
                <Tombol gaya="garis" penuh anak="Simpan" />
              </form>
            </Kartu>
          ) : (
            <Kartu judul="Setelan aturan">
              <p className="text-app-body-sm text-muted-foreground">
                Batas pembatalan, jendela booking, dan maksimal daftar tunggu
                hanya bisa diubah pemilik studio.
              </p>
            </Kartu>
          )}

          {owner && (
            <Kartu judul="Angka lengkapnya">
              <p className="text-app-body-sm text-muted-foreground">
                Pendapatan per bulan, okupansi, tingkat kehadiran, dan nilai
                kredit yang sudah hangus ada di laporan.
              </p>
              <Link
                href="/admin/laporan"
                className="mt-3 inline-flex min-h-11 items-center rounded-sm border border-foreground px-4 text-app-label font-medium uppercase"
              >
                Buka Laporan
              </Link>
            </Kartu>
          )}

          {/* Hanya muncul di database demo. Penjaga sebenarnya ada di seed()
              dan resetJadwal() yang menolak jalan kalau studionya bukan studio
              demo — ini cuma supaya tombolnya tidak menggoda di instance
              klien. */}
          {setelan.nama === STUDIO_DEMO && (
            <Kartu
              judul="Reset"
              catatan="Dua keadaan awal yang berbeda. Kamu tetap login di keduanya."
            >
              {/* items-stretch + mt-auto: keterangan keduanya beda jumlah
                  baris, dan tombol yang tidak sebaris terbaca sebagai dua
                  kartu yang tidak sengaja bersebelahan. */}
              <div className="grid gap-4 sm:grid-cols-2">
                <form action={resetDemo} className="flex h-full flex-col gap-2">
                  <p className="text-app-body-sm text-muted-foreground">
                    Semua data ditulis ulang dari nol. Tanggal dihitung ulang
                    dari hari ini.
                  </p>
                  <div className="mt-auto">
                    <Tombol gaya="halus" penuh anak="Reset Demo" />
                  </div>
                </form>

                {/* Panggung kosong, bukan database kosong: aturan mingguan dan
                    kredit member tetap, jadi "Terbitkan sekarang" di A7 punya
                    sesuatu untuk diterbitkan dan kursinya bisa langsung
                    dipesan di depan klien. */}
                <form
                  action={resetJadwalDemo}
                  className="flex h-full flex-col gap-2"
                >
                  <p className="text-app-body-sm text-muted-foreground">
                    Jadwal dan seluruh pemesanannya dihapus. Aturan mingguan dan
                    kredit member tetap.
                  </p>
                  <div className="mt-auto">
                    <Tombol gaya="halus" penuh anak="Reset Jadwal" />
                  </div>
                </form>
              </div>
            </Kartu>
          )}
        </div>
      </div>
    </Kerangka>
  );
}
