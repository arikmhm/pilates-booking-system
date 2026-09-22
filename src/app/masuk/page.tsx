// Login demo — 02-rules.md bagian 5: "Demo: tombol Masuk sebagai…".
// Bukan autentikasi. Diganti magic link saat versi real dibangun.

import { redirect } from "next/navigation";
import { pg } from "@/db";
import { masukSebagai } from "@/lib/masuk";

export default async function Masuk() {
  const orang = await pg<{ id: string; nama: string; peran: string }[]>`
    select u.id, u.nama, u.peran,
           coalesce((
             select sum(cl.delta) from member_packages mp
             join credit_ledger cl on cl.member_package_id = mp.id
             where mp.user_id = u.id and mp.hangus_at > now()
           ), 0)::int as sisa
      from users u
     order by (u.peran = 'member'), u.nama`;

  async function pilih(formData: FormData) {
    "use server";
    await masukSebagai(String(formData.get("user_id")));
    redirect("/jadwal");
  }

  return (
    <main className="mx-auto w-full max-w-md px-gutter py-md">
      <h1 className="text-app-title">Masuk sebagai</h1>
      <p className="mt-xs text-app-body-sm text-muted-foreground">
        Mode demo — pilih siapa saja, tanpa kata sandi. Staf di atas, member
        di bawahnya.
      </p>

      <ul className="mt-sm divide-y divide-border">
        {orang.map((o) => (
          <li key={o.id}>
            <form action={pilih}>
              <input type="hidden" name="user_id" value={o.id} />
              <button
                type="submit"
                className="flex min-h-11 w-full items-center justify-between gap-4 py-3 text-left"
              >
                <span className="text-app-body">{o.nama}</span>
                <span className="text-app-label uppercase text-muted-foreground">
                  {o.peran}
                </span>
              </button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
