"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import { FileText, Search, Sparkles, CalendarClock } from "lucide-react";

/* ── Tipos ───────────────────────────────────────── */

type FormType = "pacote" | "campanha" | "passagem" | "cruzeiro" | "anoiteceu" | "lamina";
type FormatType = "stories" | "feed" | "tv";

interface TemplateRow {
  key: string;
  id: string;
  nome: string;
  formType: FormType | string;
  format: FormatType | string;
  updatedAt: string;
  bgColor: string;
  thumbnail: string | null;
}

/* ── Helpers ─────────────────────────────────────── */

const TYPE_META: Record<string, { label: string; color: string }> = {
  pacote:    { label: "Pacote",    color: "var(--orange)" },
  campanha:  { label: "Campanha",  color: "#D4A843" },
  passagem:  { label: "Passagem",  color: "#3B82F6" },
  cruzeiro:  { label: "Cruzeiro",  color: "#06B6D4" },
  anoiteceu: { label: "Anoiteceu", color: "#1E3A6E" },
  lamina:    { label: "Lâmina",    color: "#8B5CF6" },
};

const FORMAT_META: Record<string, { label: string; aspect: string }> = {
  stories: { label: "Stories", aspect: "9 / 16" },
  feed:    { label: "Feed",    aspect: "1 / 1"  },
  tv:      { label: "TV",      aspect: "16 / 9" },
};

function typeMeta(t: string) {
  return TYPE_META[t] ?? { label: t || "—", color: "#6B7280" };
}
function formatMeta(f: string) {
  return FORMAT_META[f] ?? { label: f || "—", aspect: "1 / 1" };
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

/* ── Página ──────────────────────────────────────── */

export default function VendedorTemplatesPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);


  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | FormType>("all");
  const [filterFormat, setFilterFormat] = useState<"all" | FormatType>("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const p = await getProfile(supabase);
      setProfile(p);
      if (!p?.licensee_id) { setLoading(false); return; }

      const { data } = await supabase
        .from("system_config")
        .select("key, value, updated_at")
        .like("key", "tmpl_%")
        .order("updated_at", { ascending: false });

      const rows: TemplateRow[] = [];
      for (const r of (data ?? []) as { key: string; value: string; updated_at: string }[]) {
        try {
          const parsed = JSON.parse(r.value);
          const lid = parsed.licenseeId ?? parsed.licensee_id ?? null;
          if (lid && lid.trim() !== p.licensee_id.trim()) continue;
          const nome = parsed.nome || r.key.replace(/^tmpl_/, "");
          const formType = parsed.formType || parsed.schema?.formType || "pacote";
          const format = parsed.format || parsed.schema?.format || "stories";
          const bgColor = parsed.bgColor || parsed.background || parsed.schema?.background || "#1E3A6E";
          const thumbnail = parsed.thumbnail || null;
          rows.push({
            key: r.key,
            id: r.key.replace(/^tmpl_/, ""),
            nome,
            formType,
            format,
            updatedAt: r.updated_at,
            bgColor,
            thumbnail,
          });
        } catch { /* skip */ }
      }
      setTemplates(rows);
    } catch (err) {
      console.error("[VendedorTemplates] load:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);


  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((t) => {
      if (filterType !== "all" && t.formType !== filterType) return false;
      if (filterFormat !== "all" && t.format !== filterFormat) return false;
      if (q && !t.nome.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [templates, filterType, filterFormat, search]);

  const useTemplate = (id: string) => {
    router.push(`/gerente/publicar?template=${id}`);
  };

  /* ── Render ────────────────────────────────────── */

  if (loading) {
    return <div className="text-[13px] text-[var(--txt3)]">Carregando templates...</div>;
  }

  return (
    <>
      {/* ═══ HEADER ═══ */}
      <div className="card-glass relative overflow-hidden px-7 py-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{ background: "linear-gradient(135deg, #1E3A6E 0%, var(--orange) 50%, #D4A843 100%)" }}
        />
        <div className="relative z-10 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--orange)]">
              Painel do Consultor · Biblioteca
            </p>
            <h1 className="mt-1.5 flex items-center gap-2 font-[family-name:var(--font-dm-serif)] text-[24px] font-bold leading-tight text-[var(--txt)]">
              <span>Meus Templates</span>
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full border border-[var(--bdr)] bg-[var(--bg2)] px-1.5 text-[10px] font-bold text-[var(--txt2)] tabular-nums align-middle">
                {templates.length}
              </span>
            </h1>
            <p className="mt-1 text-[12px] text-[var(--txt3)]">
              Modelos disponíveis para {profile?.licensee?.name || "sua agência"}.
            </p>
          </div>
        </div>
      </div>

      {/* ═══ FILTROS ═══ */}
      <div className="card-glass flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 lg:flex-1">
          <div className="relative flex-1 max-w-[360px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--txt3)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome..."
              className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] pl-9 pr-3 text-[12px] text-[var(--txt)] placeholder:text-[var(--txt3)] focus:border-[var(--orange)] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tipo */}
          <div className="flex items-center gap-1 rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] p-1">
            <FilterPill label="Todos" active={filterType === "all"} onClick={() => setFilterType("all")} />
            {(Object.keys(TYPE_META) as FormType[]).map((t) => (
              <FilterPill
                key={t}
                label={TYPE_META[t].label}
                color={TYPE_META[t].color}
                active={filterType === t}
                onClick={() => setFilterType(t)}
              />
            ))}
          </div>

          {/* Formato */}
          <div className="flex items-center gap-1 rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] p-1">
            <FilterPill label="Todos" active={filterFormat === "all"} onClick={() => setFilterFormat("all")} />
            {(Object.keys(FORMAT_META) as FormatType[]).map((f) => (
              <FilterPill
                key={f}
                label={FORMAT_META[f].label}
                active={filterFormat === f}
                onClick={() => setFilterFormat(f)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ═══ GRID ═══ */}
      {filtered.length === 0 ? (
        <div className="card-glass flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-[var(--orange)]"
            style={{
              background: "linear-gradient(135deg, rgba(255,122,26,0.18), rgba(30,58,110,0.12))",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <FileText size={24} />
          </div>
          <div className="font-[family-name:var(--font-dm-serif)] text-[18px] font-bold text-[var(--txt)]">
            {templates.length === 0 ? "Nenhum template disponível" : "Nenhum resultado"}
          </div>
          <p className="max-w-[380px] text-[12px] text-[var(--txt3)]">
            {templates.length === 0
              ? "Nenhum template disponível. Entre em contato com o administrador."
              : "Ajuste os filtros para encontrar o que procura."}
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
          {filtered.map((t) => (
            <TemplateCard key={t.key} tpl={t} onUse={() => useTemplate(t.id)} />
          ))}
        </div>
      )}
    </>
  );
}

/* ── Subcomponentes ──────────────────────────────── */

function FilterPill({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
        active
          ? "bg-[rgba(255,122,26,0.14)] text-[var(--orange)]"
          : "text-[var(--txt3)] hover:bg-[var(--hover-bg)] hover:text-[var(--txt2)]"
      }`}
      style={active && color ? { color, background: `${color}22` } : undefined}
    >
      {label}
    </button>
  );
}

function TemplateCard({ tpl, onUse }: { tpl: TemplateRow; onUse: () => void }) {
  const tMeta = typeMeta(tpl.formType);
  const fMeta = formatMeta(tpl.format);

  return (
    <div style={{ background: "var(--bg1)", border: "0.5px solid var(--bdr)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ height: 140, background: "#1E3A6E", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {tpl.thumbnail && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={tpl.thumbnail} alt={tpl.nome} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        )}
        <span style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 9, padding: "2px 8px", borderRadius: 4, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
          {fMeta.label}
        </span>
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "8px 12px",
          background: "rgba(255,255,255,0.25)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={tpl.nome}>
            {tpl.nome}
          </div>
          <span style={{ fontSize: 10, color: "#fff", opacity: 0.8 }}>{tMeta.label}</span>
        </div>
      </div>
      <button
        onClick={onUse}
        style={{ width: "100%", padding: 7, fontSize: 11, fontWeight: 600, color: "#fff", background: "var(--brand-gradient)", border: "none", borderRadius: "0 0 12px 12px", cursor: "pointer" }}
      >
        ✦ Usar
      </button>
    </div>
  );
}
