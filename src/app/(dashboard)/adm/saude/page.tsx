"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Activity, Users, Rocket, AlertTriangle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { checkInstagramToken } from "@/lib/instagram-status";

interface Licensee {
  id: string;
  name: string | null;
  status: string;
}

interface Store {
  id: string;
  name: string | null;
  licensee_id: string | null;
}

interface InstagramStatus {
  storeId: string;
  storeName: string;
  status: "valid" | "invalid" | "network-error" | "no-token";
}

interface InactiveStore {
  storeId: string;
  storeName: string;
  daysSinceLastPost: number;
}

interface Alerta {
  modulo: string;
  nivel: "info" | "aviso" | "critico";
  mensagem: string;
}

interface Relatorio {
  id: string;
  gerado_em: string;
  score_geral: number;
  score_banco: number;
  score_assets: number;
  score_seguranca: number;
  score_infra: number;
  score_negocio: number;
  score_lgpd: number;
  alertas: Alerta[];
  enviado_email: boolean;
  enviado_whatsapp: boolean;
}

const MODULOS = [
  { key: "banco", label: "Banco de Dados", icon: "🗄️", desc: "Supabase · integridade e consistência" },
  { key: "assets", label: "Assets Cloudinary", icon: "🖼️", desc: "Imagens órfãs e URLs quebradas" },
  { key: "seguranca", label: "Segurança", icon: "🔐", desc: "RLS, headers HTTP, acessos suspeitos" },
  { key: "infra", label: "Infraestrutura", icon: "🚀", desc: "Vercel · builds e variáveis de ambiente" },
  { key: "negocio", label: "Negócio", icon: "📊", desc: "Planos, limites e tokens Instagram" },
  { key: "lgpd", label: "LGPD", icon: "⚖️", desc: "Consentimentos, titulares e incidentes" },
] as const;

export default function AdmSaudePage() {
  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [postsToday, setPostsToday] = useState(0);
  const [instagramStatuses, setInstagramStatuses] = useState<InstagramStatus[]>([]);
  const [inactiveStores, setInactiveStores] = useState<InactiveStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [ultimoRelatorio, setUltimoRelatorio] = useState<Relatorio | null>(null);
  const [historicoRelatorios, setHistoricoRelatorios] = useState<Relatorio[]>([]);
  const [loadingVault, setLoadingVault] = useState(true);
  const [rodandoDiagnostico, setRodandoDiagnostico] = useState(false);

  useEffect(() => {
    loadHealthData();
    loadVaultData();
  }, []);

  async function loadHealthData() {
    setLoading(true);
    try {
      // Franqueados ativos
      const { data: lics } = await supabase
        .from("licensees")
        .select("id, name, status")
        .eq("status", "active")
        .order("name");
      setLicensees((lics as Licensee[]) || []);

      // Lojas
      const { data: storesData } = await supabase
        .from("stores")
        .select("id, name, licensee_id")
        .order("name");
      setStores((storesData as Store[]) || []);

      // Posts hoje
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("publication_history")
        .select("*", { count: "exact", head: true })
        .gte("created_at", todayStart.toISOString());
      setPostsToday(count || 0);

      // Status Instagram e lojas inativas
      if (storesData && storesData.length > 0) {
        const statusPromises = storesData.map(async (store) => {
          const result = await checkInstagramToken(store.id, supabase);
          return {
            storeId: store.id,
            storeName: store.name || "Sem nome",
            status: result.status,
          };
        });

        const inactivePromises = storesData.map(async (store) => {
          const { data: lastPost } = await supabase
            .from("publication_history")
            .select("created_at")
            .eq("loja_id", store.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (!lastPost) {
            return { storeId: store.id, storeName: store.name || "Sem nome", daysSinceLastPost: 999 };
          }

          const lastPostDate = new Date(lastPost.created_at);
          const daysSince = Math.floor((Date.now() - lastPostDate.getTime()) / 86400000);

          if (daysSince >= 5) {
            return { storeId: store.id, storeName: store.name || "Sem nome", daysSinceLastPost: daysSince };
          }
          return null;
        });

        const [statuses, inactive] = await Promise.all([
          Promise.all(statusPromises),
          Promise.all(inactivePromises),
        ]);

        setInstagramStatuses(statuses);
        setInactiveStores(inactive.filter((item): item is InactiveStore => item !== null));
      }
    } catch (err) {
      console.error("[SaudePage] Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadVaultData() {
    setLoadingVault(true);
    try {
      const res = await fetch("/api/cron/vault/historico");
      if (res.ok) {
        const data = await res.json();
        const relatorios = (data.relatorios ?? []).map((r: Relatorio) => ({
          ...r,
          score_geral: r.score_geral != null && r.score_geral !== 0
            ? r.score_geral
            : Math.round((r.score_banco + r.score_assets + r.score_seguranca + r.score_infra + r.score_negocio + r.score_lgpd) / 6),
        }));
        setHistoricoRelatorios(relatorios);
        if (relatorios.length > 0) setUltimoRelatorio(relatorios[0]);
      }
    } catch (err) {
      console.error("[SaudePage] Erro ao carregar dados do vault:", err);
    } finally {
      setLoadingVault(false);
    }
  }

  async function rodarDiagnostico() {
    setRodandoDiagnostico(true);
    try {
      const res = await fetch("/api/cron/vault", { method: "POST" });
      const data = await res.json();
      if (data.success) await loadVaultData();
    } catch (err) {
      console.error("[SaudePage] Erro ao rodar diagnóstico:", err);
    } finally {
      setRodandoDiagnostico(false);
    }
  }

  const instagramCounts = useMemo(() => {
    const counts = { valid: 0, invalid: 0, warning: 0, noToken: 0 };
    for (const s of instagramStatuses) {
      if (s.status === "valid") counts.valid++;
      else if (s.status === "invalid") counts.invalid++;
      else if (s.status === "network-error") counts.warning++;
      else counts.noToken++;
    }
    return counts;
  }, [instagramStatuses]);

  const invalidTokenStores = useMemo(
    () => instagramStatuses.filter((s) => s.status === "invalid"),
    [instagramStatuses]
  );

  const getScoreColor = (score: number) => {
    if (score >= 90) return "rgb(34, 197, 94)"; // verde
    if (score >= 70) return "rgb(251, 191, 36)"; // amarelo
    return "rgb(239, 68, 68)"; // vermelho
  };

  const getModuleScore = (key: string): number => {
    if (!ultimoRelatorio) return -1;
    const val = (ultimoRelatorio as unknown as Record<string, unknown>)[`score_${key}`];
    return val != null ? Number(val) : -1;
  };

  if (loading) {
    return (
      <>
        <div className="flex items-end justify-between pb-4" style={{ borderBottom: "1px solid var(--bdr)" }}>
          <div>
            <h2 className="text-2xl font-bold" style={{ color: "var(--txt)" }}>Saúde da Plataforma</h2>
            <p className="mt-0.5 text-sm" style={{ color: "var(--txt2)" }}>
              Monitoramento em tempo real de toda a infraestrutura
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-4">
          <div className="animate-pulse rounded-[20px] h-28 w-full" style={{ background: "var(--input-bg)" }} />
          <div className="animate-pulse rounded-[20px] h-80 w-full" style={{ background: "var(--input-bg)" }} />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex items-end justify-between pb-4" style={{ borderBottom: "1px solid var(--bdr)" }}>
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--txt)" }}>Saúde da Plataforma</h2>
          <p className="mt-0.5 text-sm" style={{ color: "var(--txt2)" }}>
            Monitoramento em tempo real de toda a infraestrutura
          </p>
        </div>
      </div>

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
        {/* Franqueados ativos */}
        <div
          className="rounded-[20px] p-6 flex flex-col gap-3"
          style={{ background: "var(--card-bg)", border: "1px solid var(--bdr)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: "var(--txt2)" }}>
              Franqueados Ativos
            </span>
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center"
              style={{ background: "var(--blue-bg)" }}
            >
              <Users size={18} style={{ color: "var(--blue)" }} />
            </div>
          </div>
          <div className="text-3xl font-bold" style={{ color: "var(--txt)" }}>
            {licensees.length}
          </div>
        </div>

        {/* Posts hoje */}
        <div
          className="rounded-[20px] p-6 flex flex-col gap-3"
          style={{ background: "var(--card-bg)", border: "1px solid var(--bdr)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: "var(--txt2)" }}>
              Posts Hoje
            </span>
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center"
              style={{ background: "var(--green-bg)" }}
            >
              <Rocket size={18} style={{ color: "var(--green)" }} />
            </div>
          </div>
          <div className="text-3xl font-bold" style={{ color: "var(--txt)" }}>
            {postsToday}
          </div>
        </div>

        {/* Token Instagram Verde */}
        <div
          className="rounded-[20px] p-6 flex flex-col gap-3"
          style={{ background: "var(--card-bg)", border: "1px solid var(--bdr)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: "var(--txt2)" }}>
              Tokens Válidos
            </span>
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center"
              style={{ background: "rgb(220, 252, 231)" }}
            >
              <CheckCircle2 size={18} style={{ color: "rgb(34, 197, 94)" }} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-bold" style={{ color: "var(--txt)" }}>
              {instagramCounts.valid}
            </div>
            <span className="text-sm" style={{ color: "var(--txt3)" }}>
              / {stores.length}
            </span>
          </div>
        </div>

        {/* Lojas inativas */}
        <div
          className="rounded-[20px] p-6 flex flex-col gap-3"
          style={{ background: "var(--card-bg)", border: "1px solid var(--bdr)" }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: "var(--txt2)" }}>
              Lojas Inativas +5d
            </span>
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center"
              style={{ background: "rgb(254, 243, 199)" }}
            >
              <Clock size={18} style={{ color: "rgb(245, 158, 11)" }} />
            </div>
          </div>
          <div className="text-3xl font-bold" style={{ color: "var(--txt)" }}>
            {inactiveStores.length}
          </div>
        </div>
      </div>

      {/* Alertas ativos */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--txt2)" }}>
          Alertas Ativos
        </h3>

        <div className="flex flex-col gap-4">
          {/* Tokens inválidos */}
          {invalidTokenStores.length > 0 && (
            <div
              className="rounded-[20px] p-6"
              style={{ background: "rgb(254, 242, 242)", border: "1px solid rgb(252, 165, 165)" }}
            >
              <div className="flex items-start gap-3">
                <XCircle size={20} style={{ color: "rgb(239, 68, 68)", flexShrink: 0, marginTop: "2px" }} />
                <div className="flex-1">
                  <div className="font-semibold text-sm mb-2" style={{ color: "rgb(127, 29, 29)" }}>
                    Tokens Instagram Inválidos ({invalidTokenStores.length})
                  </div>
                  <ul className="text-sm space-y-1" style={{ color: "rgb(153, 27, 27)" }}>
                    {invalidTokenStores.map((s) => (
                      <li key={s.storeId}>• {s.storeName}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Lojas inativas */}
          {inactiveStores.length > 0 && (
            <div
              className="rounded-[20px] p-6"
              style={{ background: "rgb(254, 252, 232)", border: "1px solid rgb(253, 224, 71)" }}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle
                  size={20}
                  style={{ color: "rgb(245, 158, 11)", flexShrink: 0, marginTop: "2px" }}
                />
                <div className="flex-1">
                  <div className="font-semibold text-sm mb-2" style={{ color: "rgb(120, 53, 15)" }}>
                    Lojas Inativas há +5 dias ({inactiveStores.length})
                  </div>
                  <ul className="text-sm space-y-1" style={{ color: "rgb(146, 64, 14)" }}>
                    {inactiveStores.map((s) => (
                      <li key={s.storeId}>
                        • {s.storeName} — {s.daysSinceLastPost} dias sem publicar
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Nenhum alerta */}
          {invalidTokenStores.length === 0 && inactiveStores.length === 0 && (
            <div
              className="rounded-[20px] p-6 text-center"
              style={{ background: "var(--card-bg)", border: "1px solid var(--bdr)" }}
            >
              <Activity className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--txt3)" }} />
              <p className="text-sm" style={{ color: "var(--txt3)" }}>
                Nenhum alerta ativo. Sistema operando normalmente.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Diagnóstico do Sistema */}
      <div className="mt-8">
        <h3 className="text-sm font-semibold uppercase tracking-wide mb-4" style={{ color: "var(--txt2)" }}>
          Diagnóstico do Sistema
        </h3>

        {loadingVault ? (
          <div className="animate-pulse rounded-[20px] h-48 w-full" style={{ background: "var(--input-bg)" }} />
        ) : ultimoRelatorio ? (
          <>
            {/* Score Geral */}
            <div
              className="rounded-[20px] p-6 mb-4 flex items-center justify-between gap-4 flex-wrap"
              style={{ background: "var(--card-bg)", border: "1px solid var(--bdr)" }}
            >
              <div className="flex items-center gap-5">
                <div className="text-center">
                  <div
                    className="text-5xl font-bold"
                    style={{ color: getScoreColor(ultimoRelatorio.score_geral) }}
                  >
                    {ultimoRelatorio.score_geral}
                  </div>
                  <div className="text-[10px] mt-1" style={{ color: "var(--txt3)" }}>
                    SCORE GERAL
                  </div>
                </div>
                <div>
                  <div className="text-sm font-semibold mb-1.5" style={{ color: "var(--txt)" }}>
                    {ultimoRelatorio.score_geral >= 90
                      ? "Sistema saudável ✓"
                      : ultimoRelatorio.score_geral >= 70
                      ? "Atenção necessária"
                      : "Problemas críticos"}
                  </div>
                  <div className="text-xs" style={{ color: "var(--txt3)" }}>
                    Último diagnóstico: {new Date(ultimoRelatorio.gerado_em).toLocaleDateString("pt-BR")}
                  </div>
                </div>
              </div>
              <button
                onClick={rodarDiagnostico}
                disabled={rodandoDiagnostico}
                className="rounded-[12px] px-6 py-3 text-sm font-semibold text-white"
                style={{
                  background: rodandoDiagnostico
                    ? "var(--txt3)"
                    : "linear-gradient(90deg, #D4A843, #FF7A1A)",
                  cursor: rodandoDiagnostico ? "not-allowed" : "pointer",
                  opacity: rodandoDiagnostico ? 0.6 : 1,
                }}
              >
                {rodandoDiagnostico ? "Rodando..." : "↺ Novo diagnóstico"}
              </button>
            </div>

            {/* Módulos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              {MODULOS.map((m) => {
                const score = getModuleScore(m.key);
                return (
                  <div
                    key={m.key}
                    className="rounded-[20px] p-5 flex flex-col gap-3"
                    style={{ background: "var(--card-bg)", border: "1px solid var(--bdr)" }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{m.icon}</span>
                      {score >= 0 ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xl font-bold" style={{ color: getScoreColor(score) }}>
                            {score}
                          </span>
                          <span className="text-[10px]" style={{ color: "var(--txt3)" }}>
                            /100
                          </span>
                        </div>
                      ) : (
                        <span
                          className="text-[10px] px-2.5 py-1 rounded-full font-bold"
                          style={{ background: "rgba(255, 171, 0, 0.1)", color: "rgba(255, 171, 0, 0.85)" }}
                        >
                          PENDENTE
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold mb-1" style={{ color: "var(--txt)" }}>
                        {m.label}
                      </div>
                      <div className="text-xs" style={{ color: "var(--txt3)" }}>
                        {m.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Histórico */}
            {historicoRelatorios.length > 0 && (
              <div className="rounded-[20px] overflow-hidden" style={{ background: "var(--card-bg)", border: "1px solid var(--bdr)" }}>
                <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--bdr)" }}>
                  <div className="text-xs font-semibold" style={{ color: "var(--txt2)" }}>
                    Últimos 5 diagnósticos
                  </div>
                </div>
                {historicoRelatorios.slice(0, 5).map((r, i) => (
                  <div
                    key={r.id}
                    className="px-5 py-3 flex items-center justify-between"
                    style={{ borderBottom: i < 4 && i < historicoRelatorios.length - 1 ? "1px solid var(--bdr)" : "none" }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{r.score_geral >= 90 ? "🟢" : r.score_geral >= 70 ? "🟡" : "🔴"}</span>
                      <div>
                        <div className="text-sm font-semibold" style={{ color: getScoreColor(r.score_geral) }}>
                          {r.score_geral}/100
                        </div>
                        <div className="text-[11px]" style={{ color: "var(--txt3)" }}>
                          {new Date(r.gerado_em).toLocaleString("pt-BR")}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div
            className="rounded-[20px] p-8 text-center"
            style={{ background: "var(--card-bg)", border: "1px solid var(--bdr)" }}
          >
            <div className="text-sm font-semibold mb-2" style={{ color: "var(--txt2)" }}>
              Nenhum diagnóstico gerado ainda
            </div>
            <div className="text-xs mb-4" style={{ color: "var(--txt3)" }}>
              Execute o primeiro diagnóstico para ver o score de saúde do sistema
            </div>
            <button
              onClick={rodarDiagnostico}
              disabled={rodandoDiagnostico}
              className="rounded-[12px] px-6 py-3 text-sm font-semibold text-white"
              style={{
                background: rodandoDiagnostico
                  ? "var(--txt3)"
                  : "linear-gradient(90deg, #D4A843, #FF7A1A)",
                cursor: rodandoDiagnostico ? "not-allowed" : "pointer",
                opacity: rodandoDiagnostico ? 0.6 : 1,
              }}
            >
              {rodandoDiagnostico ? "Rodando diagnóstico..." : "▶ Gerar primeiro relatório"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
