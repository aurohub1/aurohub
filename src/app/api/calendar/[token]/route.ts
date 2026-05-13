import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function fmtDt(d: Date): string {
  return d.toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
}

function fmtDate(iso: string): string {
  return iso.replace(/-/g, "");
}

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token: rawToken } = await params;
  const calToken = rawToken.replace(/\.ics$/i, "");

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data: store } = await sb
    .from("stores")
    .select("id, name, licensee_id")
    .eq("calendar_token", calToken)
    .single();

  if (!store) {
    return new NextResponse("Token inválido", { status: 404 });
  }

  const now = new Date();
  const future = new Date(now);
  future.setMonth(future.getMonth() + 3);
  const past = new Date(now);
  past.setMonth(past.getMonth() - 6);

  const [postsRes, lemRes, dcRes] = await Promise.all([
    sb
      .from("scheduled_posts")
      .select("id, scheduled_at, format")
      .eq("store_id", store.id)
      .eq("status", "pending")
      .gte("scheduled_at", now.toISOString())
      .lte("scheduled_at", future.toISOString()),

    sb
      .from("lembretes")
      .select("id, data_iso, texto")
      .eq("licensee_id", store.licensee_id)
      .or(`store_id.eq.${store.id},visibilidade.eq.todas`)
      .gte("data_iso", past.toISOString().slice(0, 10))
      .lte("data_iso", future.toISOString().slice(0, 10)),

    sb
      .from("datas_comemorativas")
      .select("id, nome, data_mes, data_dia"),
  ]);

  const year = now.getFullYear();
  const events: string[] = [];

  for (const p of postsRes.data ?? []) {
    const dt = new Date(p.scheduled_at);
    const end = new Date(dt.getTime() + 30 * 60 * 1000);
    events.push(
      "BEGIN:VEVENT\r\n" +
      `DTSTART:${fmtDt(dt)}\r\n` +
      `DTEND:${fmtDt(end)}\r\n` +
      `SUMMARY:${esc(`Postagem agendada${p.format ? `: ${p.format}` : ""}`)}\r\n` +
      `UID:sched-${p.id}@aurohub\r\n` +
      "STATUS:TENTATIVE\r\n" +
      "END:VEVENT"
    );
  }

  for (const l of lemRes.data ?? []) {
    const d = fmtDate(l.data_iso);
    events.push(
      "BEGIN:VEVENT\r\n" +
      `DTSTART;VALUE=DATE:${d}\r\n` +
      `DTEND;VALUE=DATE:${d}\r\n` +
      `SUMMARY:${esc(l.texto)}\r\n` +
      `UID:lem-${l.id}@aurohub\r\n` +
      "END:VEVENT"
    );
  }

  for (const dc of dcRes.data ?? []) {
    for (const y of [year, year + 1]) {
      const d = `${y}${String(dc.data_mes).padStart(2, "0")}${String(dc.data_dia).padStart(2, "0")}`;
      events.push(
        "BEGIN:VEVENT\r\n" +
        `DTSTART;VALUE=DATE:${d}\r\n` +
        `DTEND;VALUE=DATE:${d}\r\n` +
        `SUMMARY:${esc(dc.nome)}\r\n` +
        `UID:dc-${dc.id}-${y}@aurohub\r\n` +
        "END:VEVENT"
      );
    }
  }

  const cal = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Aurohub//AuroCalendar//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:Aurohub - ${esc(store.name)}`,
    "X-WR-TIMEZONE:America/Sao_Paulo",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  return new NextResponse(cal, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="aurohub.ics"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
