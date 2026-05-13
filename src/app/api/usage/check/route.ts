import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function todayPeriod() { return `daily:${new Date().toISOString().slice(0, 10)}`; }
function monthPeriod() { return `monthly:${new Date().toISOString().slice(0, 7)}`; }

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const metric      = searchParams.get("metric") ?? "";
  const licensee_id = searchParams.get("licensee_id") ?? "";
  const store_id    = searchParams.get("store_id") ?? null;

  if (!metric || !licensee_id) {
    return NextResponse.json({ error: "metric e licensee_id obrigatórios" }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // ── Determinar limit + period (igual ao increment) ────────────────────────
  let limitValue = -1;
  let period     = "";

  if (metric === "feed_reels" || metric === "stories") {
    period = todayPeriod();
    const { data: lic } = await admin
      .from("licensees").select("plan").eq("id", licensee_id).single();
    const slug = (lic as { plan?: string } | null)?.plan;
    if (slug) {
      const { data: plan } = await admin
        .from("plans")
        .select("max_feed_reels_day, max_stories_day")
        .eq("slug", slug)
        .single();
      const p = plan as { max_feed_reels_day?: number | null; max_stories_day?: number | null } | null;
      limitValue = metric === "feed_reels"
        ? (p?.max_feed_reels_day ?? -1)
        : (p?.max_stories_day   ?? -1);
    }
  } else if (metric === "roteiros") {
    period = monthPeriod();
    const { data: addon } = await admin
      .from("add_ons").select("limit_per_month").eq("slug", "roteiro").maybeSingle();
    limitValue = (addon as { limit_per_month?: number } | null)?.limit_per_month ?? 20;
  } else {
    period = "fixed";
  }

  // ── Ler counter ──────────────────────────────────────────────────────────
  const q = admin
    .from("usage_counters")
    .select("count, limit_value")
    .eq("licensee_id", licensee_id)
    .eq("metric", metric)
    .eq("period", period);

  const { data: row } = store_id
    ? await q.eq("store_id", store_id).maybeSingle()
    : await q.is("store_id", null).maybeSingle();

  const count = (row as { count?: number } | null)?.count ?? 0;
  const limit = limitValue;
  const percent = limit === -1 ? 0 : Math.round((count / limit) * 100);
  const allowed = limit === -1 || count < limit;

  return NextResponse.json({ count, limit, period, percent, allowed });
}
