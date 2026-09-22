// Halaman sementara: bukti token desain terpasang benar.
// Hapus begitu layar M1 (Jadwal) dibuat — docs/02-rules.md bagian 6.1.

const status = [
  ["Terkonfirmasi", "bg-ok-surface text-ok-foreground"],
  ["Waitlist #2", "bg-warn-surface text-warn-foreground"],
  ["Penuh", "bg-neutral-surface text-neutral-foreground"],
  ["Tidak hadir", "bg-danger-surface text-danger-foreground"],
] as const;

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl px-gutter py-md">
      <h1 className="font-serif text-app-title">Studio Pilates</h1>
      <p className="mt-xs text-app-body-sm text-muted-foreground">
        Penyiapan proyek selesai. Layar sebenarnya menyusul.
      </p>

      <div className="mt-md rounded-md border border-border p-4">
        <p className="text-app-label uppercase text-muted-foreground">Sisa kredit</p>
        <p className="text-app-number tabular-nums">6</p>
        <p className="text-app-body-sm text-warn-foreground">Hangus 4 hari lagi</p>
      </div>

      <div className="mt-sm flex flex-wrap gap-2">
        {status.map(([label, warna]) => (
          <span key={label} className={`rounded-full px-3 py-2 text-app-label ${warna}`}>
            {label}
          </span>
        ))}
      </div>

      <button
        type="button"
        className="mt-sm h-12 w-full rounded-sm bg-primary px-9 text-app-label font-medium text-primary-foreground sm:w-auto"
      >
        BOOKING
      </button>
    </main>
  );
}
