import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  const { origin } = req.nextUrl;

  if (error || !code) {
    return NextResponse.redirect(new URL("/inicio?drive=error", origin));
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${origin}/api/drive/callback`,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || !tokenData.refresh_token) {
    return NextResponse.redirect(new URL("/inicio?drive=error", origin));
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await Promise.all([
    admin.from("system_config").upsert(
      { key: "google_drive_refresh_token", value: tokenData.refresh_token, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    ),
    admin.from("system_config").upsert(
      { key: "drive_token_error", value: "false" },
      { onConflict: "key" }
    ),
  ]);

  return NextResponse.redirect(new URL("/inicio?drive=ok", origin));
}
