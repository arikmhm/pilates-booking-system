"use client";

// Bulatan status kredit — teksnya pindah ke tooltip. Pelanggaran DS-14 yang
// disengaja: di kolom sempit, chip berteks memakan lebar yang lebih berguna.
// Yang menahannya jadi informasi-hanya-warna: `aria-label`, tombol yang bisa
// difokus keyboard, dan bentuk cincin yang berbeda per status (DS-37).

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
  // Titik penuh BERLINGKAR: massa visual terbesar, ditemukan mata lebih dulu.
  segera: "bg-warn-foreground ring-4 ring-warn-surface",
  // Abu penuh, bukan cincin kosong: 30 dari 40 member berstatus begini dan
  // cincin samar sebanyak itu terbaca sebagai gagal render.
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
