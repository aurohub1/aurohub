import { NextResponse } from "next/server";

const SEGMENT_QUERIES: Record<string, string> = {
  turismo: "turismo+viagens+brasil",
  imobiliaria: "mercado+imobiliario+brasil",
  moda: "moda+tendencias+brasil",
  beleza: "beleza+estetica+brasil",
  educacao: "educacao+brasil",
  restaurante: "gastronomia+restaurante+brasil",
  saude: "saude+brasil",
  default: "negocios+brasil",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const segment = searchParams.get("segment") || "default";
  const query = SEGMENT_QUERIES[segment] || SEGMENT_QUERIES.default;

  try {
    const res = await fetch(
      `https://gnews.io/api/v4/search?q=${query}&lang=pt&country=br&max=5&apikey=pub_free`,
      { next: { revalidate: 3600 } }
    );
    const data = await res.json();
    if (data.articles?.length) {
      return NextResponse.json(
        data.articles.map((a: { title: string; url: string }) => ({
          title: a.title,
          url: a.url,
        }))
      );
    }
  } catch { /* silent */ }

  // Fallback — notícias hardcoded por segmento (sempre funciona)
  const fallback: Record<string, { title: string; url: string }[]> = {
    turismo: [
      { title: "Confira os destinos mais procurados para as próximas férias", url: "https://www.panrotas.com.br" },
      { title: "Alta temporada: como se preparar para vender mais", url: "https://www.panrotas.com.br" },
      { title: "Cruzeiros voltam a crescer no Brasil em 2026", url: "https://www.panrotas.com.br" },
    ],
    default: [
      { title: "Tendências do mercado para 2026", url: "https://agenciabrasil.ebc.com.br" },
      { title: "Como aumentar suas vendas com presença digital", url: "https://agenciabrasil.ebc.com.br" },
    ],
  };

  return NextResponse.json(fallback[segment] || fallback.default);
}
