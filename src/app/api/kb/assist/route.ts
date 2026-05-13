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

interface RawArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  times_used: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      messages: { role: "user" | "assistant"; content: string }[];
      licensee_id?: string;
    };
    const { messages, licensee_id } = body;

    const sb = adminDb();

    // Build licensee context
    let licenseeContext = "";
    if (licensee_id) {
      const { data: licensee } = await sb
        .from("licensees")
        .select("name, plan, status")
        .eq("id", licensee_id)
        .maybeSingle();
      if (licensee) {
        const { data: stores } = await sb
          .from("stores")
          .select("name")
          .eq("licensee_id", licensee_id);
        const storeNames = (stores ?? []).map((s: { name: string }) => s.name).join(", ") || "nenhuma";
        licenseeContext = `Cliente: ${licensee.name} | Plano: ${licensee.plan} | Status: ${licensee.status} | Lojas: ${storeNames}`;
      }
    }

    // Search KB by last user messages
    const userMsgs = messages.filter((m) => m.role === "user");
    const queryText = userMsgs
      .slice(-3)
      .map((m) => m.content)
      .join(" ")
      .toLowerCase()
      .trim();

    const { data: articles } = await sb
      .from("knowledge_base")
      .select("id, title, content, category, tags, times_used")
      .eq("is_active", true);

    const scored = ((articles ?? []) as RawArticle[]).map((a) => {
      let score = 0;
      if (queryText) {
        if (a.title.toLowerCase().includes(queryText)) score += 3;
        if (a.tags.some((t) => t.toLowerCase().includes(queryText))) score += 2;
        if (a.content.toLowerCase().includes(queryText)) score += 1;
      }
      return { ...a, score };
    });
    scored.sort((a, b) => b.score - a.score || b.times_used - a.times_used);
    const topArticles = scored.slice(0, 3);

    const kbContext =
      topArticles.length > 0
        ? topArticles
            .map((a, i) => `[${i + 1}] ${a.title}\n${a.content}`)
            .join("\n\n")
        : "Nenhum artigo encontrado na KB.";

    const systemPrompt = `Você é um assistente interno da Aurovista ajudando o atendente de suporte.
O atendente vê suas mensagens — o cliente NÃO vê.
Com base na conversa do cliente, forneça:
1. RESUMO: O que o cliente precisa em 1-2 frases técnicas e objetivas
2. RESPOSTA SUGERIDA: Uma resposta pronta e cordial para o atendente enviar ao cliente

Contexto da KB disponível:
${kbContext}

${licenseeContext ? `Perfil do cliente: ${licenseeContext}` : ""}

Seja direto. O atendente é técnico.
Responda EXATAMENTE neste formato JSON (sem markdown, sem bloco de código):
{"summary":"resumo em 1-2 frases","suggested_reply":"texto pronto para o atendente copiar e enviar ao cliente"}`;

    const claudeMessages =
      messages.length > 0
        ? messages
        : [{ role: "user" as const, content: "Olá, preciso de ajuda." }];

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: systemPrompt,
      messages: claudeMessages,
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "{}";
    let parsed: { summary?: string; suggested_reply?: string } = {};
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]) as typeof parsed;
    } catch { /* invalid json — keep defaults */ }

    return NextResponse.json({
      summary: parsed.summary ?? "Não foi possível analisar o problema.",
      articles: topArticles.map((a) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        category: a.category,
        score: a.score,
      })),
      suggested_reply: parsed.suggested_reply ?? "",
    });
  } catch (e) {
    console.error("[KB/assist]", e);
    return NextResponse.json({ error: "Erro ao processar" }, { status: 500 });
  }
}
