export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { cookies } from "next/headers";
import { verificarCota, deduzirPack } from "@/lib/cotas";

async function getUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("aurohub_session")?.value;
  if (!token) return null;
  const sb = createServerSupabase();
  const { data } = await sb.from("usuarios").select("id, tipo, marca_id, loja_id").eq("id", token).eq("ativo", true).single();
  return data;
}

// GET — listar postagens do usuário (rascunhos, publicados, etc.)
export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "30"), 100);

  const sb = createServerSupabase();

  let query = sb
    .from("postagens")
    .select("id, imagem_url, legenda, formato, status, ig_media_id, agendado_para, publicado_em, erro_msg, created_at, loja_id", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  // Filtro hierarquia
  if (user.tipo === "loja" || user.tipo === "cliente") {
    query = query.eq("usuario_id", user.id);
  } else if (user.tipo === "licenciado" && user.marca_id) {
    // Licenciado vê posts de lojas da sua marca — filtrar via loja
    const { data: lojaIds } = await sb.from("lojas").select("id").eq("marca_id", user.marca_id);
    const ids = (lojaIds || []).map(l => l.id);
    if (ids.length > 0) query = query.in("loja_id", ids);
    else query = query.eq("usuario_id", user.id);
  }
  // ADM vê tudo

  if (status) query = query.eq("status", status);

  const { data: posts, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enriquecer com nome da loja
  const lojaIds = [...new Set((posts || []).map(p => p.loja_id).filter(Boolean))];
  let lojaMap: Record<string, string> = {};
  if (lojaIds.length > 0) {
    const { data: lojas } = await sb.from("lojas").select("id, nome").in("id", lojaIds);
    lojaMap = Object.fromEntries((lojas || []).map(l => [l.id, l.nome]));
  }

  const postsEnriquecidos = (posts || []).map(p => ({
    ...p,
    loja_nome: lojaMap[p.loja_id] || "—",
  }));

  return NextResponse.json({ posts: postsEnriquecidos, total: count || 0, page, limit });
}

// POST — criar postagem
export async function POST(request: Request) {
  try {
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

    const body = await request.json();
    const { imagem_url, legenda, formato, ig_media_id, status: postStatus } = body;

    if (!imagem_url) return NextResponse.json({ error: "Imagem obrigatória" }, { status: 400 });

    const fmt = formato || "stories";

    // Verificar cota antes de publicar (rascunhos não consomem cota)
    if (postStatus !== "rascunho") {
      const cota = await verificarCota(user.id, user.loja_id, fmt);
      if (!cota.permitido) {
        return NextResponse.json({ error: cota.motivo, cota: cota.uso }, { status: 403 });
      }

      // Se excedeu plano mas tem pack, deduzir pack
      const pontos = fmt === "reels" ? 2 : 1;
      const tipo = fmt === "stories" ? "stories" : "posts";
      const excedeuPlano = tipo === "stories"
        ? cota.uso.stories_usados + pontos > cota.uso.stories_limite
        : cota.uso.posts_pontos + pontos > cota.uso.posts_limite;

      if (excedeuPlano) {
        const ok = await deduzirPack(user.id, pontos);
        if (!ok) {
          return NextResponse.json({ error: "Sem créditos disponíveis" }, { status: 403 });
        }
      }
    }

    const { data, error } = await sb
      .from("postagens")
      .insert({
        usuario_id: user.id,
        loja_id: user.loja_id,
        imagem_url,
        legenda: legenda || "",
        formato: fmt,
        ig_media_id: ig_media_id || null,
        status: postStatus || "rascunho",
        publicado_em: ig_media_id ? new Date().toISOString() : null,
      })
      .select("id, status")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ postagem: data }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// PUT — editar legenda de postagem
export async function PUT(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { id, legenda } = await request.json();
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    const sb = createServerSupabase();
    const { data, error } = await sb
      .from("postagens")
      .update({ legenda })
      .eq("id", id)
      .select("id, legenda")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ postagem: data });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE — deletar rascunho
export async function DELETE(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    const sb = createServerSupabase();
    // Só permite deletar rascunhos
    const { error } = await sb.from("postagens").delete().eq("id", id).eq("status", "rascunho");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
