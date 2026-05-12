import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 90;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { destination, days } = await req.json() as { destination: string; days: number };

    const prompt = `Crie um Guia do Destino completo para: **${destination}** (${days} dias).

### Como Chegar
- Aeroportos de embarque no Brasil (principais cidades) e companhias aéreas
- Conexões principais e tempo de voo estimado
- Transfer do aeroporto ao hotel/centro

### Deslocamentos Internos
- Meios de transporte disponíveis (metrô, ônibus, táxi, app, aluguel de carro)
- Estimativas de preço e dicas práticas de mobilidade local

${days > 2 ? `### Deslocamentos Entre Cidades/Regiões
- Como se locomover entre os diferentes pontos do destino
- Distâncias e tempo estimado entre regiões principais

` : ""}### Bairros e Regiões
- Principais bairros com descrição do que há em cada um
- Pontos turísticos e experiências de destaque por bairro
- Onde se hospedar conforme o perfil do viajante

### Informações Essenciais
- Moeda local, câmbio e dicas de pagamento
- Idioma(s) e frases úteis
- Fuso horário (diferença em relação a Brasília)
- Clima e melhor época para visitar
- Tipo de tomada elétrica

### Dicas Práticas
- Segurança e cuidados gerais
- Etiqueta local e costumes importantes
- O que levar na mala para este destino
- Apps e sites úteis para o viajante

Escreva em português brasileiro. Tom profissional e informativo, adequado para um consultor de viagens apresentar ao cliente.`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    return NextResponse.json({ text });
  } catch (err) {
    console.error("[guia]", err);
    return NextResponse.json({ error: "Erro ao gerar guia" }, { status: 500 });
  }
}
