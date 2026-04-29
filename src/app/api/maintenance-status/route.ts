import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const KEYS = [
  "maintenance_active",
  "maintenance_message",
  "maintenance_scheduled_end",
  "maintenance_scheduled_start",
  "maintenance_banner_hours",
  "maintenance_music_url",
  "maintenance_music_volume",
  "maintenance_music_enabled",
];

export async function GET() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await admin
    .from("system_config")
    .select("key,value")
    .in("key", KEYS);

  const m: Record<string, string> = {};
  (data ?? []).forEach((r: { key: string; value: string }) => { m[r.key] = r.value; });

  const scheduledEnd = m["maintenance_scheduled_end"] && m["maintenance_scheduled_end"] !== "null"
    ? m["maintenance_scheduled_end"] : null;
  const scheduledStart = m["maintenance_scheduled_start"] && m["maintenance_scheduled_start"] !== "null"
    ? m["maintenance_scheduled_start"] : null;

  const musicUrl = m["maintenance_music_url"] && m["maintenance_music_url"] !== "null"
    ? m["maintenance_music_url"] : null;

  return NextResponse.json({
    active: m["maintenance_active"] === "true",
    message: m["maintenance_message"] || "Estamos realizando melhorias. Voltamos em breve!",
    scheduledEnd,
    scheduledStart,
    bannerHours: parseInt(m["maintenance_banner_hours"] || "2"),
    musicUrl,
    musicVolume: parseFloat(m["maintenance_music_volume"] || "0.5"),
    musicEnabled: m["maintenance_music_enabled"] === "true",
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
