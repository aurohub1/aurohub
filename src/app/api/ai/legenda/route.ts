import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface LegendaRequest {
  destino: string;
  hotel?: string;
  servicos?: string;
  preco?: string;
  parcelas?: string;
  datas?: string;
  noites?: string;
  tipo?: string;
  formato?: string;
  briefing?: string;
}

/* ── System prompt ───────────────────────────────────────── */

const SYSTEM_PROMPT = `Você é um dos melhores copywriters de turismo do Brasil, especialista em Instagram Reels e marketing de urgência para agências de viagens.

REGRAS INEGOCIÁVEIS:
1. REFERÊNCIA: Se o usuário fornecer uma referência, exemplo ou briefing, USE-O OBRIGATORIAMENTE como base — mantenha o mesmo estilo, estrutura, nível de energia e tipo de linguagem. Apenas substitua os dados pelo destino/oferta atual.
2. PERSUASÃO: Use gatilhos de urgência quando aplicável ("vagas limitadas", "oferta por tempo limitado", "só essa semana", "últimas vagas").
3. TOM: Animado, empolgante e autêntico — como um consultor de viagens apaixonado falando diretamente com o cliente. Nunca genérico ou burocrático.
4. EMOJIS: Use emojis de viagem e do destino ao longo do texto com propósito (✈️ 🌴 🏨 🌅 🎒 🏖️ 🗺️ 💸 🎉 🏝️ 🌊 🦋 etc.) — não mais de 1-2 por linha.
5. ESTRUTURA OBRIGATÓRIA:
   • 1ª linha (hook): frase de impacto de até 125 caracteres que apareça ANTES do "ver mais" no feed
   • Corpo: destino + detalhes da oferta + gatilho emocional (por que ir AGORA)
   • CTA claro e direto: "Chama no Direct! 📩", "Comenta QUERO 👇", "Link na bio 👆", "Manda mensagem agora!"
   • Hashtags: 10 a 20 hashtags relevantes ao destino, tipo de viagem e agência — uma linha separada ao final
6. LIMITE: máximo 2200 caracteres no total (limite do Instagram).
7. IDIOMA: Português brasileiro natural e fluido, sem anglicismos desnecessários.
8. RESPOSTA: Retorne APENAS a legenda final, pronta para colar no Instagram — sem prefácio, sem "Aqui está:", sem aspas, sem markdown.`;

/* ── Monta prompt do usuário ─────────────────────────────── */

function buildPrompt(data: LegendaRequest): string {
  const linhas: string[] = [`DESTINO: ${data.destino}`];
  if (data.hotel)    linhas.push(`Hotel / Acomodação: ${data.hotel}`);
  if (data.servicos) linhas.push(`Incluso / Serviços: ${data.servicos}`);
  if (data.preco)    linhas.push(`Preço: ${data.preco}`);
  if (data.parcelas) linhas.push(`Parcelamento: ${data.parcelas}`);
  if (data.datas)    linhas.push(`Período / Datas: ${data.datas}`);
  if (data.noites)   linhas.push(`Duração: ${data.noites} noites`);
  if (data.tipo)     linhas.push(`Tipo de publicação: ${data.tipo}`);
  if (data.formato)  linhas.push(`Formato: ${data.formato}`);

  const dadosStr = linhas.join("\n");

  if (data.briefing?.trim()) {
    return `Dados da oferta:\n${dadosStr}\n\n---\nREFERÊNCIA / EXEMPLO DO USUÁRIO (siga este estilo obrigatoriamente):\n"""\n${data.briefing.trim()}\n"""\n\nGere a legenda para Instagram seguindo o estilo, estrutura e tom da referência acima, adaptada para os dados desta oferta. Inclua hashtags no final.`;
  }

  return `Dados da oferta:\n${dadosStr}\n\nGere uma legenda persuasiva e animada para Instagram${data.formato === "reels" || data.tipo?.toLowerCase().includes("reels") ? " Reels" : ""} desta oferta de viagem. Hook impactante na 1ª linha, detalhes da oferta, urgência, CTA claro e hashtags relevantes no final.`;
}

/* ── Claude via Anthropic API ────────────────────────────── */

async function tryClaude(prompt: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250514",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      console.warn("[AI/legenda] Claude falhou:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (text) {
      console.log("[AI/legenda] Claude Sonnet respondeu");
      return text.trim();
    }
    return null;
  } catch (err) {
    console.warn("[AI/legenda] Claude erro:", err);
    return null;
  }
}

/* ── Ollama local (fallback offline) ─────────────────────── */

async function tryOllama(prompt: string): Promise<string | null> {
  try {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3",
        prompt: `${SYSTEM_PROMPT}\n\n${prompt}`,
        stream: false,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data.response) {
      console.log("[AI/legenda] Ollama respondeu");
      return data.response.trim();
    }
    return null;
  } catch {
    return null;
  }
}

/* ── Template fallback (sempre funciona) ─────────────────── */

function templateFallback(data: LegendaRequest): string {
  const isReels = data.formato === "reels" || data.tipo?.toLowerCase().includes("reels");
  const urgencia = isReels ? "🔥 OFERTA LIMITADA! " : "";
  const partes = [
    `${urgencia}✈️ ${data.destino} te espera!`,
    data.hotel    ? `🏨 ${data.hotel}` : "",
    data.servicos ? `✅ ${data.servicos}` : "",
    data.preco    ? `💸 A partir de ${data.preco}` : "",
    data.parcelas ? `📆 ${data.parcelas}` : "",
    data.datas    ? `📅 ${data.datas}` : "",
    "",
    "👇 Comenta QUERO ou chama no Direct!",
    "",
    `#${data.destino.replace(/\s+/g, "").toLowerCase()} #viagem #turismo #agenciadeviagens #pacotedeviagem #viajemais #destinosbrasil #ferias #viajandopelomundo #travelbrasil`,
  ].filter(Boolean);

  console.log("[AI/legenda] Template fallback usado");
  return partes.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/* ── Route handler ───────────────────────────────────────── */

export async function POST(request: Request) {
  try {
    const data: LegendaRequest = await request.json();

    if (!data.destino) {
      return NextResponse.json({ error: "Destino é obrigatório" }, { status: 400 });
    }

    const prompt = buildPrompt(data);
    let legenda: string | null = null;
    let source = "template";

    legenda = await tryClaude(prompt);
    if (legenda) { source = "claude"; }

    if (!legenda) {
      legenda = await tryOllama(prompt);
      if (legenda) { source = "ollama"; }
    }

    if (!legenda) {
      legenda = templateFallback(data);
      source = "template";
    }

    return NextResponse.json({ legenda, source });
  } catch (err) {
    console.error("[AI/legenda] Erro geral:", err);
    return NextResponse.json({ error: "Erro ao gerar legenda" }, { status: 500 });
  }
}
