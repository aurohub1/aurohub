import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

const SYSTEM_PROMPT = `Você é um consultor da Aurovista conduzindo um briefing de implantação.
Seu objetivo é coletar as informações necessárias para configurar a conta
e criar os templates do cliente de forma natural e conversacional.

REGRAS:
- Seja cordial, profissional e objetivo
- Faça UMA pergunta por vez
- Confirme respostas importantes antes de avançar
- Se a resposta estiver vaga, peça esclarecimento
- Não mencione que é uma IA — apenas "consultor Aurovista"
- Ao final, gere um resumo estruturado em JSON

ROTEIRO ADAPTATIVO:

INÍCIO — sempre começar com:
"Olá! Vou fazer algumas perguntas para configurar sua conta e criar seus templates. Vamos começar: como é a estrutura do seu negócio?"
Opções: Unidade única / Rede de lojas próprias / Franqueador / Franqueado

APÓS ESTRUTURA — perguntar segmento:
"Qual é o segmento do seu negócio?"

SE agência de viagens:
- Destinos principais que trabalha
- Tipos de pacote (nacionais, internacionais, cruzeiros, resorts)
- Quantos perfis Instagram conectar
- Como costuma apresentar preço (mensagem WhatsApp, stories, feed)
- Concorrentes ou referências visuais

SE franquia:
- Nome da franquia
- Quantas unidades (se franqueador)
- Templates centralizados ou cada unidade personaliza?
- Manual de marca existe?

SE outro segmento:
- Descreva brevemente o produto ou serviço principal
- Como costuma apresentar preço para o cliente hoje
- Canal principal: WhatsApp, Instagram ou ambos

PARA TODOS:
- Nome da empresa e cidade
- Cores principais da marca (pedir códigos hex ou descrever)
- Tem logo? Pode enviar depois ou descreve
- Formatos que quer usar: Card WhatsApp / Feed Instagram / Stories / Reels / TV / Todos
- Alguma preferência visual (minimalista, colorido, moderno, clássico)
- Algo importante que devemos saber para criar seus templates

FINALIZAÇÃO:
Quando tiver todas as informações, dizer:
"Ótimo! Vou gerar um resumo do seu briefing para você confirmar."
Então retornar o JSON abaixo no campo summary (não exibir o JSON para o cliente).

JSON summary format (retornar exatamente assim, em bloco de código \`\`\`json):
\`\`\`json
{
  "empresa": "", "cidade": "", "segmento": "",
  "estrutura": "unidade|rede|franqueador|franqueado",
  "cores": [], "logo_descricao": "",
  "formatos": [], "estilo_visual": "",
  "produtos_servicos": "", "forma_apresentar_preco": "",
  "redes_sociais": [], "observacoes": "",
  "segmento_especifico": {}
}
\`\`\``;

type MsgRole = "user" | "assistant";
interface Msg { role: MsgRole; content: string; }

function extractSummary(text: string): Record<string, unknown> | null {
  const match = text.match(/```json\s*([\s\S]*?)```/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]) as unknown;
    if (typeof parsed === "object" && parsed !== null && "empresa" in parsed) {
      return parsed as Record<string, unknown>;
    }
  } catch { /* invalid */ }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      token: string;
      message?: string;
      messages?: Msg[];
      start?: boolean;
    };
    const { token, message, messages = [], start } = body;

    if (!token) return NextResponse.json({ error: "token obrigatório" }, { status: 400 });

    const sb = adminDb();
    const { data: briefing } = await sb
      .from("briefings")
      .select("id, status, messages")
      .eq("token", token)
      .maybeSingle();

    if (!briefing) return NextResponse.json({ error: "Briefing não encontrado" }, { status: 404 });

    // Histórico para enviar ao Claude
    const history: Msg[] = start
      ? []
      : [...messages, ...(message ? [{ role: "user" as MsgRole, content: message }] : [])];

    const claudeMessages = history.length > 0 ? history : [{ role: "user" as MsgRole, content: "iniciar" }];

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: claudeMessages,
    });

    const reply = response.content[0].type === "text" ? response.content[0].text : "";

    // Detectar JSON summary
    const summary = extractSummary(reply);
    let newStatus = briefing.status as string;

    if (summary) {
      newStatus = "summary_ready";
      await sb.from("briefings").update({ summary, status: newStatus }).eq("id", briefing.id);
    }

    // Salvar histórico completo
    const updatedMessages: Msg[] = start
      ? [{ role: "assistant", content: reply }]
      : [...history, { role: "assistant", content: reply }];

    await sb.from("briefings").update({
      messages: updatedMessages,
      status: newStatus === "pending" && updatedMessages.length > 0 ? "in_progress" : newStatus,
    }).eq("id", briefing.id);

    // Limpar o JSON do reply exibido ao cliente
    const cleanReply = summary
      ? reply.replace(/```json[\s\S]*?```/g, "").trim()
      : reply;

    return NextResponse.json({
      reply: cleanReply || "Ótimo! Vou gerar um resumo do seu briefing para você confirmar.",
      status: newStatus,
      summary,
    });
  } catch (e) {
    console.error("[Briefing/chat]", e);
    return NextResponse.json({ error: "Erro ao processar mensagem" }, { status: 500 });
  }
}
