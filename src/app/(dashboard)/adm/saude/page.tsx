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

export default function AdmSaudePage() {
  const [licensees, setLicensees] = useState<Licensee[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [postsToday, setPostsToday] = useState(0);
  const [instagramStatuses, setInstagramStatuses] = useState<InstagramStatus[]>([]);
  const [inactiveStores, setInactiveStores] = useState<InactiveStore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHealthData();
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
    </>
  );
}
