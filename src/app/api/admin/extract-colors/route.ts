import { NextResponse } from "next/server";
import sharp from "sharp";

export async function POST(request: Request) {
  try {
    const { logoUrl } = await request.json();
    if (!logoUrl) return NextResponse.json({ error: "URL obrigatória" }, { status: 400 });

    // Busca a imagem server-side (sem CORS)
    const res = await fetch(logoUrl);
    if (!res.ok) return NextResponse.json({ error: "Falha ao buscar imagem" }, { status: 400 });

    const buffer = Buffer.from(await res.arrayBuffer());

    // Reduz para 50x50 e extrai pixels
    const { data, info } = await sharp(buffer)
      .resize(50, 50, { fit: "cover" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Conta frequência de cores quantizadas
    const colorMap: Record<string, number> = {};
    for (let i = 0; i < data.length; i += 3) {
      const r = Math.round(data[i] / 32) * 32;
      const g = Math.round(data[i+1] / 32) * 32;
      const b = Math.round(data[i+2] / 32) * 32;
      const key = `${r},${g},${b}`;
      colorMap[key] = (colorMap[key] || 0) + 1;
    }

    const toHex = (k: string) => {
      const [r,g,b] = k.split(",").map(Number);
      return "#" + [r,g,b].map(x => x.toString(16).padStart(2,"0")).join("");
    };

    const sorted = Object.entries(colorMap)
      .sort((a, b) => b[1] - a[1])
      .filter(([k]) => {
        const [r,g,b] = k.split(",").map(Number);
        const max = Math.max(r,g,b), min = Math.min(r,g,b);
        const sat = max === 0 ? 0 : (max-min)/max;
        return sat > 0.2 && max > 40;
      })
      .slice(0, 3)
      .map(([k]) => toHex(k));

    return NextResponse.json({ colors: sorted });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
