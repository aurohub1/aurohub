import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface AnalyzeRequest {
  image: string;
  mediaType?: string;
  width?: number;
  height?: number;
}

const SYSTEM_PROMPT = `Você é um engenheiro de templates de mídia para agências de viagem.
Recebe uma imagem (arte publicitária estática) onde regiões pintadas em VERDE FLUORESCENTE
(tonalidades próximas de #00FF00 / #39FF14) são PLACEHOLDERS de campos dinâmicos.

Sua tarefa é inspecionar a imagem e listar TODOS os elementos do template:
1) Para cada região verde: inferir o bind provável (destino, preco, parcelas, hotel, dataida,
   datavolta, noites, servicos, imgdestino, imghotel, imgloja, loja, agente, fone, titulo,
   subtitulo, texto1, etc.) a partir da posição, proporção e contexto visual.
2) Para textos estáticos visíveis: incluí-los também (bind vazio "" e label descritivo).
3) Sugerir o formType mais provável: pacote, campanha, passagem, cruzeiro, anoiteceu, quatro_destinos.

Coordenadas: sempre em porcentagem (0-100) relativa à imagem original (x, y, w, h).
fontSize: em pixels relativos a uma arte 1080px de largura.
color: hex (#RRGGBB).
type: "text" | "image".

Responda APENAS JSON válido, sem markdown nem comentários, no formato:
{
  "formType": "pacote",
  "format": "stories",
  "elements": [
    { "bind": "destino", "label": "Destino", "type": "text", "x": 10, "y": 20, "w": 80, "h": 8, "fontSize": 64, "color": "#FFFFFF" }
  ]
}`;

function detectFormatFromRatio(width?: number, height?: number): string {
  if (!width || !height) return "feed";
  const ratio = width / height;
  if (ratio < 0.7) return "stories";
  if (ratio < 0.95) return "feed";
  if (ratio < 1.05) return "feed";
  return "tv";
}

export async function POST(request: Request) {
  try {
    const data: AnalyzeRequest = await request.json();
    if (!data.image) {
      return NextResponse.json({ error: "Imagem obrigatória" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY não configurada" }, { status: 500 });
    }

    const base64 = data.image.includes(",") ? data.image.split(",")[1] : data.image;
    const mediaType = data.mediaType || "image/png";
    const formatGuess = detectFormatFromRatio(data.width, data.height);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: base64 },
              },
              {
                type: "text",
                text: `Formato detectado por proporção: ${formatGuess}. Analise a imagem e retorne o JSON.`,
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[analyze-template] Claude erro:", res.status, errText);
      return NextResponse.json({ error: "Falha na análise", detail: errText }, { status: 502 });
    }

    const body = await res.json();
    const raw = body?.content?.[0]?.text ?? "";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

    let parsed: { formType?: string; format?: string; elements?: unknown[] };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Resposta do modelo não é JSON válido", raw }, { status: 502 });
    }

    return NextResponse.json({
      formType: parsed.formType || "pacote",
      format: parsed.format || formatGuess,
      elements: Array.isArray(parsed.elements) ? parsed.elements : [],
    });
  } catch (err) {
    console.error("[analyze-template] erro:", err);
    return NextResponse.json({ error: "Erro ao analisar template" }, { status: 500 });
  }
}
