import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface SubscribeBody {
  userId: string;
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
  userAgent?: string;
}

export async function POST(request: Request) {
  try {
    const body: SubscribeBody = await request.json();
    if (!body.userId || !body.subscription?.endpoint || !body.subscription?.keys?.p256dh || !body.subscription?.keys?.auth) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { error } = await admin
      .from("push_subscriptions")
      .upsert(
        {
          user_id: body.userId,
          endpoint: body.subscription.endpoint,
          p256dh: body.subscription.keys.p256dh,
          auth: body.subscription.keys.auth,
          user_agent: body.userAgent ?? null,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" },
      );

    if (error) {
      console.error("[push/subscribe] upsert:", error);
      return NextResponse.json({ error: "Falha ao salvar" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push/subscribe] erro:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { endpoint } = await request.json();
    if (!endpoint) return NextResponse.json({ error: "endpoint obrigatório" }, { status: 400 });

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    await admin.from("push_subscriptions").delete().eq("endpoint", endpoint);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push/subscribe] DELETE:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
