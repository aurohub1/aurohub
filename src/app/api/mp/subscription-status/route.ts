import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "adm" && profile?.role !== "operador") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const licenseeId = req.nextUrl.searchParams.get("licensee_id");
  if (!licenseeId) return NextResponse.json({ error: "licensee_id obrigatório" }, { status: 400 });

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: sub } = await sb
    .from("subscriptions")
    .select("id, plan_slug, billing_cycle, price_monthly, status, mp_subscription_id, created_at")
    .eq("licensee_id", licenseeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ subscription: sub ?? null });
}
