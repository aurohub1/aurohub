import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET() {
  const admin = adminClient();
  const { data } = await admin
    .from("system_config")
    .select("value")
    .eq("key", "chat_enabled")
    .maybeSingle();

  return NextResponse.json(
    { enabled: data?.value !== "false" },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

export async function PATCH(req: NextRequest) {
  const { enabled } = await req.json() as { enabled: boolean };
  const admin = adminClient();
  const { error } = await admin
    .from("system_config")
    .upsert(
      { key: "chat_enabled", value: enabled ? "true" : "false", updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ enabled });
}
