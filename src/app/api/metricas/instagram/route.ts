import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const paramLicenseeId = req.nextUrl.searchParams.get("licensee_id");

    const cookieStore = await cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile } = await sb
      .from("profiles")
      .select("role, licensee_id")
      .eq("id", user.id)
      .single();

    // ADM pode passar qualquer licensee_id via query param; outros usam o próprio
    const licenseeId = (profile?.role === "adm" && paramLicenseeId)
      ? paramLicenseeId
      : (profile?.licensee_id ?? null);

    if (!licenseeId) {
      return NextResponse.json({ error: "no licensee" }, { status: 403 });
    }

    const { data: cred } = await sb
      .from("instagram_credentials")
      .select("ig_user_id, access_token")
      .eq("licensee_id", licenseeId)
      .limit(1)
      .maybeSingle();

    if (!cred) {
      return NextResponse.json({ reach: 0, impressions: 0, saved: 0, mediaCount: 0, notConfigured: true });
    }

    const mediaRes = await fetch(
      `https://graph.instagram.com/v23.0/${cred.ig_user_id}/media?fields=id,media_type,timestamp&limit=50&access_token=${cred.access_token}`
    );
    if (!mediaRes.ok) {
      return NextResponse.json({ reach: 0, impressions: 0, saved: 0, mediaCount: 0 });
    }
    const mediaData = await mediaRes.json();

    const since30d = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentMedia: Array<{ id: string; media_type: string; timestamp: string }> =
      (mediaData.data ?? []).filter(
        (m: { id: string; media_type: string; timestamp: string }) =>
          m.media_type !== "STORY" && new Date(m.timestamp).getTime() >= since30d
      );

    if (recentMedia.length === 0) {
      return NextResponse.json({ reach: 0, impressions: 0, saved: 0, mediaCount: 0 });
    }

    const sample = recentMedia.slice(0, 20);
    const results = await Promise.allSettled(
      sample.map((m) =>
        fetch(
          `https://graph.instagram.com/v23.0/${m.id}/insights?metric=reach,impressions,saved&access_token=${cred.access_token}`
        ).then((r) => r.json())
      )
    );

    let reach = 0, impressions = 0, saved = 0;
    for (const r of results) {
      if (r.status !== "fulfilled" || !Array.isArray(r.value?.data)) continue;
      for (const metric of r.value.data as Array<{ name: string; values?: Array<{ value: number }>; value?: number }>) {
        const val = metric.values?.[0]?.value ?? metric.value ?? 0;
        if (metric.name === "reach") reach += val;
        else if (metric.name === "impressions") impressions += val;
        else if (metric.name === "saved") saved += val;
      }
    }

    return NextResponse.json({ reach, impressions, saved, mediaCount: recentMedia.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
