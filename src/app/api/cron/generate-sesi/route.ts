// Generate sesi — harian · BR-7.1 · Alur 7.3
// Dipanggil Vercel Cron (vercel.json) atau crontab di VPS:
//   curl -sS -H "Authorization: Bearer \$CRON_SECRET" \$APP_URL/api/cron/generate-sesi

import { pg } from "@/db";
import { generateSesi } from "@/db/job";
import { pastikanCron } from "@/lib/cron";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const tolak = pastikanCron(req);
  if (tolak) return tolak;

  const hasil = await generateSesi(pg, new Date());
  return Response.json({ ok: true, ...hasil });
}
