"use client";

// Tombol kembali ke halaman SEBELUMNYA, bukan ke satu tujuan tetap.
//
// Sebelumnya tertulis "← Dashboard" dan selalu melempar ke dashboard — padahal
// layar detail ini paling sering dibuka dari direktori member atau dari daftar
// peserta sebuah sesi. Kembali ke dashboard berarti kehilangan tempat, lengkap
// dengan kata pencarian dan halaman yang tadi dibuka.
//
// `history.back()` mengembalikan itu semua. Kalau riwayatnya kosong — tautan
// dibuka langsung dari WhatsApp, atau tab baru — barulah `cadangan` dipakai.

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export function Kembali({ cadangan }: { cadangan: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(cadangan);
      }}
      // DS-11 — target sentuh 44px.
      className="inline-flex min-h-11 items-center gap-1 text-app-body-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ChevronLeft className="size-4" />
      Kembali
    </button>
  );
}
