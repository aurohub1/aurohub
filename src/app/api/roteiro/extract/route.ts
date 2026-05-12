// app/api/roteiro/extract/route.ts
// Extrai SOMENTE dados logísticos de viagem de um voucher/orçamento.
// NUNCA lê CPF, RG, passaporte, endereço residencial, e-mail pessoal.
// O arquivo não é armazenado — vive apenas na memória desta requisição.
// ZDR ativo: Anthropic não retém o conteúdo em logs.

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export interface ExtractedData {
  destination: string;
  days: string;
  travelers: string;
  budget: "Econômico" | "Moderado" | "Luxo" | "Ultra Luxo" | "";
  styles: string[];
  notes: string;
  agencia: string;
  consultor: string;
  telefone: string;
  vooIdaOrigem: string; vooIdaDestino: string; vooIdaData: string;
  vooIdaHorario: string; vooIdaCia: string; vooIdaNum: string;
  vooVoltaOrigem: string; vooVoltaDestino: string; vooVoltaData: string;
  vooVoltaHorario: string; vooVoltaCia: string; vooVoltaNum: string;
  hotel: string; hotelCat: string; checkin: string; checkout: string; quarto: string;
  precoTotal: string; precoPessoa: string; parcelas: string;
  incTransfer: boolean; incCafe: boolean; incSeguro: boolean; incPasseios: boolean;
  ageContext: string;
  obs: string;
}

const EXTRACT_PROMPT = `Você é um sistema de extração de dados logísticos de documentos de viagem.

REGRAS DE PRIVACIDADE — OBRIGATÓRIAS:
- IGNORE completamente: CPF, RG, número de passaporte, título de eleitor, CNH, endereço residencial completo, e-mail pessoal do passageiro, telefone celular pessoal do passageiro.
- NÃO extraia, NÃO mencione, NÃO inclua nenhum dado pessoal identificável dos passageiros.
- Data de nascimento: NÃO retorne a data bruta. Se encontrar, converta para contexto de viagem no campo "ageContext":
    - Criança (0-11 anos) → "criança [N] anos"
    - Adolescente (12-17) → "adolescente [N] anos"
    - Adulto (18-59) → "" (não relevante)
    - Melhor idade (60-74) → "melhor idade 60+"
    - Idoso (75+) → "idoso 75+"
    - Se aniversário cair dentro do período → adicione "aniversário no dia [N] da viagem"

EXTRAIA APENAS dados logísticos:
- Destino, datas de viagem, duração, número de passageiros
- Voos (origem, destino, data, horário, companhia, número)
- Hospedagem (hotel/navio, categoria, check-in, check-out, tipo de quarto/cabine)
- Valores (total, por pessoa, parcelamento)
- O que está incluso (transfer, café da manhã, seguro, passeios)
- Nome da agência e consultor responsável

Responda APENAS com JSON válido, sem markdown, sem texto extra:
{"destination":"","days":"","travelers":"","budget":"","styles":[],"notes":"","agencia":"","consultor":"","telefone":"","vooIdaOrigem":"","vooIdaDestino":"","vooIdaData":"","vooIdaHorario":"","vooIdaCia":"","vooIdaNum":"","vooVoltaOrigem":"","vooVoltaDestino":"","vooVoltaData":"","vooVoltaHorario":"","vooVoltaCia":"","vooVoltaNum":"","hotel":"","hotelCat":"","checkin":"","checkout":"","quarto":"","precoTotal":"","precoPessoa":"","parcelas":"","incTransfer":false,"incCafe":false,"incSeguro":false,"incPasseios":false,"ageContext":"","obs":""}

Regras: days como string numérica, travelers como string, budget um de ["Econômico","Moderado","Luxo","Ultra Luxo"], styles array de ids, datas DD/MM/AAAA, horários HH:MM, preços formato BR. Não encontrado: "" ou false.`;

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });

    const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!ALLOWED.includes(file.type))
      return NextResponse.json({ error: "Formato não suportado. Use PDF, JPG ou PNG." }, { status: 400 });
    if (file.size > 10 * 1024 * 1024)
      return NextResponse.json({ error: "Arquivo muito grande. Máximo 10MB." }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const contentBlock =
      file.type === "application/pdf"
        ? { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64 } }
        : { type: "image" as const, source: { type: "base64" as const, media_type: file.type as "image/jpeg" | "image/png" | "image/webp", data: base64 } };

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: [contentBlock, { type: "text", text: EXTRACT_PROMPT }] }],
    });

    const rawText = response.content.map(b => ("text" in b ? b.text : "")).join("");
    const clean = rawText.replace(/```json|```/g, "").trim();
    const extracted: ExtractedData = JSON.parse(clean);

    const FORBIDDEN = ["cpf","rg","passaporte","passport","documento","document","nascimento","birthday","birthdate","email","endereco","address"];
    const safe = Object.fromEntries(
      Object.entries(extracted).filter(([k]) => !FORBIDDEN.some(f => k.toLowerCase().includes(f)))
    ) as ExtractedData;

    return NextResponse.json({ data: safe });
  } catch (err) {
    console.error("[roteiro/extract]", err);
    return NextResponse.json({
      error: "Erro ao processar arquivo.",
      detail: String(err),
      stack: err instanceof Error ? err.stack : undefined,
    }, { status: 500 });
  }
}
