// Kerangka layar aplikasi — bilah atas + sidebar + area isi.
//
// Navigasi ada di sidebar shadcn (`components/ui/sidebar.tsx`): di layar lebar
// ia menempel kiri, di HP jadi sheet lewat tombol di bilah atas. Token
// `--sidebar-*` sudah dialiaskan ke palet 07-design.md di globals.css, jadi
// tidak ada warna baru yang masuk lewat pintu ini (DS-1).
//
// Isi memakai lebar penuh area kerja (DS-27): sidebar sudah memakan 256px di
// kiri, dan tabel admin serta kalender mingguan memang butuh sisanya.

import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LineChart,
  MessageSquare,
  Package,
  Repeat,
  Store,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
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

type Butir = { href: string; label: string; ikon: typeof CalendarDays };
type Grup = { judul: string; butir: Butir[] };

const JADWAL = { href: "/jadwal", label: "Jadwal Kelas", ikon: CalendarDays };
const PUBLIK = { href: "/", label: "Halaman Publik", ikon: Store };

// DS-33 — satu peran, satu daftar; yang tidak bisa dipakai peran itu tidak
// ditampilkan. "Halaman Publik" sengaja hanya ada di sisi staf: itu alat kerja
// mereka (menunjukkan harga ke calon member, menyalin tautannya), bukan menu
// member — member sudah di dalam, mengembalikannya ke halaman jualan itu
// jalan mundur.
const HARIAN: Butir[] = [
  { href: "/admin", label: "Dashboard", ikon: LayoutDashboard },
  JADWAL,
  { href: "/admin/member", label: "Member", ikon: Users },
  { href: "/admin/pesan", label: "Pesan Terkirim", ikon: MessageSquare },
];
const STUDIO: Butir[] = [
  { href: "/admin/tim", label: "Pelatih & Staf", ikon: UserCog },
  { href: "/admin/layanan", label: "Layanan & Paket", ikon: Package },
  { href: "/admin/jadwal", label: "Aturan Jadwal", ikon: Repeat },
  PUBLIK,
];

const NAV: Record<string, Grup[]> = {
  member: [
    {
      judul: "Menu",
      butir: [JADWAL, { href: "/akun", label: "Akun Saya", ikon: Wallet }],
    },
  ],
  coach: [
    {
      judul: "Menu",
      butir: [
        { href: "/pelatih", label: "Kelas Saya", ikon: ClipboardList },
        JADWAL,
      ],
    },
  ],
  admin: [
    { judul: "Harian", butir: HARIAN },
    { judul: "Studio", butir: STUDIO },
  ],
  owner: [
    { judul: "Harian", butir: HARIAN },
    { judul: "Studio", butir: STUDIO },
    // BR-9.1 — angka uang hanya untuk pemilik. Staf resepsionis melihat
    // semuanya kecuali ini, dan pemisahan itu sendiri yang dijual.
    {
      judul: "Bisnis",
      butir: [{ href: "/admin/laporan", label: "Laporan", ikon: LineChart }],
    },
  ],
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
  kabar,
  children,
}: {
  nama: string;
  peran: string;
  aktif?: string;
  judul?: string;
  kabar?: string;
  children: React.ReactNode;
}) {
  const grup = NAV[peran] ?? NAV.member;
  const semua = grup.flatMap((g) => g.butir);
  const tajuk = judul ?? semua.find((b) => b.href === aktif)?.label ?? "Kenari";

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
          {grup.map((g) => (
            <SidebarGroup key={g.judul}>
              <SidebarGroupLabel className="text-app-label uppercase">
                {g.judul}
              </SidebarGroupLabel>
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
            <span className="text-app-section">{tajuk}</span>
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
