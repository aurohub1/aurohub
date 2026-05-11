import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";

// Requer que as colunas fb_page_id (TEXT) e fb_page_access_token (TEXT) existam
// em instagram_credentials. Migration:
//   ALTER TABLE instagram_credentials
//     ADD COLUMN IF NOT EXISTS fb_page_id TEXT,
//     ADD COLUMN IF NOT EXISTS fb_page_access_token TEXT;

export async function POST(req: NextRequest) {
  try {
    const { store_id, fb_page_id, fb_page_access_token } = await req.json();
    if (!store_id || !fb_page_id || !fb_page_access_token) {
      return NextResponse.json(
        { error: "store_id, fb_page_id e fb_page_access_token são obrigatórios" },
        { status: 400 }
      );
    }

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
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "adm") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { error } = await sb
      .from("instagram_credentials")
      .update({ fb_page_id, fb_page_access_token })
      .eq("store_id", store_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
