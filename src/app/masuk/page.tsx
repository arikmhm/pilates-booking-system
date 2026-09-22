// Login demo — 02-rules.md bagian 5: "Demo: tombol Masuk sebagai…".
// Bukan autentikasi. Diganti magic link saat versi real dibangun.

import { redirect } from "next/navigation";
import { pg } from "@/db";
import { masukSebagai } from "@/lib/masuk";

type Orang = { id: string; nama: string; peran: string; sisa: number };

export const dynamic = "force-dynamic";

export default async function Masuk() {
  const orang = await pg<Orang[]>`
    select u.id, u.nama, u.peran,
           coalesce((
             select sum(cl.delta) from member_packages mp
             join credit_ledger cl on cl.member_package_id = mp.id
             where mp.user_id = u.id and mp.hangus_at > now()
           ), 0)::int as sisa
      from users u
     order by (u.peran = 'member'), u.nama`;

  const staf = orang.filter((o) => o.peran !== "member");
  const member = orang.filter((o) => o.peran === "member");

  async function pilih(formData: FormData) {
    "use server";
    const id = String(formData.get("user_id"));
    await masukSebagai(id);
    // Admin dan owner mendarat di dashboard, member di jadwal. Tanpa ini
    // presenter harus mengetik URL di tengah demo.
    const peran = orang.find((o) => o.id === id)?.peran;
    redirect(peran === "member" || peran === "coach" ? "/jadwal" : "/admin");
  }

  const Baris = ({ o }: { o: Orang }) => (
    <li>
      <form action={pilih}>
        <input type="hidden" name="user_id" value={o.id} />
        <button
          type="submit"
          className="flex min-h-11 w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-muted"
        >
          <span className="text-app-body">{o.nama}</span>
          <span className="text-app-label uppercase text-muted-foreground">
            {o.peran === "member" ? `${o.sisa} kredit` : o.peran}
          </span>
        </button>
      </form>
    </li>
  );

  return (
    <div className="flex min-h-full flex-1 flex-col bg-muted">
      <main className="mx-auto w-full max-w-[34rem] px-gutter py-sedang">
        <p className="text-app-label uppercase tracking-[0.14em] text-muted-foreground">
          Studio Pilates Kenari
        </p>
        <h1 className="mt-1 text-app-title">Masuk sebagai</h1>
        <p className="mt-1 text-app-body-sm text-muted-foreground">
          Mode demo — pilih siapa saja, tanpa kata sandi.
        </p>

        <section className="mt-sedang rounded-md border border-border bg-background">
          <h2 className="border-b border-border px-4 py-3 text-app-label uppercase text-muted-foreground">
            Staf studio
          </h2>
          <ul className="divide-y divide-border">
            {staf.map((o) => (
              <Baris key={o.id} o={o} />
            ))}
          </ul>
        </section>

        <section className="mt-dekat rounded-md border border-border bg-background">
          <h2 className="border-b border-border px-4 py-3 text-app-label uppercase text-muted-foreground">
            Member · {member.length} orang
          </h2>
          <ul className="divide-y divide-border">
            {member.map((o) => (
              <Baris key={o.id} o={o} />
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
