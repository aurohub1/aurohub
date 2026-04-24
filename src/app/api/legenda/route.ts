import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { destino, tipoArte, formato, nomeLoja, tom } = body;

    if (!destino) {
      return NextResponse.json({ error: "Destino é obrigatório" }, { status: 400 });
    }

    const formatoMap: Record<string, string> = {
      stories: "Stories (vertical, rápido, efêmero)",
      feed: "Feed (quadrado/vertical, permanente)",
      reels: "Reels (vertical, vídeo curto)",
      tv: "TV (horizontal, apresentação)",
    };

    const tipoArteMap: Record<string, string> = {
      pacote: "Pacote de viagem completo (hotel + passeios)",
      passagem: "Passagem aérea",
      cruzeiro: "Cruzeiro marítimo",
      campanha: "Campanha promocional",
      anoiteceu: "Última chamada do dia (urgência)",
      card_whatsapp: "Card para WhatsApp",
    };

    const tomMap: Record<string, string> = {
      animado: "animado e empolgante, com emojis e energia",
      profissional: "profissional e informativo, sem emojis excessivos",
      casual: "casual e amigável, tom conversacional",
    };

    const prompt = `Você é um especialista em marketing de turismo e redes sociais. Gere 3 legendas criativas para um post de ${tipoArteMap[tipoArte] || tipoArte} sobre ${destino}.

Contexto:
- Loja: ${nomeLoja || "Agência de viagens"}
- Formato: ${formatoMap[formato] || formato}
- Tom: ${tomMap[tom] || "profissional"}
- Destino: ${destino}

Diretrizes:
- Cada legenda deve ter entre 80-150 caracteres
- Use hashtags relevantes (2-4 por legenda)
- Seja persuasivo e desperte desejo de viajar
- Adapte o tom conforme solicitado
- Inclua call-to-action quando apropriado
- Para formato Stories/Reels: mais direto e urgente
- Para Feed: pode ser mais descritivo e informativo

Retorne APENAS um JSON válido no formato:
{
  "legendas": [
    "legenda 1",
    "legenda 2",
    "legenda 3"
  ]
}`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const textContent = message.content.find((block) => block.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json({ error: "Resposta inválida da IA" }, { status: 500 });
    }

    // Extrair JSON da resposta (pode vir com ```json``` ou direto)
    let jsonText = textContent.text.trim();
    const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/) || jsonText.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonText);

    if (!parsed.legendas || !Array.isArray(parsed.legendas)) {
      return NextResponse.json({ error: "Formato de resposta inválido" }, { status: 500 });
    }

    return NextResponse.json({
      legendas: parsed.legendas.slice(0, 3), // Garantir no máximo 3
    });
  } catch (error) {
    console.error("[API /legenda] Erro:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro ao gerar legendas" },
      { status: 500 }
    );
  }
}
