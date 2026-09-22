"use client";

// Bulatan status kredit — satu titik berwarna, teksnya pindah ke tooltip.
//
// Ini pelanggaran DS-14 yang disengaja dan diminta: "warna tidak pernah jadi
// satu-satunya penanda". Di kolom tabel yang sempit, chip berteks memakan
// lebar yang lebih berguna untuk nama dan tanggal, dan statusnya toh diulang
// oleh kolom Hangus di sebelahnya.
//
// Yang menahan agar ini tidak jadi informasi-hanya-warna:
//   - `aria-label` membawa teks statusnya ke pembaca layar
//   - tombolnya bisa difokus keyboard, jadi tooltip muncul tanpa tetikus
//   - bentuk cincinnya berbeda per status, bukan cuma isinya
// Lihat DS-37 di docs/07-design.md.

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type StatusKredit = "aman" | "segera" | "kosong";

const GAYA: Record<StatusKredit, string> = {
  // Titik penuh — kredit hidup dan masih lama.
  aman: "bg-ok-foreground",
  // Titik penuh BERLINGKAR: massa visualnya paling besar, jadi mata
  // menemukannya lebih dulu tanpa perlu warna yang lebih menjerit.
  segera: "bg-warn-foreground ring-4 ring-warn-surface",
  // Abu penuh, bukan cincin kosong. Di seed ini 30 dari 40 member berstatus
  // begini; cincin samar sebanyak itu terbaca sebagai gagal render, bukan
  // sebagai status.
  kosong: "bg-border",
};

export function StatusKredit({
  status,
  judul,
}: {
  status: StatusKredit;
  judul: string;
}) {
  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger
          // DS-11 — target sentuh 44px meski titiknya cuma 10px.
          className="inline-flex size-11 items-center justify-center"
          aria-label={judul}
        >
          <span className={`block size-2.5 rounded-full ${GAYA[status]}`} />
        </TooltipTrigger>
        <TooltipContent side="right">{judul}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
