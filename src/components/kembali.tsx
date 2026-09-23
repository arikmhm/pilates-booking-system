"use client";

// Tombol kembali ke halaman SEBELUMNYA, bukan satu tujuan tetap: layar detail
// paling sering dibuka dari direktori member atau daftar peserta, dan kembali
// ke dashboard menghilangkan kata pencarian serta halaman yang tadi dibuka.
// `cadangan` dipakai kalau riwayatnya kosong (tautan dari WA, tab baru).

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
