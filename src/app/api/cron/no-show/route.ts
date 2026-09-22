// No-show otomatis — tiap jam · BR-6.2 · Alur 7.1
// Dipanggil Vercel Cron (vercel.json) atau crontab di VPS:
//   curl -sS -H "Authorization: Bearer \$CRON_SECRET" \$APP_URL/api/cron/no-show

import { pg } from "@/db";
import { tandaiNoShow } from "@/db/job";
import { pastikanCron } from "@/lib/cron";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const tolak = pastikanCron(req);
  if (tolak) return tolak;

  const hasil = await tandaiNoShow(pg, new Date());
  return Response.json({ ok: true, ...hasil });
}
