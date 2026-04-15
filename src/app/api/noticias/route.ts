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

interface Noticia { title: string; url: string; image: string | null; source: string; }

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

const TURISMO_FEEDS: { url: string; source: string }[] = [
  { url: "https://www.panrotas.com.br/feed/",                         source: "PANROTAS" },
  { url: "https://embratur.com.br/feed/",                             source: "Embratur" },
  { url: "https://viagemeturismo.abril.com.br/feed/",                 source: "Viagem e Turismo" },
  { url: "https://diariodoturismo.com.br/feed/",                      source: "Diário do Turismo" },
  { url: "https://www.gov.br/turismo/pt-br/assuntos/noticias/RSS",    source: "Gov Turismo" },
  { url: "https://www.mercadoeventos.com.br/feed/",                   source: "Mercado Eventos" },
  { url: "https://passageirodeprimeira.com.br/feed/",                 source: "Passageiro de Primeira" },
];

type NoticiaComData = Noticia & { pubTs: number };

function parseRssItems(xml: string, source: string): NoticiaComData[] {
  const items: NoticiaComData[] = [];
  const itemRegex = /<item\b[\s\S]*?<\/item>/g;
  const itemBlocks = xml.match(itemRegex) ?? [];

  for (const block of itemBlocks) {
    const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
    const enclosureMatch = block.match(/<enclosure[^>]*\btype=["']image\/[^"']+["'][^>]*\burl=["']([^"']+)["']/i)
      ?? block.match(/<enclosure[^>]*\burl=["']([^"']+)["'][^>]*\btype=["']image\//i)
      ?? block.match(/<enclosure[^>]*\burl=["']([^"']+)["']/i);
    const mediaMatch = block.match(/<media:content[^>]*\burl=["']([^"']+)["']/i)
      ?? block.match(/<media:thumbnail[^>]*\burl=["']([^"']+)["']/i);
    const contentEncMatch = block.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/);
    const descImgMatch = block.match(/<description>([\s\S]*?)<\/description>/);
    const pubDateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    let image: string | null = null;
    if (enclosureMatch) image = enclosureMatch[1];
    else if (mediaMatch) image = mediaMatch[1];
    else if (contentEncMatch) {
      const inner = decodeEntities(contentEncMatch[1]);
      const imgTag = inner.match(/<img[^>]*\bsrc=["']([^"']+)["']/i);
      if (imgTag) image = imgTag[1];
    }
    if (!image && descImgMatch) {
      const inner = decodeEntities(descImgMatch[1]);
      const imgTag = inner.match(/<img[^>]*\bsrc=["']([^"']+)["']/i);
      if (imgTag) image = imgTag[1];
    }

    const title = titleMatch ? decodeEntities(titleMatch[1]) : "";
    const url = linkMatch ? decodeEntities(linkMatch[1]) : "";
    if (!title || !url) continue;

    const pubTs = pubDateMatch ? Date.parse(decodeEntities(pubDateMatch[1])) || 0 : 0;
    items.push({ title, url, image, source, pubTs });
  }
  return items;
}

async function fetchOgImage(articleUrl: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 3500);
    const res = await fetch(articleUrl, {
      cache: "no-store",
      signal: ctrl.signal,
      headers: { "user-agent": "Mozilla/5.0 AurohubBot/1.0" },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 60_000);
    const og = html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i)
            ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i)
            ?? html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
    if (!og) return null;
    let url = decodeEntities(og[1]);
    if (url.startsWith("//")) url = "https:" + url;
    else if (url.startsWith("/")) {
      try { url = new URL(url, articleUrl).toString(); } catch { return null; }
    }
    return url;
  } catch {
    return null;
  }
}

async function fetchFeed(url: string, source: string): Promise<NoticiaComData[]> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "user-agent": "Mozilla/5.0 AurohubBot/1.0" },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssItems(xml, source);
  } catch {
    return [];
  }
}

async function hydrateOgImages(items: NoticiaComData[]): Promise<NoticiaComData[]> {
  const jobs = items.map(async (it) => {
    if (it.image) return it;
    const og = await fetchOgImage(it.url);
    return og ? { ...it, image: og } : it;
  });
  return Promise.all(jobs);
}

async function fetchTurismoRss(): Promise<Noticia[]> {
  const results = await Promise.all(TURISMO_FEEDS.map((f) => fetchFeed(f.url, f.source)));
  const all = results.flat();
  all.sort((a, b) => b.pubTs - a.pubTs);
  const top = all.slice(0, 8);
  const hydrated = await hydrateOgImages(top);
  return hydrated.map(({ title, url, image, source }) => ({ title, url, image, source }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const segment = searchParams.get("segment") || "default";
  const query = SEGMENT_QUERIES[segment] || SEGMENT_QUERIES.default;

  // Turismo: sempre tenta RSS primeiro (independente de NEWS_API_KEY)
  if (segment === "turismo") {
    try {
      const rss = await fetchTurismoRss();
      if (rss.length) return NextResponse.json(rss);
    } catch { /* cai pro hardcoded */ }
  }

  // Outros segmentos: NewsAPI como fonte principal
  const apiKey = process.env.NEWS_API_KEY;
  if (apiKey && segment !== "turismo") {
    try {
      const res = await fetch(
        `https://newsapi.org/v2/everything?q=${query}&language=pt&pageSize=5&sortBy=publishedAt&apiKey=${apiKey}`,
        { next: { revalidate: 3600 } }
      );
      const data = await res.json();
      if (data.articles?.length) {
        return NextResponse.json(
          data.articles
            .filter((a: { title: string }) => a.title !== "[Removed]")
            .slice(0, 5)
            .map((a: { title: string; url: string; urlToImage: string; source: { name: string } }) => ({
              title: a.title,
              url: a.url,
              image: a.urlToImage || null,
              source: a.source?.name || "",
            }))
        );
      }
    } catch { /* cai pro hardcoded */ }
  }

  // Fallback final — hardcoded (sem imagem)
  const fallback: Record<string, Noticia[]> = {
    turismo: [
      { title: "Confira os destinos mais procurados para as próximas férias", url: "https://www.panrotas.com.br", image: null, source: "PANROTAS" },
      { title: "Alta temporada: como se preparar para vender mais", url: "https://www.panrotas.com.br", image: null, source: "PANROTAS" },
      { title: "Cruzeiros voltam a crescer no Brasil em 2026", url: "https://www.panrotas.com.br", image: null, source: "PANROTAS" },
    ],
    default: [
      { title: "Tendências do mercado para 2026", url: "https://agenciabrasil.ebc.com.br", image: null, source: "Agência Brasil" },
      { title: "Como aumentar suas vendas com presença digital", url: "https://agenciabrasil.ebc.com.br", image: null, source: "Agência Brasil" },
    ],
  };

  return NextResponse.json(fallback[segment] || fallback.default);
}
