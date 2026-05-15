import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function POST() {
  const sb = adminClient();
  const { error } = await sb
    .from("profiles")
    .update({ tour_pages: ["desativado"] })
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await sb.from("system_config").upsert({ key: "tour_disabled", value: "true" }, { onConflict: "key" });

  return NextResponse.json({ success: true });
}
