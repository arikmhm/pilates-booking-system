// Kerangka layar aplikasi — dipakai M1, M3, A1, A2, A3.
//
// Navigasi pindah ke sidebar shadcn (`components/ui/sidebar.tsx`): di layar
// lebar ia menempel kiri, di HP jadi sheet lewat tombol di bilah atas. Token
// `--sidebar-*` sudah dialiaskan ke palet 07-design.md di globals.css, jadi
// tidak ada warna baru yang masuk lewat pintu ini (DS-1).
//
// Isi halaman tetap di satu lebar terkunci — 34rem member, 1200px admin
// (DS-27), ditulis sebagai nilai eksplisit supaya tidak bertabrakan dengan
// skala container Tailwind (DS-30).

import Link from "next/link";
import { CalendarDays, LayoutDashboard, Store, Wallet } from "lucide-react";
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

type Lebar = "member" | "admin";
type Butir = { href: string; label: string; ikon: typeof CalendarDays };

const NAV: Record<string, Butir[]> = {
  member: [
    { href: "/jadwal", label: "Jadwal", ikon: CalendarDays },
    { href: "/akun", label: "Akun Saya", ikon: Wallet },
  ],
  admin: [{ href: "/admin", label: "Dashboard", ikon: LayoutDashboard }],
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
  const judul = nav.find((b) => b.href === aktif)?.label ?? "Kenari";
  const wadah =
    lebar === "admin"
      ? "mx-auto w-full max-w-[1200px] px-gutter"
      : "mx-auto w-full max-w-[34rem] px-gutter";

  return (
    <SidebarProvider className="flex-1">
      <Sidebar>
        <SidebarHeader className="px-4 py-4">
          <Link href={nav[0].href} className="inline-flex flex-col">
            <span className="text-app-label font-medium uppercase tracking-[0.14em]">
              Kenari
            </span>
            <span className="text-app-body-sm text-muted-foreground">
              Studio Pilates
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-app-label uppercase">
              Menu
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {nav.map(({ href, label, ikon: Ikon }) => (
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

          <SidebarGroup>
            <SidebarGroupLabel className="text-app-label uppercase">
              Studio
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className={BUTIR}>
                    <Link href="/">
                      <Store />
                      <span>Halaman Studio</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
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
                  <span>Ganti Pengguna</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-muted">
        <header className="border-b border-border bg-background">
          <div className={`${wadah} flex h-16 items-center gap-3`}>
            <SidebarTrigger className="size-11" />
            <span className="text-app-section">{judul}</span>
          </div>
        </header>

        <div className={`${wadah} flex-1 py-sedang`}>
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
