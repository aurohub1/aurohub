import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

interface AnthropicContent { type: string; text?: string }
interface AnthropicResponse { content?: AnthropicContent[] }
interface MsgRow { sender: "user" | "bot" | "human"; content: string }

export async function POST(req: NextRequest) {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!ANTHROPIC_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Ação "escalate": muda status para "human", insere msg de transição e notifica WhatsApp.
    if (body?.action === "escalate") {
      const { ticketId, userName, userRole, licenseeNome, lastMessage } = body;
      if (!ticketId) {
        return NextResponse.json({ error: "ticketId required" }, { status: 400 });
      }
      const { error: upErr } = await sb
        .from("support_tickets")
        .update({ status: "human", unread_adm: true, updated_at: new Date().toISOString() })
        .eq("id", ticketId);
      if (upErr) {
        return NextResponse.json({ error: "DB update failed", detail: upErr.message }, { status: 500 });
      }
      await sb.from("support_messages").insert({
        ticket_id: ticketId,
        sender: "bot",
        content: "Encaminhei pra nossa equipe. Em breve alguém vai responder aqui mesmo.",
      });

      const origin = new URL(req.url).origin;
      fetch(`${origin}/api/support/notify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "escalated",
          userName: userName ?? null,
          userRole: userRole ?? null,
          licenseeNome: licenseeNome ?? null,
          firstMessage: lastMessage ?? null,
        }),
      }).catch((err) => console.warn("[support/bot] notify falhou (silent):", err));

      return NextResponse.json({ ok: true, status: "human" });
    }

    const { ticketId, userMessage, userName, userRole, userPlan } = body;
    if (!ticketId || !userMessage || typeof userMessage !== "string") {
      return NextResponse.json({ error: "ticketId and userMessage required" }, { status: 400 });
    }

    // Salva mensagem do user
    const { error: insertErr } = await sb.from("support_messages").insert({
      ticket_id: ticketId,
      sender: "user",
      content: userMessage,
    });
    if (insertErr) {
      return NextResponse.json({ error: "DB insert failed", detail: insertErr.message }, { status: 500 });
    }

    // Histórico pra contexto (últimas 20 mensagens)
    const { data: history } = await sb
      .from("support_messages")
      .select("sender, content")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true })
      .limit(20);

    const messages = ((history ?? []) as MsgRow[]).map(m => ({
      role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

    const system = `Você é o assistente do Aurohub, plataforma de artes para agências de viagem da Aurovista. Responda sobre: publicar templates, formulários, agendamentos, planos, usuários, lojas. Se não souber com certeza, diga que vai encaminhar para a equipe. Seja direto e simpático em português informal. Usuário: ${userName ?? "(desconhecido)"}, função: ${userRole ?? "(n/a)"}, plano: ${userPlan ?? "(n/a)"}`;

    const aRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        system,
        messages,
      }),
    });

    if (!aRes.ok) {
      const detail = await aRes.text().catch(() => "");
      return NextResponse.json({ error: "Anthropic API failed", detail: detail.slice(0, 400) }, { status: aRes.status });
    }

    const data = (await aRes.json()) as AnthropicResponse;
    const botContent = data.content?.[0]?.text ?? "Desculpe, não consegui processar agora.";

    await sb.from("support_messages").insert({
      ticket_id: ticketId,
      sender: "bot",
      content: botContent,
    });
    await sb.from("support_tickets")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", ticketId);

    return NextResponse.json({ reply: botContent });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
