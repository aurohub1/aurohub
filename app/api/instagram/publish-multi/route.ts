export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { publishToInstagram } from "@/lib/instagram";
import { cookies } from "next/headers";
import { verificarCota, deduzirPack } from "@/lib/cotas";

// GET — listar lojas disponíveis para o usuário publicar
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("aurohub_session")?.value;
  if (!token) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const sb = createServerSupabase();
  const { data: user } = await sb
    .from("usuarios")
    .select("id, tipo, marca_id, loja_id")
    .eq("id", token)
    .eq("ativo", true)
    .single();

  if (!user) return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });

  // ADM vê todas as lojas com IG conectado
  let query = sb
    .from("lojas")
    .select("id, nome, cidade, marca_id, ig_user_id")
    .eq("ativa", true)
    .not("ig_user_id", "is", null)
    .not("ig_access_token", "is", null)
    .order("nome");

  // Filtro por hierarquia
  if (user.tipo === "licenciado" && user.marca_id) {
    query = query.eq("marca_id", user.marca_id);
  } else if (user.tipo === "loja" || user.tipo === "cliente") {
    query = query.eq("id", user.loja_id);
  }

  const { data: lojas } = await query;

  return NextResponse.json({
    lojas: (lojas || []).map(l => ({ id: l.id, nome: l.nome, cidade: l.cidade })),
    loja_id_padrao: user.loja_id,
  });
}

// POST — publicar mesma imagem em múltiplas lojas
export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("aurohub_session")?.value;
  if (!token) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const sb = createServerSupabase();
  const { data: user } = await sb
    .from("usuarios")
    .select("id, loja_id")
    .eq("id", token)
    .eq("ativo", true)
    .single();

  if (!user) return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });

  try {
    const { loja_ids, image_url, caption, formato, legenda } = await request.json();

    if (!loja_ids || !Array.isArray(loja_ids) || loja_ids.length === 0) {
      return NextResponse.json({ error: "Selecione pelo menos uma loja" }, { status: 400 });
    }
    if (!image_url) {
      return NextResponse.json({ error: "Imagem obrigatória" }, { status: 400 });
    }

    const fmt = formato || "feed";
    const resultados: { loja_id: string; loja_nome: string; status: string; ig_media_id?: string; erro?: string }[] = [];

    for (const lojaId of loja_ids) {
      // Buscar loja
      const { data: loja } = await sb
        .from("lojas")
        .select("id, nome, ig_user_id, ig_access_token")
        .eq("id", lojaId)
        .single();

      if (!loja?.ig_user_id || !loja?.ig_access_token) {
        resultados.push({ loja_id: lojaId, loja_nome: loja?.nome || "—", status: "erro", erro: "Sem IG conectado" });
        continue;
      }

      // Verificar cota
      const cota = await verificarCota(user.id, lojaId, fmt);
      if (!cota.permitido) {
        resultados.push({ loja_id: lojaId, loja_nome: loja.nome, status: "erro", erro: cota.motivo || "Limite atingido" });
        continue;
      }

      // Deduzir pack se necessário
      const pontos = fmt === "reels" ? 2 : 1;
      const tipo = fmt === "stories" ? "stories" : "posts";
      const excedeuPlano = tipo === "stories"
        ? cota.uso.stories_usados + pontos > cota.uso.stories_limite
        : cota.uso.posts_pontos + pontos > cota.uso.posts_limite;

      if (excedeuPlano) {
        const ok = await deduzirPack(user.id, pontos);
        if (!ok) {
          resultados.push({ loja_id: lojaId, loja_nome: loja.nome, status: "erro", erro: "Sem créditos" });
          continue;
        }
      }

      // Publicar
      try {
        const result = await publishToInstagram(loja.ig_user_id, loja.ig_access_token, image_url, caption || "");

        // Salvar postagem
        await sb.from("postagens").insert({
          usuario_id: user.id,
          loja_id: lojaId,
          imagem_url: image_url,
          legenda: legenda || caption || "",
          formato: fmt,
          ig_media_id: result.id,
          status: "publicado",
          publicado_em: new Date().toISOString(),
        });

        resultados.push({ loja_id: lojaId, loja_nome: loja.nome, status: "publicado", ig_media_id: result.id });
      } catch (err) {
        resultados.push({ loja_id: lojaId, loja_nome: loja.nome, status: "erro", erro: String(err).slice(0, 100) });
      }
    }

    const sucesso = resultados.filter(r => r.status === "publicado").length;
    const erros = resultados.filter(r => r.status === "erro").length;

    return NextResponse.json({ resultados, sucesso, erros });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
