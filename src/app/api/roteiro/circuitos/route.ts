import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const q      = req.nextUrl.searchParams.get("q") ?? "";
    const region = req.nextUrl.searchParams.get("region") ?? "";

    let query = supabase
      .from("operadora_circuitos")
      .select("id, name, days, region, cities, preco_usd, saidas")
      .order("name")
      .limit(20);

    if (q.length >= 2) {
      query = query.ilike("name", `%${q}%`);
    }
    if (region) {
      query = query.eq("region", region);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[circuitos] supabase error:", JSON.stringify(error));
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ circuits: data ?? [] });

  } catch (err) {
    console.error("[circuitos] catch:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
