"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Pencil, Trash2, Calendar, Save, X } from "lucide-react";

interface DataComemorativa {
  id: string;
  nome: string;
  data_mes: number | null;
  data_dia: number | null;
  tipo: string | null;
  segment_id: string | null;
  created_at: string;
}

interface Segment { id: string; name: string; }

const TIPO_OPTIONS: { v: string; label: string; color: string }[] = [
  { v: "feriado",     label: "Feriado",     color: "#EF4444" },
  { v: "vespera",     label: "Véspera",     color: "#FF7A1A" },
  { v: "temporada",   label: "Temporada",   color: "#3B82F6" },
  { v: "evento",      label: "Evento",      color: "#D4A843" },
  { v: "segmento",    label: "Segmento",    color: "#A78BFA" },
  { v: "dia_nacional",label: "Dia nacional",color: "#10B981" },
];

const TIPO_LABEL: Record<string, string> = Object.fromEntries(TIPO_OPTIONS.map(t => [t.v, t.label]));
const TIPO_COLOR: Record<string, string> = Object.fromEntries(TIPO_OPTIONS.map(t => [t.v, t.color]));

const MESES_SHORT = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

function pad(n: number): string { return String(n).padStart(2, "0"); }

function formatDia(row: DataComemorativa): string {
  if (row.data_mes && row.data_dia) return `${pad(row.data_dia)} ${MESES_SHORT[row.data_mes - 1]}`;
  return "—";
}

function tipoColor(tipo: string | null): string {
  return (tipo && TIPO_COLOR[tipo]) || "var(--txt3)";
}

interface FormState {
  id: string | null;
  nome: string;
  data: string;          // YYYY-MM-DD (UI only — separa em mes/dia ao salvar; ano ignorado)
  tipo: string;
  segment_id: string;
}

const EMPTY_FORM: FormState = {
  id: null,
  nome: "",
  data: "",
  tipo: "feriado",
  segment_id: "",
};

export default function AdmDatasComemorativasPage() {
  const [rows, setRows] = useState<DataComemorativa[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [dRes, sRes] = await Promise.all([
      supabase
        .from("datas_comemorativas")
        .select("id, nome, data_mes, data_dia, tipo, segment_id, created_at")
        .order("data_mes", { ascending: true, nullsFirst: false })
        .order("data_dia", { ascending: true, nullsFirst: false }),
      supabase.from("segments").select("id, name").order("name"),
    ]);
    if (dRes.error) console.error("[datas-comemorativas]", dRes.error);
    setRows((dRes.data as DataComemorativa[]) ?? []);
    setSegments((sRes.data as Segment[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const segMap = useMemo(() => Object.fromEntries(segments.map(s => [s.id, s.name])), [segments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (filter !== "all" && r.tipo !== filter) return false;
      if (q && !r.nome.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, filter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const t of TIPO_OPTIONS) c[t.v] = 0;
    for (const r of rows) if (r.tipo) c[r.tipo] = (c[r.tipo] ?? 0) + 1;
    return c;
  }, [rows]);

  function openNew() {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(row: DataComemorativa) {
    const year = new Date().getFullYear();
    const dataIso = row.data_mes && row.data_dia
      ? `${year}-${pad(row.data_mes)}-${pad(row.data_dia)}`
      : "";
    setForm({
      id: row.id,
      nome: row.nome,
      data: dataIso,
      tipo: row.tipo ?? "feriado",
      segment_id: row.segment_id ?? "",
    });
    setModalOpen(true);
  }

  async function save() {
    if (!form.nome.trim() || !form.data) return;
    const d = new Date(form.data + "T12:00:00");
    if (isNaN(d.getTime())) { alert("Data inválida"); return; }
    const payload = {
      nome: form.nome.trim(),
      data_mes: d.getMonth() + 1,
      data_dia: d.getDate(),
      tipo: form.tipo || null,
      segment_id: form.segment_id || null,
    };
    setSaving(true);
    try {
      if (form.id) {
        const { error } = await supabase.from("datas_comemorativas").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("datas_comemorativas").insert(payload);
        if (error) throw error;
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      console.error("[datas-comemorativas] save", err);
      alert(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: DataComemorativa) {
    if (!confirm(`Excluir "${row.nome}"?`)) return;
    const { error } = await supabase.from("datas_comemorativas").delete().eq("id", row.id);
    if (error) { alert(error.message); return; }
    await load();
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-end justify-between pb-4" style={{ borderBottom: "1px solid var(--bdr)" }}>
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--txt)" }}>Datas Comemorativas</h2>
          <p className="mt-0.5 text-sm" style={{ color: "var(--txt2)" }}>
            Catálogo global de feriados, comemorações e eventos — mostrados nos calendários de todos os roles.
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-semibold text-white shadow-lg"
          style={{ background: "linear-gradient(135deg, var(--orange), #D4A843)" }}
        >
          <Plus size={14} /> Nova data
        </button>
      </div>

      {/* Filtros */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className="px-3.5 py-1.5 text-xs font-medium rounded-full transition-all"
            style={filter === "all"
              ? { background: "var(--blue)", color: "#fff", border: "1px solid transparent" }
              : { background: "transparent", color: "var(--txt2)", border: "1px solid var(--bdr2)" }}
          >
            Todas ({counts.all})
          </button>
          {TIPO_OPTIONS.map(o => {
            const active = filter === o.v;
            return (
              <button
                key={o.v}
                type="button"
                onClick={() => setFilter(o.v)}
                className="px-3.5 py-1.5 text-xs font-medium rounded-full transition-all"
                style={active
                  ? { background: "var(--blue)", color: "#fff", border: "1px solid transparent" }
                  : { background: "transparent", color: "var(--txt2)", border: "1px solid var(--bdr2)" }}
              >
                {o.label} ({counts[o.v] ?? 0})
              </button>
            );
          })}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome..."
          className="h-8 flex-1 min-w-[200px] max-w-xs rounded-full px-4 text-xs outline-none"
          style={{ background: "transparent", border: "1px solid var(--bdr2)", color: "var(--txt)" }}
        />
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="mt-6 animate-pulse rounded-[20px] h-96 w-full" style={{ background: "var(--input-bg)" }} />
      ) : filtered.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center py-16 text-center"
          style={{ background: "var(--input-bg)", border: "1px dashed var(--bdr2)", borderRadius: 20 }}>
          <Calendar size={24} style={{ color: "var(--txt3)" }} />
          <p className="mt-3 text-sm" style={{ color: "var(--txt2)" }}>Nenhuma data encontrada.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--bdr)]" style={{ background: "var(--bg1)" }}>
          <table className="w-full text-[12px]">
            <thead>
              <tr style={{ background: "var(--bg2)", borderBottom: "1px solid var(--bdr)" }}>
                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[var(--txt3)]" style={{ fontSize: 10 }}>Data</th>
                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[var(--txt3)]" style={{ fontSize: 10 }}>Nome</th>
                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[var(--txt3)]" style={{ fontSize: 10 }}>Tipo</th>
                <th className="px-4 py-3 text-left font-bold uppercase tracking-wider text-[var(--txt3)]" style={{ fontSize: 10 }}>Segmento</th>
                <th className="px-4 py-3 text-right font-bold uppercase tracking-wider text-[var(--txt3)]" style={{ fontSize: 10 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-[var(--bdr)] hover:bg-[var(--hover-bg)]">
                  <td className="px-4 py-3 tabular-nums font-semibold text-[var(--txt)]">{formatDia(r)}</td>
                  <td className="px-4 py-3 text-[var(--txt)]">{r.nome}</td>
                  <td className="px-4 py-3">
                    {r.tipo ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                        style={{ background: `${tipoColor(r.tipo)}22`, color: tipoColor(r.tipo) }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: tipoColor(r.tipo) }} />
                        {TIPO_LABEL[r.tipo] ?? r.tipo}
                      </span>
                    ) : (
                      <span className="text-[var(--txt3)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--txt3)]">
                    {r.segment_id ? (segMap[r.segment_id] ?? "—") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(r)} className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--txt2)] hover:bg-[var(--bg3)]" title="Editar">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => remove(r)} className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--red)] hover:bg-[var(--red3)]" title="Excluir">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-6 w-full max-w-md rounded-2xl border border-[var(--bdr)] bg-[var(--bg1)] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-[var(--txt)]">
                {form.id ? "Editar data" : "Nova data"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--txt3)] hover:bg-[var(--bg3)]">
                <X size={14} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--txt3)]">Nome</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex.: Dia das Mães"
                  autoFocus
                  className="rounded-lg border border-[var(--bdr)] bg-[var(--bg2)] px-3 py-2 text-[12px] text-[var(--txt)] outline-none focus:border-[var(--orange)]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--txt3)]">
                  Data <span className="text-[var(--txt3)] font-normal normal-case tracking-normal">(ano ignorado — salva mês/dia)</span>
                </label>
                <input
                  type="date"
                  value={form.data}
                  onChange={(e) => setForm(f => ({ ...f, data: e.target.value }))}
                  className="rounded-lg border border-[var(--bdr)] bg-[var(--bg2)] px-3 py-2 text-[12px] text-[var(--txt)] outline-none focus:border-[var(--orange)]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--txt3)]">Tipo</label>
                <div className="flex gap-1.5 flex-wrap">
                  {TIPO_OPTIONS.map(t => {
                    const active = form.tipo === t.v;
                    return (
                      <button
                        key={t.v}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, tipo: t.v }))}
                        className="rounded-full px-3 py-1.5 text-[11px] font-semibold"
                        style={active
                          ? { background: t.color, color: "#fff" }
                          : { background: "transparent", color: "var(--txt2)", border: "1px solid var(--bdr2)" }}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--txt3)]">
                  Segmento <span className="text-[var(--txt3)] font-normal normal-case tracking-normal">(opcional)</span>
                </label>
                <select
                  value={form.segment_id}
                  onChange={(e) => setForm(f => ({ ...f, segment_id: e.target.value }))}
                  className="rounded-lg border border-[var(--bdr)] bg-[var(--bg2)] px-3 py-2 text-[12px] text-[var(--txt)] outline-none focus:border-[var(--orange)]"
                >
                  <option value="">— Nenhum —</option>
                  {segments.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-[var(--bdr)] px-4 py-2 text-[12px] font-semibold text-[var(--txt2)] hover:bg-[var(--hover-bg)]"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving || !form.nome.trim() || !form.data}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold text-white shadow-lg disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, var(--orange), #D4A843)" }}
              >
                <Save size={13} /> {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
