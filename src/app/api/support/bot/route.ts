import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

interface AnthropicContent { type: string; text?: string }
interface AnthropicResponse { content?: AnthropicContent[] }
interface MsgRow { sender: "user" | "bot" | "human"; message: string }

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
      await sb.from("ticket_messages").insert({
        ticket_id: ticketId,
        sender: "bot",
        message: "Encaminhei pra nossa equipe. Em breve alguém vai responder aqui mesmo.",
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
    const { error: insertErr } = await sb.from("ticket_messages").insert({
      ticket_id: ticketId,
      sender: "user",
      message: userMessage,
    });
    if (insertErr) {
      return NextResponse.json({ error: "DB insert failed", detail: insertErr.message }, { status: 500 });
    }

    // Histórico pra contexto (últimas 20 mensagens)
    const { data: history } = await sb
      .from("ticket_messages")
      .select("sender, message")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true })
      .limit(20);

    const messages = ((history ?? []) as MsgRow[]).map(m => ({
      role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
      content: m.message,
    }));

    const system = `Você é o suporte do Aurohub, plataforma de criação e publicação de artes para agências de viagem, desenvolvida pela Aurovista.

SOBRE O AUROHUB:
- Agências criam artes de viagem (Stories, Feed, Reels, TV, Card WhatsApp) usando templates personalizados
- Publicação direta no Instagram das lojas
- Hierarquia: ADM Aurovista → Cliente (agência) → Unidade (loja/filial) → Consultor/Vendedor
- Planos: Essencial, Pro, Business, Interno (ilimitado para clientes especiais)

FUNCIONALIDADES PRINCIPAIS:
- Publicar: escolher template → preencher formulário (destino, preço, datas, serviços) → gerar arte → publicar ou baixar
- Formulários disponíveis: Pacote, Campanha, Passagem, Cruzeiro, Anoiteceu, Card WhatsApp
- Calendário: ver posts agendados e feriados próximos
- Métricas/Resumo: ver posts publicados por formato e período
- Usuários: gerenciar consultores e permissões por formulário e loja
- Configurações: dados da agência, tema de cores, logo

PROBLEMAS COMUNS E SOLUÇÕES:
- "Não consigo publicar no Instagram": verificar se a permissão 'Pode publicar no Instagram' está ativa nas permissões do usuário
- "Template não aparece": o ADM precisa vincular o template ao cliente; verifique com seu gestor
- "Erro ao salvar": pode ser conexão instável, tente novamente em alguns segundos
- "Não vejo determinado formulário": seu perfil pode não ter permissão para esse formulário, contate seu gestor
- "Como alterar minha senha": acesse Configurações no menu lateral
- "Como adicionar uma loja/unidade": apenas o gestor da conta (perfil Cliente) pode adicionar unidades

REGRAS DE ESCALADA — encaminhe para a equipe humana quando:
- Problema técnico persistente após tentar as soluções básicas
- Dúvida sobre cobrança, plano ou contrato
- Solicitação de novo template ou personalização
- Problema com token do Instagram
- Qualquer situação que você não consiga resolver com certeza

USUÁRIO ATUAL:
- Nome: ${userName ?? "não identificado"}
- Função: ${userRole ?? "não informada"}
- Plano: ${userPlan ?? "não informado"}

Responda sempre em português informal e direto. Máximo 3 parágrafos por resposta. Se não souber com certeza, diga que vai encaminhar para a equipe humana.`;

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

    await sb.from("ticket_messages").insert({
      ticket_id: ticketId,
      sender: "bot",
      message: botContent,
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
