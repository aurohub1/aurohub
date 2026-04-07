export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";

interface LegendaInput {
  destino: string;
  ida?: string;
  volta?: string;
  noites?: string;
  servicos?: string;
  parcelas_qtd?: string;
  parcela_int?: string;
  parcela_cent?: string;
  total?: string;
  badge?: string;
}

const SYSTEM_PROMPT = `Você é um copywriter especialista em viagens para Instagram.
Gere uma legenda curta, atraente e com emojis para um post de agência de viagens.
A legenda deve ter no máximo 5 linhas, incluir call-to-action e hashtags relevantes.
Responda APENAS com a legenda, sem explicações.`;

function buildUserPrompt(input: LegendaInput): string {
  const parts: string[] = [`Destino: ${input.destino}`];
  if (input.ida) parts.push(`Ida: ${input.ida}`);
  if (input.volta) parts.push(`Volta: ${input.volta}`);
  if (input.noites) parts.push(`${input.noites} noites`);
  if (input.servicos) parts.push(`Serviços: ${input.servicos}`);
  if (input.parcelas_qtd && input.parcela_int) {
    parts.push(`Preço: ${input.parcelas_qtd} de R$ ${input.parcela_int},${input.parcela_cent || "00"}`);
  }
  if (input.total) parts.push(`Total: ${input.total}`);
  if (input.badge) parts.push(`Destaque: ${input.badge}`);
  return `Gere uma legenda para Instagram com estes dados:\n${parts.join("\n")}`;
}

function gerarTemplate(input: LegendaInput): string {
  const preco = input.parcela_int
    ? `${input.parcelas_qtd || "10x"} de R$ ${input.parcela_int},${input.parcela_cent || "00"}`
    : "";

  const datas = input.ida
    ? `${input.ida}${input.volta ? ` a ${input.volta}` : ""}${input.noites ? ` • ${input.noites} noites` : ""}`
    : "";

  const servicos = input.servicos
    ? `✅ ${input.servicos.split(",").map(s => s.trim()).join(" • ")}`
    : "";

  const badge = input.badge ? `🔥 ${input.badge}!` : "";

  const lines = [
    `✈️ ${input.destino.toUpperCase()}`,
    badge,
    datas ? `📅 ${datas}` : "",
    preco ? `💰 A partir de ${preco}` : "",
    input.total ? `Ou ${input.total} à vista` : "",
    servicos,
    "",
    "📩 Solicite seu orçamento agora!",
    "",
    `#${input.destino.replace(/\s+/g, "")} #viagem #pacotedeviagem #turismo #ferias`,
  ];

  return lines.filter(l => l !== "").join("\n");
}

// 1. Tentar Claude Haiku
async function tryClaudeHaiku(prompt: string): Promise<string | null> {
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
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const text = data.content?.[0]?.text;
    return text || null;
  } catch {
    return null;
  }
}

// 2. Tentar Ollama local
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
    return data.response || null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const input: LegendaInput = await request.json();

    if (!input.destino) {
      return NextResponse.json({ error: "Destino obrigatório" }, { status: 400 });
    }

    const userPrompt = buildUserPrompt(input);
    let legenda: string | null = null;
    let fonte: "claude" | "ollama" | "template" = "template";

    // 1. Claude Haiku
    legenda = await tryClaudeHaiku(userPrompt);
    if (legenda) {
      fonte = "claude";
    } else {
      // 2. Ollama local
      legenda = await tryOllama(userPrompt);
      if (legenda) {
        fonte = "ollama";
      } else {
        // 3. Template pré-definido
        legenda = gerarTemplate(input);
        fonte = "template";
      }
    }

    return NextResponse.json({ legenda, fonte });
  } catch {
    return NextResponse.json({ error: "Erro ao gerar legenda" }, { status: 500 });
  }
}
