// Tutup waitlist yang lewat batas booking — tiap jam · BR-4.6 · Alur 7.4
// Dipanggil Vercel Cron (vercel.json) atau crontab di VPS:
//   curl -sS -H "Authorization: Bearer \$CRON_SECRET" \$APP_URL/api/cron/tutup-waitlist

import { pg } from "@/db";
import { tutupWaitlist } from "@/db/job";
import { pastikanCron } from "@/lib/cron";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const tolak = pastikanCron(req);
  if (tolak) return tolak;

  const hasil = await tutupWaitlist(pg, new Date());
  return Response.json({ ok: true, ...hasil });
}
