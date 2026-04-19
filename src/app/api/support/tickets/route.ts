import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

interface Body {
  userId: string;
  licenseeId?: string | null;
  firstMessage: string;
  userName?: string | null;
  userRole?: string | null;
  licenseeNome?: string | null;
}

/**
 * Cria um novo ticket de suporte a partir da primeira mensagem do cliente e
 * dispara notificação WhatsApp via CallMeBot (fire-and-forget).
 *
 * Fluxo:
 *  1. Insere ticket (status="bot")
 *  2. Insere greeting do bot + primeira mensagem do usuário
 *  3. Chama /api/support/notify com type="new_ticket"
 *  4. Retorna { ticketId }
 */
export async function POST(req: NextRequest) {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  try {
    const body = (await req.json()) as Body;
    if (!body.userId || !body.firstMessage?.trim()) {
      return NextResponse.json({ error: "userId e firstMessage obrigatórios" }, { status: 400 });
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: ticket, error: tErr } = await sb
      .from("support_tickets")
      .insert({
        user_id: body.userId,
        licensee_id: body.licenseeId ?? null,
        status: "bot",
        unread_adm: false,
      })
      .select("id")
      .single();

    if (tErr || !ticket) {
      return NextResponse.json({ error: "Falha ao criar ticket", detail: tErr?.message }, { status: 500 });
    }

    const greeting = `Olá ${body.userName ?? "por aí"}! Como posso ajudar? 👋`;
    await sb.from("support_messages").insert({
      ticket_id: ticket.id, sender: "bot", content: greeting,
    });

    // Notify fire-and-forget — não bloqueia a resposta
    const origin = new URL(req.url).origin;
    fetch(`${origin}/api/support/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "new_ticket",
        userName: body.userName ?? null,
        userRole: body.userRole ?? null,
        licenseeNome: body.licenseeNome ?? null,
        firstMessage: body.firstMessage,
      }),
    }).catch((err) => console.warn("[support/tickets] notify falhou (silent):", err));

    return NextResponse.json({ ticketId: ticket.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[support/tickets] erro:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
