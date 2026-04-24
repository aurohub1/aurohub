"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import { ChevronLeft, ChevronRight, Download, BarChart2, Image, Video, Square } from "lucide-react";

interface Post {
  id: string;
  created_at: string;
  destino: string;
  formato: "stories" | "feed" | "reels" | "tv";
  template_nome?: string;
}

const FORMAT_LABELS: Record<string, string> = {
  stories: "Stories",
  feed: "Feed",
  reels: "Reels",
  tv: "TV",
};

const FORMAT_ICONS: Record<string, any> = {
  stories: Image,
  feed: Square,
  reels: Video,
  tv: BarChart2,
};

const FORMAT_COLORS: Record<string, string> = {
  stories: "bg-purple-100 text-purple-700",
  feed: "bg-blue-100 text-blue-700",
  reels: "bg-pink-100 text-pink-700",
  tv: "bg-orange-100 text-orange-700",
};

export default function GerenteResumoPage() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  async function loadData() {
    setLoading(true);
    try {
      const p = await getProfile(supabase);
      if (!p || !p.store_id) return;
      setProfile(p);

      // Calcular início e fim do mês
      const start = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const end = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59);

      // Buscar posts do mês
      const { data: postsData } = await supabase
        .from("publication_history")
        .select("id, created_at, destino, formato, template_nome")
        .eq("loja_id", p.store_id)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: false });

      setPosts((postsData as Post[]) || []);
    } catch (err) {
      console.error("[ResumoPage] Erro:", err);
    } finally {
      setLoading(false);
    }
  }

  const metrics = useMemo(() => {
    const total = posts.length;
    const byFormat = posts.reduce((acc, p) => {
      acc[p.formato] = (acc[p.formato] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const destinoCounts = posts.reduce((acc, p) => {
      if (p.destino) acc[p.destino] = (acc[p.destino] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topDestino = Object.entries(destinoCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

    return { total, byFormat, topDestino };
  }, [posts]);

  function previousMonth() {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1));
  }

  function nextMonth() {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1));
  }

  const monthName = selectedMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <>
      {/* Header */}
      <div className="flex items-end justify-between pb-4" style={{ borderBottom: "1px solid var(--bdr)" }}>
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--txt)" }}>Resumo Mensal</h2>
          <p className="mt-0.5 text-sm" style={{ color: "var(--txt2)" }}>
            Publicações de {monthName}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border" style={{ borderColor: "var(--bdr)", padding: "6px" }}>
            <button
              onClick={previousMonth}
              className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ background: "transparent", color: "var(--txt2)" }}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-semibold px-3" style={{ color: "var(--txt)" }}>
              {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
            </span>
            <button
              onClick={nextMonth}
              className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors"
              style={{ background: "transparent", color: "var(--txt2)" }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: "var(--brand-primary)", color: "#fff" }}
          >
            <Download size={16} />
            Exportar PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 flex flex-col gap-4">
          <div className="animate-pulse rounded-[20px] h-28 w-full" style={{ background: "var(--input-bg)" }} />
          <div className="animate-pulse rounded-[20px] h-80 w-full" style={{ background: "var(--input-bg)" }} />
        </div>
      ) : (
        <>
          {/* Métricas */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
            <div className="rounded-[20px] p-6" style={{ background: "var(--card-bg)", border: "1px solid var(--bdr)" }}>
              <div className="text-xs font-medium mb-2" style={{ color: "var(--txt2)" }}>
                Total de Posts
              </div>
              <div className="text-3xl font-bold" style={{ color: "var(--txt)" }}>
                {metrics.total}
              </div>
            </div>

            <div className="rounded-[20px] p-6" style={{ background: "var(--card-bg)", border: "1px solid var(--bdr)" }}>
              <div className="text-xs font-medium mb-2" style={{ color: "var(--txt2)" }}>
                Destino Mais Postado
              </div>
              <div className="text-lg font-bold" style={{ color: "var(--txt)" }}>
                {metrics.topDestino}
              </div>
            </div>

            <div className="rounded-[20px] p-6" style={{ background: "var(--card-bg)", border: "1px solid var(--bdr)" }}>
              <div className="text-xs font-medium mb-3" style={{ color: "var(--txt2)" }}>
                Por Formato
              </div>
              <div className="flex flex-col gap-2">
                {Object.entries(metrics.byFormat).map(([fmt, count]) => (
                  <div key={fmt} className="flex items-center justify-between text-xs">
                    <span style={{ color: "var(--txt2)" }}>{FORMAT_LABELS[fmt] || fmt}</span>
                    <span className="font-bold" style={{ color: "var(--txt)" }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Grid de posts */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {posts.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                <BarChart2 className="w-8 h-8 mb-3" style={{ color: "var(--txt3)" }} />
                <p className="text-sm" style={{ color: "var(--txt3)" }}>
                  Nenhuma publicação neste mês.
                </p>
              </div>
            ) : (
              posts.map((post) => {
                const Icon = FORMAT_ICONS[post.formato] || Square;
                return (
                  <div
                    key={post.id}
                    className="rounded-[20px] p-4 flex flex-col gap-3"
                    style={{ background: "var(--card-bg)", border: "1px solid var(--bdr)" }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-10 w-10 rounded-lg flex items-center justify-center"
                          style={{ background: "var(--bg2)" }}
                        >
                          <Icon size={18} style={{ color: "var(--txt2)" }} />
                        </div>
                        <div>
                          <div className="text-xs font-bold" style={{ color: "var(--txt)" }}>
                            {post.destino || "—"}
                          </div>
                          <div className="text-xs" style={{ color: "var(--txt3)" }}>
                            {new Date(post.created_at).toLocaleDateString("pt-BR")}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${FORMAT_COLORS[post.formato]}`}>
                        {FORMAT_LABELS[post.formato]}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </>
  );
}
