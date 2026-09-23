"use client";

// Menu "⋯" di ujung baris tabel — DS-56.
//
// Satu-satunya alasan ia komponen klien: menu yang menutup saat diklik di
// luar atau saat Escape ditekan tidak bisa dibuat tanpa JavaScript, dan menu
// yang tidak bisa ditutup lebih buruk daripada tidak ada menu.
//
// Isinya cuma tautan. Aksi yang sebenarnya hidup di dialog yang dibuka
// tautan itu, dan dialognya dirender server dari URL (DS-42) — jadi tidak ada
// satu pun keadaan formulir yang tersimpan di klien.

import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type Aksi = {
  label: string;
  href: string;
  /** Merah, dan didahului pemisah. Untuk yang menghilangkan sesuatu. */
  bahaya?: boolean;
};

export function MenuAksi({ label, aksi }: { label: string; aksi: Aksi[] }) {
  if (aksi.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        // DS-11 — target sentuh 44px walau ikonnya 16px.
        className="inline-flex size-11 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
        aria-label={`Aksi untuk ${label}`}
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        {aksi.map((a, i) => (
          <div key={a.href}>
            {a.bahaya && i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuItem asChild bahaya={a.bahaya}>
              <Link href={a.href}>{a.label}</Link>
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
