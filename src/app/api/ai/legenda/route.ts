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
}

const SYSTEM_PROMPT = `Você é um copywriter de agência de viagens. Gere legendas para Instagram em português brasileiro.
Regras:
- Máximo 280 caracteres
- Use emojis relevantes (✈️🏨🌴☀️🎉)
- Inclua CTA (chamada para ação)
- Tom empolgante mas profissional
- Mencione destino, preço/parcelas se fornecidos
- NÃO use hashtags na legenda (serão adicionadas separadamente)
- Responda APENAS com a legenda, sem explicações`;

function buildPrompt(data: LegendaRequest): string {
  const parts = [`Destino: ${data.destino}`];
  if (data.hotel) parts.push(`Hotel: ${data.hotel}`);
  if (data.servicos) parts.push(`Serviços: ${data.servicos}`);
  if (data.preco) parts.push(`Preço: ${data.preco}`);
  if (data.parcelas) parts.push(`Parcelas: ${data.parcelas}`);
  if (data.datas) parts.push(`Datas: ${data.datas}`);
  if (data.noites) parts.push(`Noites: ${data.noites}`);
  if (data.tipo) parts.push(`Tipo: ${data.tipo}`);
  return `Gere uma legenda para Instagram com base nestes dados:\n${parts.join("\n")}`;
}

/* ── 1. Claude Haiku via Anthropic API ────────────── */
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
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      console.warn("[AI] Claude falhou:", res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const text = data.content?.[0]?.text;
    if (text) {
      console.log("[AI] Claude Haiku respondeu");
      return text.trim();
    }
    return null;
  } catch (err) {
    console.warn("[AI] Claude erro:", err);
    return null;
  }
}

/* ── 2. Ollama local (offline) ────────────────────── */
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
      console.log("[AI] Ollama respondeu");
      return data.response.trim();
    }
    return null;
  } catch {
    console.warn("[AI] Ollama não disponível");
    return null;
  }
}

/* ── 3. Template pré-definido (sempre funciona) ───── */
function templateFallback(data: LegendaRequest): string {
  const templates = [
    `✈️ ${data.destino} te espera! ${data.hotel ? `🏨 ${data.hotel}` : ""} ${data.preco ? `a partir de ${data.preco}` : ""} ${data.parcelas ? `em até ${data.parcelas}` : ""}. Reserve agora! 🌴`,
    `🌴 Que tal ${data.destino}? ${data.noites ? `${data.noites} noites` : ""} ${data.hotel ? `no ${data.hotel}` : ""} ${data.servicos ? `com ${data.servicos}` : ""}. ${data.preco ? `Por apenas ${data.preco}` : "Consulte valores"}! ✈️`,
    `☀️ Seu próximo destino: ${data.destino}! ${data.datas ? `📅 ${data.datas}` : ""} ${data.preco ? `💰 ${data.preco}` : ""} ${data.parcelas ? `(${data.parcelas})` : ""}. Fale conosco! 🎉`,
    `🏖️ ${data.destino} com tudo incluso! ${data.hotel ? `Hotel: ${data.hotel}` : ""} ${data.servicos ? `✅ ${data.servicos}` : ""} ${data.preco ? `• ${data.preco}` : ""}. Garanta sua vaga! ✈️`,
  ];

  const idx = Math.floor(Math.random() * templates.length);
  const legenda = templates[idx].replace(/\s+/g, " ").trim();
  console.log("[AI] Template fallback usado");
  return legenda;
}

/* ── Route handler ────────────────────────────────── */
export async function POST(request: Request) {
  try {
    const data: LegendaRequest = await request.json();

    if (!data.destino) {
      return NextResponse.json({ error: "Destino é obrigatório" }, { status: 400 });
    }

    const prompt = buildPrompt(data);
    let legenda: string | null = null;
    let source = "template";

    // 1ª tentativa: Claude Haiku
    legenda = await tryClaude(prompt);
    if (legenda) { source = "claude"; }

    // 2ª tentativa: Ollama local
    if (!legenda) {
      legenda = await tryOllama(prompt);
      if (legenda) { source = "ollama"; }
    }

    // 3ª tentativa: Template
    if (!legenda) {
      legenda = templateFallback(data);
      source = "template";
    }

    return NextResponse.json({ legenda, source });
  } catch (err) {
    console.error("[AI] Erro geral:", err);
    return NextResponse.json({ error: "Erro ao gerar legenda" }, { status: 500 });
  }
}
