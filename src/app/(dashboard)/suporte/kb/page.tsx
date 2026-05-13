"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAdmGuard } from "@/contexts/AdmContext";
import { Search, Plus, X, Edit2, ToggleLeft, ToggleRight } from "lucide-react";

const CATEGORIES = [
  { value: "instagram", label: "Instagram" },
  { value: "publicacao", label: "Publicação" },
  { value: "templates", label: "Templates" },
  { value: "usuarios", label: "Usuários" },
  { value: "planos", label: "Planos" },
  { value: "limites", label: "Limites" },
  { value: "editor", label: "Editor" },
  { value: "geral", label: "Geral" },
];

const CAT_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c.label]),
);

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  times_used: number;
  helpful_count: number;
  not_helpful_count: number;
  is_active: boolean;
  created_at: string;
}

const EMPTY_FORM = {
  title: "",
  category: "geral",
  content: "",
  tags: [] as string[],
  is_active: true,
};

export default function KBPage() {
  const { allowed } = useAdmGuard("can_manage_configs");
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("knowledge_base")
      .select(
        "id, title, content, category, tags, times_used, helpful_count, not_helpful_count, is_active, created_at",
      )
      .order("created_at", { ascending: false });
    setArticles((data ?? []) as Article[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = articles.filter((a) => {
    const q = search.toLowerCase();
    const ms = !search ||
      a.title.toLowerCase().includes(q) ||
      a.tags.some((t) => t.toLowerCase().includes(q));
    const mc = !catFilter || a.category === catFilter;
    return ms && mc;
  });

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setTagInput("");
    setError("");
    setModalOpen(true);
  }

  function openEdit(a: Article) {
    setEditingId(a.id);
    setForm({
      title: a.title,
      category: a.category,
      content: a.content,
      tags: [...a.tags],
      is_active: a.is_active,
    });
    setTagInput("");
    setError("");
    setModalOpen(true);
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t)) setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    setTagInput("");
  }

  async function handleSave() {
    if (!form.title.trim() || !form.content.trim()) {
      setError("Título e conteúdo obrigatórios.");
      return;
    }
    setSaving(true);
    setError("");
    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      category: form.category,
      tags: form.tags,
      is_active: form.is_active,
    };
    if (editingId) {
      await supabase
        .from("knowledge_base")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", editingId);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("knowledge_base").insert({ ...payload, created_by: user?.id ?? null });
    }
    setSaving(false);
    setModalOpen(false);
    await load();
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase
      .from("knowledge_base")
      .update({ is_active: !current, updated_at: new Date().toISOString() })
      .eq("id", id);
    setArticles((prev) => prev.map((a) => (a.id === id ? { ...a, is_active: !current } : a)));
  }

  if (!allowed) return null;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--bdr)] pb-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--txt)]">Base de Conhecimento</h2>
          <p className="mt-0.5 text-sm text-[var(--txt3)]">
            {articles.length} artigos · {articles.filter((a) => a.is_active).length} ativos
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white"
          style={{ background: "#1A56C4" }}
        >
          <Plus size={15} /> Novo artigo
        </button>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--txt3)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título ou tag..."
            className="w-full rounded-xl border border-[var(--bdr)] bg-[var(--input-bg)] py-2 pl-9 pr-3 text-sm text-[var(--txt)] outline-none placeholder:text-[var(--txt3)] focus:border-blue-500"
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="rounded-xl border border-[var(--bdr)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--txt)] outline-none"
        >
          <option value="">Todas as categorias</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div
        className="mt-4 overflow-hidden rounded-xl border border-[var(--bdr)]"
        style={{ background: "var(--card-bg)" }}
      >
        {loading ? (
          <div className="py-12 text-center text-sm text-[var(--txt3)]">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-[var(--txt3)]">Nenhum artigo encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[var(--bdr)]">
                  {["Título", "Categoria", "Tags", "Uso", "Útil", "Status", ""].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-medium text-[var(--txt3)] first:pl-5 last:pr-5 last:text-right"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-[var(--bdr)] last:border-b-0 hover:bg-[var(--hover-bg)]"
                  >
                    <td className="max-w-[260px] truncate py-3 pl-5 pr-4 font-medium text-[var(--txt)]">
                      {a.title}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--txt2)]">
                      {CAT_LABEL[a.category] ?? a.category}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {a.tags.slice(0, 3).map((t) => (
                          <span
                            key={t}
                            className="rounded-full bg-[var(--bg3)] px-2 py-0.5 text-[10px] text-[var(--txt2)]"
                          >
                            {t}
                          </span>
                        ))}
                        {a.tags.length > 3 && (
                          <span className="text-[10px] text-[var(--txt3)]">+{a.tags.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--txt3)]">{a.times_used}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {a.helpful_count + a.not_helpful_count > 0 ? (
                        <span
                          className="text-[12px] font-medium"
                          style={{
                            color:
                              a.helpful_count > a.not_helpful_count ? "#22C55E" : "#EF4444",
                          }}
                        >
                          {a.helpful_count}/{a.helpful_count + a.not_helpful_count}
                        </span>
                      ) : (
                        <span className="text-[var(--txt3)]">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        onClick={() => toggleActive(a.id, a.is_active)}
                        className="flex items-center gap-1 text-[12px] font-medium"
                        style={{ color: a.is_active ? "#22C55E" : "#6b7280" }}
                      >
                        {a.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        {a.is_active ? "Ativo" : "Inativo"}
                      </button>
                    </td>
                    <td className="py-3 pl-4 pr-5 text-right">
                      <button
                        onClick={() => openEdit(a)}
                        className="text-[var(--txt3)] hover:text-[var(--txt)]"
                      >
                        <Edit2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div
            className="flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-[var(--bdr)]"
            style={{ background: "var(--card-bg)" }}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--bdr)] px-6 py-4">
              <h3 className="text-[15px] font-bold text-[var(--txt)]">
                {editingId ? "Editar artigo" : "Novo artigo"}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--txt3)] hover:bg-[var(--bg3)]"
              >
                <X size={15} />
              </button>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto px-6 py-4">
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-[var(--txt2)]">
                  Título *
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: Como conectar o Instagram"
                  className="w-full rounded-xl border border-[var(--bdr)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--txt)] outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-[var(--txt2)]">
                  Categoria
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--bdr)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--txt)] outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-[var(--txt2)]">
                  Tags
                </label>
                {form.tags.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {form.tags.map((t) => (
                      <span
                        key={t}
                        className="flex items-center gap-1 rounded-full bg-[var(--bg3)] px-2.5 py-0.5 text-[11px] text-[var(--txt2)]"
                      >
                        {t}
                        <button
                          onClick={() =>
                            setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }))
                          }
                          className="text-[var(--txt3)] hover:text-[var(--txt)]"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addTag(); }
                  }}
                  placeholder="Digite uma tag e pressione Enter"
                  className="w-full rounded-xl border border-[var(--bdr)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--txt)] outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-[var(--txt2)]">
                  Conteúdo *
                </label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  rows={8}
                  placeholder="Descreva a solução em detalhes..."
                  className="w-full resize-none rounded-xl border border-[var(--bdr)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--txt)] outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <button
                  onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
                  className="flex items-center gap-2 text-sm font-medium"
                  style={{ color: form.is_active ? "#22C55E" : "#6b7280" }}
                >
                  {form.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                  {form.is_active ? "Ativo" : "Inativo"}
                </button>
              </div>

              {error && <p className="text-[12px] text-red-500">{error}</p>}
            </div>

            <div className="flex shrink-0 justify-end gap-3 border-t border-[var(--bdr)] px-6 py-4">
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-xl px-4 py-2 text-sm text-[var(--txt3)] hover:text-[var(--txt)]"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "#1A56C4" }}
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
