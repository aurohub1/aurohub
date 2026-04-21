import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

interface GenerateRuleRequest {
  field: string;
  description: string;
  fieldType?: string;
}

const SYSTEM_PROMPT = `Você converte regras de negócio escritas em português natural para JSON estruturado.
Cada regra tem um "type" e parâmetros específicos.

Tipos disponíveis:
- "format"         → formatação visual (moeda, data, telefone, maiúsculas, etc.)
  params: { pattern: "currency_brl" | "date_br" | "phone_br" | "uppercase" | "lowercase" | "capitalize" }
- "validation"     → validação de valor
  params: { min?: number, max?: number, required?: boolean, regex?: string, message?: string }
- "transform"      → transformação (substring, replace, split, concat)
  params: { operation: "replace"|"substring"|"split"|"concat", ...args }
- "conditional"    → mostrar/ocultar baseado em outro campo
  params: { when: "field_key", equals?: string, notEmpty?: boolean, show?: boolean }
- "compute"        → calcular valor a partir de outro (ex: parcelas = preco / 10)
  params: { from: "field_key", operation: "divide"|"multiply"|"add"|"subtract", value: number }
- "default"        → valor padrão se vazio
  params: { value: string }

Responda APENAS JSON válido, sem markdown, no formato:
{
  "type": "format",
  "params": { "pattern": "currency_brl" },
  "summary": "Formata como moeda BRL"
}`;

export async function POST(request: Request) {
  try {
    const data: GenerateRuleRequest = await request.json();
    if (!data.field || !data.description) {
      return NextResponse.json({ error: "field e description são obrigatórios" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY não configurada" }, { status: 500 });
    }

    const userPrompt = `Campo: ${data.field}${data.fieldType ? ` (tipo: ${data.fieldType})` : ""}
Regra em português: ${data.description}

Gere o JSON da regra.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[generate-rule] Claude erro:", res.status, errText);
      return NextResponse.json({ error: "Falha ao gerar regra", detail: errText }, { status: 502 });
    }

    const body = await res.json();
    const raw = body?.content?.[0]?.text ?? "";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

    let parsed: { type?: string; params?: Record<string, unknown>; summary?: string };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Resposta do modelo não é JSON válido", raw }, { status: 502 });
    }

    return NextResponse.json({
      field: data.field,
      description: data.description,
      rule: {
        type: parsed.type || "format",
        params: parsed.params || {},
        summary: parsed.summary || "",
      },
    });
  } catch (err) {
    console.error("[generate-rule] erro:", err);
    return NextResponse.json({ error: "Erro ao gerar regra" }, { status: 500 });
  }
}
