import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { triggerAlert80 } from "@/lib/usage-alerts";

export const runtime = "nodejs";

function todayPeriod() { return `daily:${new Date().toISOString().slice(0, 10)}`; }
function monthPeriod() { return `monthly:${new Date().toISOString().slice(0, 7)}`; }

interface Counter { id: string; count: number; alerted_80: boolean; }

export async function POST(req: NextRequest) {
  const body = await req.json() as { metric: string; licensee_id: string; store_id?: string };
  const { metric, licensee_id, store_id = null } = body;

  if (!metric || !licensee_id) {
    return NextResponse.json({ error: "metric e licensee_id obrigatórios" }, { status: 400 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  // ── 1. Determinar limit + period ─────────────────────────────────────────
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

  // ── 2. Ler counter atual (manual select para evitar problema de NULL no upsert) ──
  const q = admin
    .from("usage_counters")
    .select("id, count, alerted_80")
    .eq("licensee_id", licensee_id)
    .eq("metric", metric)
    .eq("period", period);

  const { data: existing } = store_id
    ? await q.eq("store_id", store_id).maybeSingle()
    : await q.is("store_id", null).maybeSingle();

  const row = existing as Counter | null;
  const currentCount = row?.count ?? 0;
  const alerted80    = row?.alerted_80 ?? false;

  // ── 3. Bloqueia se já no limite ──────────────────────────────────────────
  if (limitValue !== -1 && currentCount >= limitValue) {
    return NextResponse.json({
      allowed: false, reason: "limit_reached",
      count: currentCount, limit: limitValue,
    });
  }

  const newCount = currentCount + 1;
  const newAlerted80 = alerted80 || (limitValue !== -1 && (newCount / limitValue) >= 0.8);

  // ── 4. Persistir ─────────────────────────────────────────────────────────
  if (row?.id) {
    await admin
      .from("usage_counters")
      .update({ count: newCount, limit_value: limitValue, alerted_80: newAlerted80, updated_at: new Date().toISOString() })
      .eq("id", row.id);
  } else {
    await admin.from("usage_counters").insert({
      licensee_id,
      store_id: store_id ?? null,
      metric, period,
      count: newCount,
      limit_value: limitValue,
      alerted_80: newAlerted80,
    });
  }

  // ── 5. Disparar alerta 80% se necessário ─────────────────────────────────
  if (!alerted80 && newAlerted80) {
    triggerAlert80(licensee_id, metric, newCount, limitValue).catch(() => {});
  }

  const warning = limitValue !== -1 && newCount >= limitValue ? "limit_reached" : undefined;

  return NextResponse.json({
    allowed: true,
    count: newCount,
    limit: limitValue,
    ...(warning ? { warning } : {}),
  });
}
