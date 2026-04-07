export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";
import { cookies } from "next/headers";

async function getAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("aurohub_session")?.value;
  if (!token) return null;
  const sb = createServerSupabase();
  const { data } = await sb.from("usuarios").select("id, tipo").eq("id", token).eq("ativo", true).single();
  if (!data || data.tipo !== "adm") return null;
  return data;
}

export async function GET(request: Request) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const acao = searchParams.get("acao") || "";
  const formato = searchParams.get("formato") || "";
  const usuario_id = searchParams.get("usuario_id") || "";
  const periodo = searchParams.get("periodo") || "30d";
  const busca = searchParams.get("busca") || "";

  const sb = createServerSupabase();

  // Período
  const dias = periodo === "7d" ? 7 : periodo === "90d" ? 90 : periodo === "all" ? 365 * 5 : 30;
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);

  // Query
  let query = sb
    .from("log_atividades")
    .select("*", { count: "exact" })
    .gte("created_at", desde.toISOString())
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (acao) query = query.eq("acao", acao);
  if (formato) query = query.eq("formato", formato);
  if (usuario_id) query = query.eq("usuario_id", usuario_id);
  if (busca) query = query.ilike("acao", `%${busca}%`);

  const { data: logs, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enriquecer com nomes de usuários e lojas
  const userIds = [...new Set((logs || []).map(l => l.usuario_id).filter(Boolean))];
  const lojaIds = [...new Set((logs || []).map(l => l.loja_id).filter(Boolean))];

  let userMap: Record<string, string> = {};
  let lojaMap: Record<string, string> = {};

  if (userIds.length > 0) {
    const { data: users } = await sb.from("usuarios").select("id, nome").in("id", userIds);
    userMap = Object.fromEntries((users || []).map(u => [u.id, u.nome]));
  }
  if (lojaIds.length > 0) {
    const { data: lojas } = await sb.from("lojas").select("id, nome").in("id", lojaIds);
    lojaMap = Object.fromEntries((lojas || []).map(l => [l.id, l.nome]));
  }

  const enriquecidos = (logs || []).map(l => ({
    ...l,
    usuario_nome: userMap[l.usuario_id] || "Sistema",
    loja_nome: lojaMap[l.loja_id] || "—",
  }));

  // Ações distintas para filtro
  const { data: acoesData } = await sb
    .from("log_atividades")
    .select("acao")
    .gte("created_at", desde.toISOString());

  const acoes = [...new Set((acoesData || []).map(a => a.acao))].sort();

  // Usuários para filtro
  const { data: todosUsuarios } = await sb.from("usuarios").select("id, nome").eq("ativo", true).order("nome");

  return NextResponse.json({
    logs: enriquecidos,
    total: count || 0,
    page,
    limit,
    acoes,
    usuarios: todosUsuarios || [],
  });
}
