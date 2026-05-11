"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import { ChevronLeft, ChevronRight, Download, BarChart2, Image, Video, Square, TrendingUp, TrendingDown, HelpCircle } from "lucide-react";
import { useTour } from "@/hooks/useTour";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Post {
  id: string;
  created_at: string;
  destino: string;
  formato: "stories" | "feed" | "reels" | "tv" | "download";
  template_nome?: string;
  tipo?: string;
}

const FORMAT_LABELS: Record<string, string> = {
  stories: "Stories",
  feed: "Feed",
  reels: "Reels",
  tv: "TV",
  download: "Download",
};

const FORMAT_ICONS: Record<string, any> = {
  stories: Image,
  feed: Square,
  reels: Video,
  tv: BarChart2,
  download: Download,
};

const FORMAT_COLORS: Record<string, string> = {
  stories: "bg-purple-100 text-purple-700",
  feed: "bg-blue-100 text-blue-700",
  reels: "bg-pink-100 text-pink-700",
  tv: "bg-orange-100 text-orange-700",
  download: "bg-slate-100 text-slate-700",
};

const CHART_COLORS: Record<string, string> = {
  stories: "#a855f7",
  feed: "#3b82f6",
  reels: "#ec4899",
  tv: "#f97316",
  download: "#64748B",
};

export default function GerenteResumoPage() {
  const [, setProfile] = useState<FullProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [previousMonthPosts, setPreviousMonthPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedTipo] = useState<string>("all");
  const [selectedFormato, setSelectedFormato] = useState<string>("all");
  const [selectedPeriodo, setSelectedPeriodo] = useState<"7" | "30" | "90">("30");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "publicado" | "download">("all");

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

      // Mês anterior para comparação
      const prevStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
      const prevEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 0, 23, 59, 59);

      // Buscar posts do mês atual
      const { data: postsData } = await supabase
        .from("publication_history")
        .select("id, created_at, destino, formato, template_nome, tipo")
        .eq("loja_id", p.store_id)
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .order("created_at", { ascending: false });

      // Buscar posts do mês anterior
      const { data: prevPostsData } = await supabase
        .from("publication_history")
        .select("id")
        .eq("loja_id", p.store_id)
        .gte("created_at", prevStart.toISOString())
        .lte("created_at", prevEnd.toISOString());

      setPosts((postsData as Post[]) || []);
      setPreviousMonthPosts((prevPostsData as Post[]) || []);
    } catch (err) {
      console.error("[ResumoPage] Erro:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredPosts = useMemo(() => {
    let filtered = posts;
    if (selectedTipo !== "all") filtered = filtered.filter((p) => p.tipo === selectedTipo);
    if (selectedFormato !== "all") filtered = filtered.filter((p) => p.formato === selectedFormato);
    return filtered;
  }, [posts, selectedTipo, selectedFormato]);

  const metrics = useMemo(() => {
    const total = filteredPosts.length;
    const byFormat = filteredPosts.reduce((acc, p) => {
      acc[p.formato] = (acc[p.formato] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const destinoCounts = filteredPosts.reduce((acc, p) => {
      if (p.destino) acc[p.destino] = (acc[p.destino] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topDestino = Object.entries(destinoCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

    // Média por semana
    const daysInMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
    const weeksInMonth = Math.ceil(daysInMonth / 7);
    const avgPerWeek = weeksInMonth > 0 ? (total / weeksInMonth).toFixed(1) : "0";

    // Dia da semana mais ativo
    const dayOfWeekCounts = filteredPosts.reduce((acc, p) => {
      const day = new Date(p.created_at).getDay();
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    const mostActiveDay = Object.entries(dayOfWeekCounts).sort((a, b) => b[1] - a[1])[0];
    const mostActiveDayName = mostActiveDay ? dayNames[parseInt(mostActiveDay[0])] : "—";

    // Comparativo com mês anterior
    const prevTotal = previousMonthPosts.length;
    const diff = total - prevTotal;
    const diffPercent = prevTotal > 0 ? ((diff / prevTotal) * 100).toFixed(0) : "0";

    return { total, byFormat, topDestino, avgPerWeek, mostActiveDayName, diff, diffPercent };
  }, [filteredPosts, selectedMonth, previousMonthPosts]);

  // Dados para o gráfico de barras por semana
  const weeklyData = useMemo(() => {
    const weeks: Record<string, any> = {};
    const daysInMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
    const weeksInMonth = Math.ceil(daysInMonth / 7);

    for (let i = 1; i <= weeksInMonth; i++) {
      weeks[`Sem ${i}`] = { name: `Sem ${i}`, stories: 0, feed: 0, reels: 0, tv: 0, download: 0 };
    }

    filteredPosts.forEach((post) => {
      const date = new Date(post.created_at);
      const dayOfMonth = date.getDate();
      const weekNum = Math.ceil(dayOfMonth / 7);
      const weekKey = `Sem ${weekNum}`;
      if (weeks[weekKey]) {
        weeks[weekKey][post.formato] = (weeks[weekKey][post.formato] || 0) + 1;
      }
    });

    return Object.values(weeks);
  }, [filteredPosts, selectedMonth]);

  function previousMonth() {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1));
  }

  function nextMonth() {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1));
  }

  function handlePrint() {
    window.print();
  }

  const { startTour } = useTour({
    pageKey: "gerente-resumo",
    steps: [
      { popover: { title: "Resumo de Publicações", description: "Veja um panorama completo das publicações da sua loja no período selecionado." } },
      { popover: { title: "Filtros de período", description: "Navegue entre meses e filtre por formato para análises específicas." } },
      { popover: { title: "Gráficos e comparativos", description: "Compare o desempenho mês a mês e veja a distribuição por formato." } },
    ],
    autoStart: true,
    delay: 1000,
  });

  const monthName = selectedMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const prevMonthName = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1).toLocaleDateString("pt-BR", { month: "short" });

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
          button, .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-end justify-between pb-4 no-print" style={{ borderBottom: "1px solid var(--bdr)" }}>
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
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: "var(--brand-primary)", color: "#fff" }}
          >
            <Download size={16} />
            Exportar PDF
          </button>
        </div>
      </div>

      <div id="print-area">
        {loading ? (
          <div className="mt-6 flex flex-col gap-4">
            <div className="animate-pulse rounded-[20px] h-28 w-full" style={{ background: "var(--input-bg)" }} />
            <div className="animate-pulse rounded-[20px] h-80 w-full" style={{ background: "var(--input-bg)" }} />
          </div>
        ) : (
          <>
            {/* Filtros */}
            <div className="mt-6 no-print" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>

              {/* Linha 1: Período + Status */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--txt3)", minWidth: "50px" }}>
                  Período
                </span>
                {(["7", "30", "90"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setSelectedPeriodo(p)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "999px",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: selectedPeriodo === p ? "1.5px solid var(--brand-primary)" : "1px solid var(--bdr)",
                      background: selectedPeriodo === p ? "var(--brand-primary)" : "transparent",
                      color: selectedPeriodo === p ? "#fff" : "var(--txt2)",
                    }}
                  >
                    {p} dias
                  </button>
                ))}
                <div style={{ width: "1px", height: "16px", background: "var(--bdr)", margin: "0 4px", flexShrink: 0 }} />
                {([
                  { key: "all",       label: "Todos"     },
                  { key: "publicado", label: "Publicado" },
                  { key: "download",  label: "Download"  },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSelectedStatus(key)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "999px",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: selectedStatus === key ? "1.5px solid var(--brand-primary)" : "1px solid var(--bdr)",
                      background: selectedStatus === key ? "var(--brand-primary)" : "transparent",
                      color: selectedStatus === key ? "#fff" : "var(--txt2)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Linha 2: Formato */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: "var(--txt3)", minWidth: "50px" }}>
                  Formato
                </span>
                {["all", "stories", "reels", "feed", "tv"].map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setSelectedFormato(fmt)}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "999px",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: selectedFormato === fmt ? "1.5px solid var(--brand-primary)" : "1px solid var(--bdr)",
                      background: selectedFormato === fmt ? "var(--brand-primary)" : "transparent",
                      color: selectedFormato === fmt ? "#fff" : "var(--txt2)",
                    }}
                  >
                    {fmt === "all" ? "Todos" : FORMAT_LABELS[fmt]}
                  </button>
                ))}
              </div>

            </div>

            {/* Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
              <div className="rounded-[20px] p-6" style={{ background: "var(--card-bg)", border: "1px solid var(--bdr)" }}>
                <div className="text-xs font-medium mb-2" style={{ color: "var(--txt2)" }}>
                  Total de Posts
                </div>
                <div className="text-3xl font-bold mb-2" style={{ color: "var(--txt)" }}>
                  {metrics.total}
                </div>
                <div className="flex items-center gap-1 text-xs" style={{ color: metrics.diff >= 0 ? "var(--green)" : "var(--red)" }}>
                  {metrics.diff >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  <span>{metrics.diff >= 0 ? "+" : ""}{metrics.diff} vs {prevMonthName}</span>
                </div>
              </div>

              <div className="rounded-[20px] p-6" style={{ background: "var(--card-bg)", border: "1px solid var(--bdr)" }}>
                <div className="text-xs font-medium mb-2" style={{ color: "var(--txt2)" }}>
                  Média por Semana
                </div>
                <div className="text-3xl font-bold" style={{ color: "var(--txt)" }}>
                  {metrics.avgPerWeek}
                </div>
              </div>

              <div className="rounded-[20px] p-6" style={{ background: "var(--card-bg)", border: "1px solid var(--bdr)" }}>
                <div className="text-xs font-medium mb-2" style={{ color: "var(--txt2)" }}>
                  Dia Mais Ativo
                </div>
                <div className="text-lg font-bold" style={{ color: "var(--txt)" }}>
                  {metrics.mostActiveDayName}
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
            </div>

            {/* Gráfico de barras por semana */}
            <div className="mt-6 rounded-[20px] p-6" style={{ background: "var(--card-bg)", border: "1px solid var(--bdr)" }}>
              <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--txt)" }}>
                Posts por Semana
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bdr)" />
                  <XAxis dataKey="name" stroke="var(--txt2)" />
                  <YAxis stroke="var(--txt2)" />
                  <Tooltip contentStyle={{ background: "var(--card-bg)", border: "1px solid var(--bdr)" }} />
                  <Legend />
                  <Bar dataKey="stories" name="Stories" fill={CHART_COLORS.stories} />
                  <Bar dataKey="feed" name="Feed" fill={CHART_COLORS.feed} />
                  <Bar dataKey="reels" name="Reels" fill={CHART_COLORS.reels} />
                  <Bar dataKey="tv" name="TV" fill={CHART_COLORS.tv} />
                  <Bar dataKey="download" name="Download" fill={CHART_COLORS.download} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Grid de posts */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredPosts.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                  <BarChart2 className="w-8 h-8 mb-3" style={{ color: "var(--txt3)" }} />
                  <p className="text-sm" style={{ color: "var(--txt3)" }}>
                    Nenhuma publicação neste mês.
                  </p>
                </div>
              ) : (
                filteredPosts.map((post) => {
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
      </div>
      <button
        onClick={startTour}
        title="Ver tour guiado"
        style={{ position: "fixed", bottom: "24px", right: "24px", width: "48px", height: "48px", borderRadius: "50%", background: "var(--orange)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", zIndex: 9999, transition: "all 0.2s" }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.3)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)"; }}
      >
        <HelpCircle size={24} strokeWidth={2.5} />
      </button>
    </>
  );
}
