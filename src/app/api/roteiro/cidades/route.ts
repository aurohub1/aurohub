import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  const apiKey = process.env.GEOAPIFY_API_KEY;
  if (!apiKey) return NextResponse.json([]);

  const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(q)}&type=city&lang=pt&limit=7&apiKey=${apiKey}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) return NextResponse.json([]);

  const json = await res.json() as { features?: Array<{ properties: Record<string, unknown> }> };
  const data = (json.features ?? []).map(f => ({
    city:      ((f.properties.city ?? f.properties.name) as string) || "",
    country:   (f.properties.country as string) || "",
    formatted: (f.properties.formatted as string) || "",
  }));

  return NextResponse.json(data);
}
