import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Check maintenance_active
  const { data: cfg } = await admin
    .from("system_config")
    .select("value")
    .eq("key", "maintenance_active")
    .single();

  if (cfg?.value !== "true") {
    return NextResponse.json({ shouldRedirect: false }, { headers: { "Cache-Control": "no-store" } });
  }

  // Parse cookies from forwarded header
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = cookieHeader.split(";").map((c) => {
    const [name, ...rest] = c.trim().split("=");
    return { name: name.trim(), value: rest.join("=") };
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookies; },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ shouldRedirect: true }, { headers: { "Cache-Control": "no-store" } });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return NextResponse.json(
    { shouldRedirect: profile?.role !== "adm" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
