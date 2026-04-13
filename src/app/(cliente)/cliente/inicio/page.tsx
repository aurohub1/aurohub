"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import {
  Store, Users, BarChart3, FileText, Sparkles, CalendarClock, ArrowRight,
} from "lucide-react";

/* ── Tipos ───────────────────────────────────────── */

interface StoreRow {
  id: string;
  name: string;
  city?: string | null;
  active?: boolean | null;
}
interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
}
interface PlanFull {
  slug: string;
  name: string;
  max_users: number;
  max_posts_day: number;
}

/* ── Helpers ─────────────────────────────────────── */

const FALLBACK_QUOTES = [
  "Cada destino começa com uma decisão.",
  "Vender viagem é vender memórias.",
  "Inspire primeiro, venda depois.",
  "Destinos não se vendem — se sonham.",
  "Cada post é um convite para sonhar.",
];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function roleLabel(role: string | null): string {
  switch (role) {
    case "adm":      return "ADM";
    case "cliente":  return "Cliente";
    case "unidade":  return "Unidade";
    case "vendedor": return "Vendedor";
    default:         return role || "—";
  }
}

/* ── Component ───────────────────────────────────── */

export default function ClienteInicioPage() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [planFull, setPlanFull] = useState<PlanFull | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [quote, setQuote] = useState<string>("");

  const [stores, setStores] = useState<StoreRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [postsMes, setPostsMes] = useState(0);
  const [templatesCount, setTemplatesCount] = useState(0);

  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const p = await getProfile(supabase);
      setProfile(p);
      if (!p?.licensee_id) { setLoading(false); return; }

      // Frase do segmento (igual ADM)
      let segmentQuotes: string[] | null = null;
      const segmentId = p.licensee?.segment_id ?? null;
      if (segmentId) {
        const { data: seg } = await supabase.from("segments").select("quotes").eq("id", segmentId).single();
        const arr = (seg as { quotes?: unknown } | null)?.quotes;
        if (Array.isArray(arr) && arr.length > 0) segmentQuotes = arr as string[];
      }
      if (!segmentQuotes) {
        const { data: outros } = await supabase.from("segments").select("quotes").eq("name", "Outros").single();
        const arr = (outros as { quotes?: unknown } | null)?.quotes;
        if (Array.isArray(arr) && arr.length > 0) segmentQuotes = arr as string[];
      }
      setQuote(pickRandom(segmentQuotes ?? FALLBACK_QUOTES));

      // Dados do licensee (expires_at não vem no FullProfile)
      const { data: licFull } = await supabase
        .from("licensees")
        .select("expires_at")
        .eq("id", p.licensee_id)
        .single();
      if (licFull) setExpiresAt((licFull as { expires_at: string | null }).expires_at ?? null);

      // Plano completo (inclui max_users)
      const slug = p.licensee?.plan_slug || p.licensee?.plan || p.plan?.slug;
      if (slug) {
        const { data: plan } = await supabase
          .from("plans")
          .select("slug, name, max_users, max_posts_day")
          .eq("slug", slug)
          .single();
        if (plan) setPlanFull(plan as PlanFull);
      }

      // Stores (best-effort com city/active)
      let storeRows: StoreRow[] = [];
      {
        const tryFull = await supabase
          .from("stores")
          .select("id, name, city, active")
          .eq("licensee_id", p.licensee_id)
          .order("name");
        if (!tryFull.error && tryFull.data) {
          storeRows = tryFull.data as StoreRow[];
        } else {
          const { data } = await supabase
            .from("stores")
            .select("id, name")
            .eq("licensee_id", p.licensee_id)
            .order("name");
          storeRows = (data ?? []) as StoreRow[];
        }
      }
      setStores(storeRows);

      // Usuários do licensee
      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, name, email, role")
        .eq("licensee_id", p.licensee_id)
        .order("name");
      setUsers((usersData ?? []) as UserRow[]);

      // Posts do mês via activity_logs (filtrado por licensee_id nos metadata)
      const inicioMes = new Date();
      inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
      const { data: logs } = await supabase
        .from("activity_logs")
        .select("id, metadata")
        .gte("created_at", inicioMes.toISOString())
        .in("event_type", ["post_instagram", "post_scheduled"])
        .limit(500);
      const allLogs = (logs ?? []) as { id: string; metadata: Record<string, unknown> | null }[];
      const doLic = allLogs.filter((l) => l.metadata?.licensee_id === p.licensee_id);
      setPostsMes(doLic.length);

      // Templates do canvas (system_config tmpl_* onde value contém licenseeId)
      const { data: tmpls } = await supabase
        .from("system_config")
        .select("key")
        .like("key", "tmpl_%")
        .like("value", `%"licenseeId":"${p.licensee_id}"%`);
      setTemplatesCount((tmpls ?? []).length);
    } catch (err) {
      console.error("[ClienteInicio] load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Derived ───────────────────────────────────── */

  const status = profile?.licensee?.status ?? "—";
  const isActive = status === "active";
  const maxUsers = planFull?.max_users ?? null;
  const usersUsedPct = maxUsers && maxUsers > 0
    ? Math.min(100, Math.round((users.length / maxUsers) * 100))
    : null;
  const unidadesAtivas = stores.filter((s) => s.active !== false).length;

  if (loading) return <div className="text-[13px] text-[var(--txt3)]">Carregando...</div>;

  return (
    <>
      {/* ═══ HEADER ═════════════════════════════════ */}
      <div className="card-glass relative overflow-hidden px-8 py-7">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ background: "linear-gradient(135deg, #1E3A6E 0%, var(--orange) 50%, #D4A843 100%)" }}
        />
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--orange)]">
              Painel do Cliente · {greeting()}
            </p>
            <h1 className="mt-1.5 font-[family-name:var(--font-dm-serif)] text-[24px] font-bold leading-tight text-[var(--txt)]">
              Olá, {profile?.name?.split(" ")[0] || profile?.licensee?.name || "cliente"}
            </h1>
            <p className="mt-1.5 max-w-[560px] text-[13px] italic text-[var(--txt2)]">
              &ldquo;{quote}&rdquo;
            </p>
            <p className="mt-1 text-[11px] text-[var(--txt3)]">{profile?.licensee?.name || "—"}</p>
          </div>

          <Link
            href="/editor"
            className="flex shrink-0 items-center gap-2 rounded-xl px-5 py-3 text-[13px] font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, var(--orange), #D4A843)" }}
          >
            <Sparkles size={15} /> Criar arte
          </Link>
        </div>
      </div>

      {/* ═══ KPI Row — Plano, Posts do mês, Templates ══ */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Plano atual */}
        <div className="card-glass px-5 py-5">
          <div className="mb-3 flex items-start gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[var(--orange)]"
              style={{
                background: "linear-gradient(135deg, rgba(255,122,26,0.18), rgba(30,58,110,0.12))",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <BarChart3 size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">Plano atual</div>
                <span
                  className="rounded-full px-2 py-0.5 text-[0.55rem] font-bold"
                  style={
                    isActive
                      ? { background: "var(--green3)", color: "var(--green)" }
                      : { background: "var(--red3)", color: "var(--red)" }
                  }
                >
                  {isActive ? "Ativo" : "Inativo"}
                </span>
              </div>
              <div className="font-[family-name:var(--font-dm-serif)] text-[1.5rem] font-bold leading-none text-[var(--txt)]">
                {planFull?.name || profile?.plan?.name || "—"}
              </div>
              <div className="mt-1 flex items-center gap-1 text-[11px] text-[var(--txt3)]">
                <CalendarClock size={11} />
                Vence em {formatDate(expiresAt)}
              </div>
            </div>
          </div>

          {/* Barra de uso de usuários */}
          {maxUsers !== null && maxUsers > 0 && (
            <div>
              <div className="mb-1 flex items-center justify-between text-[10px] text-[var(--txt3)]">
                <span>Usuários usados</span>
                <span className="tabular-nums">{users.length} / {maxUsers}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg2)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${usersUsedPct ?? 0}%`,
                    background: (usersUsedPct ?? 0) > 90
                      ? "var(--red)"
                      : (usersUsedPct ?? 0) > 70
                        ? "var(--orange)"
                        : "linear-gradient(90deg, var(--orange), #D4A843)",
                  }}
                />
              </div>
            </div>
          )}
          {maxUsers === -1 && (
            <div className="text-[11px] text-[var(--txt3)]">Usuários ilimitados</div>
          )}
        </div>

        {/* Posts do mês */}
        <div className="card-glass flex items-center gap-4 px-5 py-5">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[var(--orange)]"
            style={{
              background: "linear-gradient(135deg, rgba(255,122,26,0.18), rgba(30,58,110,0.12))",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <BarChart3 size={22} />
          </div>
          <div>
            <div className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">Posts do mês</div>
            <div className="font-[family-name:var(--font-dm-serif)] text-[1.5rem] font-bold leading-none text-[var(--txt)] tabular-nums">
              {postsMes}
            </div>
            <div className="mt-1 text-[11px] text-[var(--txt3)]">Todas as unidades</div>
          </div>
        </div>

        {/* Templates disponíveis */}
        <div className="card-glass flex items-center gap-4 px-5 py-5">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[var(--orange)]"
            style={{
              background: "linear-gradient(135deg, rgba(255,122,26,0.18), rgba(30,58,110,0.12))",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <FileText size={22} />
          </div>
          <div>
            <div className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">Templates</div>
            <div className="font-[family-name:var(--font-dm-serif)] text-[1.5rem] font-bold leading-none text-[var(--txt)] tabular-nums">
              {templatesCount}
            </div>
            <div className="mt-1 text-[11px] text-[var(--txt3)]">Disponíveis no editor</div>
          </div>
        </div>
      </div>

      {/* ═══ Unidades + Usuários ══════════════════════ */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* ── Unidades ──────────────────────────── */}
        <div className="card-glass flex flex-col">
          <div className="flex items-center justify-between border-b border-[var(--bdr)] px-5 py-4">
            <div className="flex items-center gap-2">
              <Store size={15} className="text-[var(--orange)]" />
              <h3 className="text-[14px] font-bold text-[var(--txt)]">Unidades</h3>
              <span className="rounded-full bg-[var(--green3)] px-2 py-0.5 text-[0.55rem] font-bold text-[var(--green)]">
                {unidadesAtivas} ativa{unidadesAtivas === 1 ? "" : "s"}
              </span>
            </div>
            <Link
              href="/clientes"
              className="flex items-center gap-1 text-[11px] font-semibold text-[var(--orange)] hover:underline"
            >
              Gerenciar <ArrowRight size={11} />
            </Link>
          </div>
          <div className="p-5">
            {stores.length === 0 ? (
              <div className="py-6 text-center text-[12px] text-[var(--txt3)]">Nenhuma unidade cadastrada.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {stores.map((s) => {
                  const ativo = s.active !== false;
                  return (
                    <div key={s.id} className="flex items-center justify-between rounded-lg border border-[var(--bdr)] px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-[12px] font-medium text-[var(--txt)]">{s.name}</div>
                        {s.city && <div className="truncate text-[10px] text-[var(--txt3)]">{s.city}</div>}
                      </div>
                      <span
                        className="ml-2 shrink-0 rounded-full px-2 py-0.5 text-[0.55rem] font-bold"
                        style={
                          ativo
                            ? { background: "var(--green3)", color: "var(--green)" }
                            : { background: "var(--red3)", color: "var(--red)" }
                        }
                      >
                        {ativo ? "Ativa" : "Inativa"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Usuários ──────────────────────────── */}
        <div className="card-glass flex flex-col">
          <div className="flex items-center justify-between border-b border-[var(--bdr)] px-5 py-4">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-[var(--orange)]" />
              <h3 className="text-[14px] font-bold text-[var(--txt)]">Usuários</h3>
              <span className="text-[11px] text-[var(--txt3)] tabular-nums">
                {users.length}{maxUsers && maxUsers > 0 ? ` / ${maxUsers}` : ""}
              </span>
            </div>
            <Link
              href="/usuarios"
              className="flex items-center gap-1 text-[11px] font-semibold text-[var(--orange)] hover:underline"
            >
              Gerenciar <ArrowRight size={11} />
            </Link>
          </div>
          <div className="p-5">
            {users.length === 0 ? (
              <div className="py-6 text-center text-[12px] text-[var(--txt3)]">Nenhum usuário cadastrado.</div>
            ) : (
              <div className="flex flex-col gap-2">
                {users.slice(0, 8).map((u) => (
                  <div key={u.id} className="flex items-center justify-between rounded-lg border border-[var(--bdr)] px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-[12px] font-medium text-[var(--txt)]">{u.name || u.email || "—"}</div>
                      <div className="truncate text-[10px] text-[var(--txt3)]">{u.email}</div>
                    </div>
                    <span className="ml-2 shrink-0 rounded-full bg-[var(--blue3)] px-2 py-0.5 text-[0.55rem] font-bold text-[var(--blue)]">
                      {roleLabel(u.role)}
                    </span>
                  </div>
                ))}
                {users.length > 8 && (
                  <div className="text-center text-[10px] text-[var(--txt3)]">+ {users.length - 8} usuários</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
