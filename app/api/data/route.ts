export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { cookies } from "next/headers";

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("aurohub_session")?.value;
  if (!token) return null;
  const sb = createServerSupabase();
  const { data } = await sb.from("usuarios").select("id, tipo, marca_id, loja_id").eq("id", token).eq("ativo", true).single();
  return data;
}

// GET /api/data?type=destinos|hoteis|navios|badges|feriados|textos|simbol|imgaviao|icocruise
export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const query = searchParams.get("q") || "";

  const sb = createServerSupabase();

  switch (type) {
    case "destinos": {
      let q = sb.from("imgfundo").select("nome, url").order("nome");
      if (query) q = q.ilike("nome", `%${query}%`);
      const { data, error } = await q;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ items: data || [] });
    }

    case "hoteis": {
      let q = sb.from("imghotel").select("nome, url").order("nome");
      if (query) q = q.ilike("nome", `%${query}%`);
      const { data, error } = await q;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ items: data || [] });
    }

    case "navios": {
      let q = sb.from("imgcruise").select("nome, url, cia").order("nome");
      if (query) q = q.ilike("nome", `%${query}%`);
      const { data, error } = await q;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ items: data || [] });
    }

    case "badges": {
      const { data, error } = await sb.from("badges").select("nome, url").order("nome");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ items: data || [] });
    }

    case "feriados": {
      let q = sb.from("feriados").select("nome, url, loja");
      if (query) q = q.ilike("loja", `%${query}%`);
      const { data, error } = await q.order("nome");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ items: data || [] });
    }

    case "textos": {
      const tipo = searchParams.get("tipo"); // headline, chamada, desconto, all_inclusive, anoiteceu
      let q = sb.from("textos_visuais").select("tipo, texto, url");
      if (tipo) q = q.eq("tipo", tipo);
      const { data, error } = await q;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ items: data || [] });
    }

    case "simbol": {
      const { data, error } = await sb.from("simbol").select("nome, url").order("nome");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ items: data || [] });
    }

    case "imgaviao": {
      const { data, error } = await sb.from("imgaviao").select("url");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ items: data || [] });
    }

    case "icocruise": {
      const { data, error } = await sb.from("icocruise").select("nome, url").order("nome");
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ items: data || [] });
    }

    case "imgfundo": {
      // Busca por hotel ou destino — retorna URLs de fundo
      if (!query) return NextResponse.json({ items: [] });
      const { data: hotelData } = await sb.from("imghotel").select("url").ilike("nome", `%${query}%`);
      const { data: fundoData } = await sb.from("imgfundo").select("url").ilike("nome", `%${query}%`);
      const urls = [
        ...(hotelData || []).map(r => r.url),
        ...(fundoData || []).map(r => r.url),
      ];
      return NextResponse.json({ items: urls });
    }

    default:
      return NextResponse.json({ error: "Tipo inválido. Use: destinos, hoteis, navios, badges, feriados, textos, simbol, imgaviao, icocruise, imgfundo" }, { status: 400 });
  }
}
