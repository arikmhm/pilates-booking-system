// Keterangan warna blok kalender — hanya dipakai layar jadwal publik.
//
// Kerangkanya sendiri sudah pindah ke `components/rangka-publik.tsx` begitu
// halaman kedua (katalog paket) memakainya.

/**
 * Keterangan warna blok — DS-14 menuntut tiap blok berteks, tapi tamu belum
 * pernah melihat kalender ini sebelumnya dan tetap perlu tahu tiga rupa itu
 * berarti apa sebelum membacanya satu per satu.
 */
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
