import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:contato@aurovista.com.br";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

interface SendBody {
  userId?: string;          // manda só pro usuário
  userIds?: string[];       // ou pra vários (ex: ADM publica template → todos do licensee)
  title: string;
  body: string;
  url?: string;             // rota pra abrir ao clicar (default "/")
  tag?: string;             // agrupa notificações do mesmo tipo
  icon?: string;
}

export async function POST(request: Request) {
  try {
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return NextResponse.json({ error: "VAPID keys não configuradas" }, { status: 500 });
    }

    const body: SendBody = await request.json();
    if (!body.title || !body.body) {
      return NextResponse.json({ error: "title e body obrigatórios" }, { status: 400 });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const targets: string[] = body.userIds?.length ? body.userIds : body.userId ? [body.userId] : [];
    if (targets.length === 0) {
      return NextResponse.json({ error: "userId ou userIds obrigatório" }, { status: 400 });
    }

    const { data: subs, error } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("user_id", targets);

    if (error) {
      console.error("[push/send] select:", error);
      return NextResponse.json({ error: "Falha ao buscar subs" }, { status: 500 });
    }

    const payload = JSON.stringify({
      title: body.title,
      body: body.body,
      url: body.url || "/",
      tag: body.tag,
      icon: body.icon || "/icon-192.png",
    });

    let sent = 0;
    let failed = 0;
    const expiredIds: string[] = [];

    await Promise.all(
      (subs ?? []).map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
          );
          sent++;
        } catch (err) {
          failed++;
          const statusCode = (err as { statusCode?: number }).statusCode;
          // 404/410: subscription expirada/cancelada → remove
          if (statusCode === 404 || statusCode === 410) {
            expiredIds.push(s.id);
          } else {
            console.warn("[push/send] falha:", statusCode, err);
          }
        }
      }),
    );

    if (expiredIds.length > 0) {
      await admin.from("push_subscriptions").delete().in("id", expiredIds);
    }

    return NextResponse.json({ ok: true, sent, failed, cleaned: expiredIds.length });
  } catch (err) {
    console.error("[push/send] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
