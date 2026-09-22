// Kerangka layar aplikasi — bilah atas + sidebar + area isi.
//
// Navigasi ada di sidebar shadcn (`components/ui/sidebar.tsx`): di layar lebar
// ia menempel kiri, di HP jadi sheet lewat tombol di bilah atas. Token
// `--sidebar-*` sudah dialiaskan ke palet 07-design.md di globals.css, jadi
// tidak ada warna baru yang masuk lewat pintu ini (DS-1).
//
// Isi memakai lebar penuh area kerja (DS-27): sidebar sudah memakan 256px di
// kiri, dan tabel admin serta kalender mingguan memang butuh sisanya.

import * as React from "react";
import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LineChart,
  LogOut,
  MessageSquare,
  Package,
  Repeat,
  Store,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { keluarAkun } from "@/app/masuk/aksi";

type Butir = { href: string; label: string; ikon: typeof CalendarDays };
/** Kelompok tanpa judul dipakai untuk butir tunggal yang berdiri sendiri. */
type Grup = { judul?: string; butir: Butir[] };

const JADWAL_KELAS: Butir = {
  href: "/jadwal",
  label: "Jadwal Kelas",
  ikon: CalendarDays,
};

// DS-33 — satu peran, satu daftar; yang tidak bisa dipakai peran itu tidak
// ditampilkan.
//
// Sembilan butir datar membuat staf memindai seluruh daftar tiap kali, jadi
// menunya dikelompokkan menurut "saya mau mengurus apa": jadwalnya, membernya,
// atau studionya. Dashboard berdiri sendiri di atas karena ia titik mendarat,
// Laporan sendiri di bawah karena hanya pemilik yang punya (BR-9.1) — dan
// pemisahan itu sendiri yang dijual.
//
// Kelompoknya **tidak** dibungkus akordeon. Dicoba dengan pola sidebar-07
// shadcn (`Collapsible` + `SidebarMenuSub`) dan memang jalan, tapi yang
// dibelinya tidak sepadan: tiap kelompok cuma berisi dua sampai tiga butir dan
// semuanya terbuka sejak awal, jadi yang tersisa hanyalah tiga tombol yang
// bisa menyembunyikan isi sidebar — beserta chevron, garis tegak, dan satu
// komponen klien baru. Judul kelompok sudah mengelompokkan.
//
// "Halaman Publik" sengaja hanya ada di sisi staf: itu alat kerja mereka
// (menunjukkan harga ke calon member, menyalin tautannya), bukan menu member —
// member sudah di dalam, mengembalikannya ke halaman jualan itu jalan mundur.
const STAF: Grup[] = [
  { butir: [{ href: "/admin", label: "Dashboard", ikon: LayoutDashboard }] },
  {
    judul: "Jadwal",
    butir: [
      JADWAL_KELAS,
      { href: "/admin/jadwal", label: "Aturan Jadwal", ikon: Repeat },
    ],
  },
  {
    judul: "Member",
    butir: [
      { href: "/admin/member", label: "Direktori Member", ikon: Users },
      { href: "/admin/pesan", label: "Pesan Terkirim", ikon: MessageSquare },
    ],
  },
  {
    judul: "Studio",
    butir: [
      { href: "/admin/tim", label: "Pelatih & Staf", ikon: UserCog },
      { href: "/admin/layanan", label: "Layanan & Paket", ikon: Package },
      { href: "/", label: "Halaman Publik", ikon: Store },
    ],
  },
];

// BR-9.1 — angka uang hanya untuk pemilik. Staf resepsionis melihat semuanya
// kecuali ini, dan kelompok sendiri membuat batas itu terbaca sekali lihat.
const BISNIS: Grup = {
  judul: "Bisnis",
  butir: [{ href: "/admin/laporan", label: "Laporan", ikon: LineChart }],
};

// Member dan coach cukup satu kelompok tanpa judul: dua butir tidak perlu
// dikategorikan, dan judul "Menu" hanya menamai bahwa ini menu.
const NAV: Record<string, Grup[]> = {
  member: [
    { butir: [JADWAL_KELAS, { href: "/akun", label: "Akun Saya", ikon: Wallet }] },
  ],
  coach: [
    {
      butir: [
        { href: "/pelatih", label: "Kelas Saya", ikon: ClipboardList },
        JADWAL_KELAS,
      ],
    },
  ],
  admin: STAF,
  owner: [...STAF, BISNIS],
};

const PERAN: Record<string, string> = {
  member: "Member",
  coach: "Coach",
  admin: "Admin",
  owner: "Owner",
};

// DS-11 — tinggi 48px, bukan 32px bawaan shadcn. Butir aktif memakai --primary
// karena shadcn memberi hover dan aktif token yang sama persis.
const BUTIR =
  "h-12 text-app-body-sm data-[active=true]:bg-primary data-[active=true]:text-primary-foreground";

export function Kerangka({
  nama,
  peran,
  aktif,
  judul,
  jejak,
  kabar,
  children,
}: {
  nama: string;
  peran: string;
  aktif?: string;
  judul?: string;
  /**
   * Ruas TAMBAHAN sesudah butir menunya — layar detail memakai ini.
   * Ruas pertama dihitung sendiri dari `aktif`, jadi pemanggil tidak pernah
   * mengulang nama menu dan tidak bisa salah menuliskannya.
   */
  jejak?: { label: string; href?: string }[];
  kabar?: string;
  children: React.ReactNode;
}) {
  const grup = NAV[peran] ?? NAV.member;
  const semua = grup.flatMap((g) => g.butir);
  const butirAktif = semua.find((b) => b.href === aktif);
  const tajuk = judul ?? butirAktif?.label ?? "Kenari";

  // Ruas terakhir adalah halaman sekarang: tidak bertaut, dan itu yang
  // membedakan "di mana saya" dari "ke mana saya bisa pergi".
  const rantai: { label: string; href?: string }[] = [
    { label: tajuk, href: jejak?.length ? butirAktif?.href : undefined },
    ...(jejak ?? []),
  ];

  return (
    <SidebarProvider className="flex-1">
      <Sidebar>
        <SidebarHeader className="px-4 py-4">
          <Link href={semua[0].href} className="inline-flex flex-col">
            <span className="text-app-label font-medium uppercase tracking-[0.14em]">
              Kenari
            </span>
            <span className="text-app-body-sm text-muted-foreground">
              Studio Pilates
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          {grup.map((g, i) => (
            <SidebarGroup key={g.judul ?? i}>
              {g.judul && (
                <SidebarGroupLabel className="text-app-label uppercase">
                  {g.judul}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {g.butir.map(({ href, label, ikon: Ikon }) => (
                    <SidebarMenuItem key={href}>
                      <SidebarMenuButton
                        asChild
                        isActive={aktif === href}
                        className={BUTIR}
                      >
                        <Link href={href}>
                          <Ikon />
                          <span>{label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="gap-0 p-0">
          <SidebarSeparator className="mx-0" />
          <div className="px-4 py-3">
            <p className="truncate text-app-body-sm">{nama}</p>
            <p className="text-app-label uppercase text-muted-foreground">
              {PERAN[peran] ?? peran}
            </p>
          </div>
          <SidebarMenu className="px-2 pb-2">
            <SidebarMenuItem>
              <SidebarMenuButton asChild className={BUTIR}>
                <Link href="/masuk">
                  <Users />
                  <span>Ganti Pengguna</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {/* "Ganti Pengguna" memasang cookie baru, jadi ia tidak pernah
                mengembalikan orang ke tampilan tamu. Keluar yang melakukannya,
                dan mendarat di jadwal publik (DS-45). */}
            <SidebarMenuItem>
              <form action={keluarAkun}>
                <SidebarMenuButton asChild className={BUTIR}>
                  <button type="submit" className="w-full">
                    <LogOut />
                    <span>Keluar</span>
                  </button>
                </SidebarMenuButton>
              </form>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-muted">
        {/* Mepet kiri seperti bawaan shadcn — tidak ada pembungkus terpusat di
            sini, kalau tidak tombol sidebar mengambang jauh dari sidebarnya. */}
        <header className="border-b border-border bg-background">
          <div className="flex h-16 items-center gap-2 px-gutter">
            <SidebarTrigger className="size-11" />
            <Separator orientation="vertical" className="mr-1 h-6" />
            <Breadcrumb>
              <BreadcrumbList className="text-app-body sm:gap-2">
                {rantai.map((r, i) => (
                  <React.Fragment key={`${r.label}-${i}`}>
                    {i > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      {r.href ? (
                        <BreadcrumbLink asChild>
                          <Link href={r.href}>{r.label}</Link>
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage className="text-app-body">
                          {r.label}
                        </BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="w-full flex-1 px-gutter py-sedang">
          {kabar && (
            <p className="mb-dekat rounded-md border border-border bg-background p-4 text-app-body-sm">
              {kabar}
            </p>
          )}
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

/** Kartu putih di atas latar muted. Satu-satunya bentuk permukaan di aplikasi. */
export function Kartu({
  judul,
  catatan,
  padat,
  min0,
  warna = "bg-background border-border",
  children,
}: {
  judul?: string;
  catatan?: string;
  padat?: boolean;
  /** Butir grid: matikan `min-width:auto` supaya isinya tidak melarkan induknya. */
  min0?: boolean;
  warna?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-md border ${min0 ? "min-w-0 " : ""}${warna}`}>
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
