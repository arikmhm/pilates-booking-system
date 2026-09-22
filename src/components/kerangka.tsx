// Kerangka layar aplikasi — dipakai M1, M3, A1, A2, A3.
//
// Sebelumnya tiap halaman menyusun header sendiri di atas latar putih polos,
// jadi tidak ada yang mengikat kelimanya. Di sini satu bilah atas, satu latar
// `muted` dengan kartu putih di atasnya (DS-9: kedalaman dari pergeseran nada
// dan garis tipis, bukan bayangan), dan satu tempat untuk pesan hasil aksi.

import Link from "next/link";

type Lebar = "member" | "admin";

const NAV: Record<string, [string, string][]> = {
  member: [
    ["/jadwal", "Jadwal"],
    ["/akun", "Akun Saya"],
  ],
  admin: [["/admin", "Dashboard"]],
};

export function Kerangka({
  nama,
  peran,
  aktif,
  kabar,
  lebar = "member",
  children,
}: {
  nama: string;
  peran: string;
  aktif?: string;
  kabar?: string;
  lebar?: Lebar;
  children: React.ReactNode;
}) {
  const nav = NAV[peran === "member" || peran === "coach" ? "member" : "admin"];
  const wadah =
    lebar === "admin"
      ? "mx-auto w-full max-w-[1200px] px-gutter"
      : "mx-auto w-full max-w-lg px-gutter";

  return (
    <div className="flex min-h-full flex-1 flex-col bg-muted">
      <header className="border-b border-border bg-background">
        <div className={`${wadah} flex h-16 items-center justify-between gap-4`}>
          <div className="flex items-center gap-6">
            <Link
              href={nav[0][0]}
              className="inline-flex min-h-11 items-center text-app-label font-medium uppercase tracking-[0.14em]"
            >
              Kenari
            </Link>
            <nav className="flex items-center gap-4">
              {nav.map(([href, label]) => (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex min-h-11 items-center text-app-body-sm transition-colors ${
                    aktif === href
                      ? "text-foreground underline underline-offset-4"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-app-body-sm text-muted-foreground sm:inline">
              {nama}
            </span>
            <Link
              href="/masuk"
              className="inline-flex min-h-11 items-center rounded-sm border border-border px-3 text-app-label uppercase transition-colors hover:border-foreground"
            >
              Ganti
            </Link>
          </div>
        </div>
      </header>

      <main className={`${wadah} w-full flex-1 py-md`}>
        {kabar && (
          <p className="mb-sm rounded-md border border-border bg-background p-4 text-app-body-sm">
            {kabar}
          </p>
        )}
        {children}
      </main>
    </div>
  );
}

/** Kartu putih di atas latar muted. Satu-satunya bentuk permukaan di aplikasi. */
export function Kartu({
  judul,
  catatan,
  padat,
  warna = "bg-background border-border",
  children,
}: {
  judul?: string;
  catatan?: string;
  padat?: boolean;
  warna?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-md border ${warna}`}>
      {judul && (
        <div className="border-b border-inherit px-4 py-3">
          <h2 className="text-app-section">{judul}</h2>
          {catatan && (
            <p className="text-app-body-sm text-muted-foreground">{catatan}</p>
          )}
        </div>
      )}
      <div className={padat ? "" : "p-4"}>{children}</div>
    </section>
  );
}

/** Angka besar + label. Dipakai kartu ringkas di A1 dan sisa kredit di M1/M3. */
export function Angka({
  nilai,
  label,
  catatan,
  warnaCatatan = "text-muted-foreground",
}: {
  nilai: React.ReactNode;
  label: string;
  catatan?: string;
  warnaCatatan?: string;
}) {
  return (
    <div>
      <p className="text-app-label uppercase text-muted-foreground">{label}</p>
      <p className="text-app-number tabular-nums">{nilai}</p>
      {catatan && <p className={`text-app-body-sm ${warnaCatatan}`}>{catatan}</p>}
    </div>
  );
}

const GAYA = {
  utama:
    "bg-primary text-primary-foreground hover:brightness-95 active:brightness-90",
  garis: "border border-foreground hover:bg-foreground hover:text-background",
  halus: "border border-border hover:border-foreground",
  bahaya:
    "bg-danger-surface text-danger-foreground ring-1 ring-danger-foreground/30 hover:ring-danger-foreground",
} as const;

export function Tombol({
  gaya = "utama",
  penuh,
  kecil,
  anak,
}: {
  gaya?: keyof typeof GAYA;
  penuh?: boolean;
  kecil?: boolean;
  anak: string;
}) {
  return (
    <button
      type="submit"
      className={`inline-flex items-center justify-center rounded-sm text-app-label font-medium uppercase transition ${
        kecil ? "min-h-11 px-4" : "h-12 px-6"
      } ${penuh ? "w-full" : ""} ${GAYA[gaya]}`}
    >
      {anak}
    </button>
  );
}

export function Chip({ warna, anak }: { warna: string; anak: string }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-app-label ${warna}`}
    >
      {anak}
    </span>
  );
}
