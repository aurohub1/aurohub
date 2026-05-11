// app/api/roteiro/generate/route.ts
// Gera roteiro de viagem via streaming SSE.

import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const maxDuration = 120;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const STYLES_MAP: Record<string, string> = {
  cultural: "Cultural", aventura: "Aventura", relaxamento: "Relaxamento",
  gastronomia: "Gastronomia", romantico: "Romântico", familia: "Família",
  cruzeiro: "Cruzeiro", ecoturismo: "Ecoturismo", religioso: "Religioso",
  negocios: "Negócios", mochileiro: "Mochileiro", luxo: "Ultra Luxo",
};

function buildPrompt(body: Record<string, unknown>): string {
  const {
    destination, days, travelers, budget, styles = [], notes, ageContext,
    agencia, consultor,
    vooIdaOrigem, vooIdaDestino, vooIdaData, vooIdaHorario, vooIdaCia, vooIdaNum,
    vooVoltaOrigem, vooVoltaDestino, vooVoltaData, vooVoltaHorario,
    hotel, hotelCat, checkin, checkout, quarto,
    incTransfer, incCafe, incSeguro, incPasseios, obs,
  } = body as Record<string, string | boolean | string[]>;

  const stylesArr = styles as string[];
  const ageCtx = (ageContext as string) ?? "";
  const styleLabels = stylesArr.map(s => STYLES_MAP[s]).filter(Boolean).join(", ");
  const isCruzeiro = stylesArr.includes("cruzeiro");
  const isEco = stylesArr.includes("ecoturismo");

  const pkgLines = [
    vooIdaOrigem && `- Voo ida: ${vooIdaOrigem} → ${vooIdaDestino}, ${vooIdaData} ${vooIdaHorario}, ${vooIdaCia} ${vooIdaNum}`,
    vooVoltaOrigem && `- Voo volta: ${vooVoltaOrigem} → ${vooVoltaDestino}, ${vooVoltaData} ${vooVoltaHorario}`,
    hotel && `- Hospedagem: ${hotel}${hotelCat ? ` (${hotelCat}★)` : ""}, check-in ${checkin}, check-out ${checkout}${quarto ? `, ${quarto}` : ""}`,
    [incTransfer && "transfer", incCafe && "café da manhã", incSeguro && "seguro viagem", incPasseios && "passeios"].filter(Boolean).join(", "),
    obs && `- Obs: ${obs}`,
  ].filter(Boolean);

  const ageCtxLine = ageCtx ? `\nPerfil dos viajantes: ${ageCtx}` : "";
  const cruzCtx = isCruzeiro ? "\n\nROTEIRO DE CRUZEIRO: cada dia inclua porto de escala, horário de atracação/partida, principais atrações em terra, excursões opcionais e experiência a bordo." : "";
  const ecoCtx = isEco ? "\n\nECOTURISMO: priorize trilhas (nível de dificuldade), fauna/flora endêmica, comunidades locais, práticas sustentáveis." : "";
  const ageRules = ageCtx ? `\n\nCONSIDERE O PERFIL (${ageCtx}):
${ageCtx.includes("criança") ? "- Atividades adequadas para crianças, ritmo pausado, atrações interativas" : ""}
${ageCtx.includes("idoso") || ageCtx.includes("melhor idade") ? "- Ritmo tranquilo, menos caminhada, acessibilidade" : ""}
${ageCtx.includes("aniversário") ? "- Sugira algo especial no dia mencionado do roteiro" : ""}`.replace(/\n- \n/g, "\n") : "";

  return `Você é um especialista em turismo premium. Crie um roteiro detalhado de viagem:

Destino: ${destination as string}
Duração: ${days as string} dias | Viajantes: ${travelers as string} | Orçamento: ${budget as string}
Estilo: ${styleLabels || "Geral"}${ageCtxLine}
${notes ? `Observações do cliente: ${notes as string}` : ""}
${pkgLines.length > 0 ? `\nDados do pacote:\n${pkgLines.join("\n")}` : ""}
${agencia ? `\nAgência: ${agencia as string}${consultor ? " · " + (consultor as string) : ""}` : ""}
${cruzCtx}${ecoCtx}${ageRules}

Formato OBRIGATÓRIO:
Dia 1: [Título temático do dia]
- [Atividade manhã com nome real do local e dica prática]
- [Atividade tarde com nome real]
- [Sugestão gastronômica: nome do restaurante + prato recomendado]

Dia 2: [Título]
- ...

(Continue para TODOS os ${days as string} dias)

Dicas Essenciais:
- [4 dicas práticas e específicas sobre ${destination}]

Use NOMES REAIS de locais, restaurantes e atrações. Português brasileiro. Seja específico e útil.`; // eslint-disable-line
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Não autorizado", { status: 401 });

  const body = await req.json();
  const prompt = buildPrompt(body);
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = anthropic.messages.stream({
          model: "claude-sonnet-4-20250514",
          max_tokens: 3000,
          messages: [{ role: "user", content: prompt }],
        });
        for await (const event of anthropicStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        console.error("[roteiro/generate]", err);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Erro ao gerar roteiro." })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
