// Hanguskan kredit kedaluwarsa — harian · BR-1.6 · Alur 7.2
// Dipanggil Vercel Cron (vercel.json) atau crontab di VPS:
//   curl -sS -H "Authorization: Bearer \$CRON_SECRET" \$APP_URL/api/cron/hanguskan-kredit

import { pg } from "@/db";
import { hanguskanKredit } from "@/db/job";
import { pastikanCron } from "@/lib/cron";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const tolak = pastikanCron(req);
  if (tolak) return tolak;

  const hasil = await hanguskanKredit(pg, new Date());
  return Response.json({ ok: true, ...hasil });
}
