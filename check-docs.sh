#!/usr/bin/env bash
# Verifikasi angka yang diklaim dokumen masih cocok dengan isinya.
# Jalankan sebelum commit. Angka di bawah diperbarui bersama dokumennya.
set -u
cd "$(dirname "$0")"
gagal=0

cek() { # nama, harapan, nyata
  if [ "$2" != "$3" ]; then printf 'MELESET  %-18s klaim %s, nyata %s\n' "$1" "$2" "$3"; gagal=1
  else printf 'ok       %-18s %s\n' "$1" "$3"; fi
}

cek "aturan bisnis" 53 "$(grep -cE '^\| [0-9]+\.[0-9]+ \|' docs/02-rules.md)"
cek "use case"      44 "$(grep -cE '^\| UC-'              docs/03-use-cases.md)"
cek "tabel inti"    12 "$(grep -cE '^\| `[a-z_]+` \|'     docs/05-data-model.md)"
cek "alur"          12 "$(grep -c '```mermaid'            docs/04-flows.md)"

# link ke berkas .md yang tidak ada
while read -r src tgt; do
  dir=$(dirname "$src")
  [ -e "$dir/$tgt" ] || { echo "LINK MATI $src -> $tgt"; gagal=1; }
done < <(grep -roE '\]\([^)#]+\.md\)' --include='*.md' \
              --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git . \
         | sed 's/:](/ /; s/)$//' | sed 's/\](/ /' \
         | grep -v ' http')

[ $gagal -eq 0 ] && echo "semua cocok"
exit $gagal
