// Keterangan warna blok — hanya layar jadwal publik.

/** Tamu belum pernah melihat kalender ini, jadi tiga rupanya dinamai. */
export function Keterangan() {
  const butir: [string, string][] = [
    ["border-foreground bg-background", "Masih ada kursi"],
    ["border-border bg-neutral-surface text-neutral-foreground", "Penuh"],
    ["border-border bg-muted text-muted-foreground", "Sudah lewat atau batal"],
  ];
  return (
    <ul className="flex flex-wrap items-center gap-4">
      {butir.map(([warna, label]) => (
        <li key={label} className="flex items-center gap-2">
          <span className={`inline-block size-4 rounded-sm border ${warna}`} />
          <span className="text-app-body-sm text-muted-foreground">{label}</span>
        </li>
      ))}
    </ul>
  );
}
