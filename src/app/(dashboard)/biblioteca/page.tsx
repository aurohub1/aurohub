"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { uploadToCloudinary } from "@/lib/cloudinary";
import {
  Images, Plane, Ship, Building2, MapPin, Upload, Trash2,
  Search, X, Check, Loader2, Plus,
} from "lucide-react";

/* ── Tipos ───────────────────────────────────────── */

type TabKey = "destinos" | "hoteis" | "avioes" | "cruzeiros";

interface ImgDestino { id: number; nome: string; url: string; created_at: string; }
interface ImgHotel   { id: number; nome: string; url: string; created_at: string; }
interface ImgAviao   { id: number;                url: string; created_at: string; }
interface ImgCruise  { id: number; nome: string; url: string; cia: string | null; created_at: string; }

interface TabMeta {
  key: TabKey;
  label: string;
  table: string;
  icon: React.ReactNode;
  folder: string;
}

const TABS: TabMeta[] = [
  { key: "destinos",  label: "Destinos",  table: "imgfundo",  icon: <MapPin   size={14} />, folder: "aurohubv2/biblioteca/destinos" },
  { key: "hoteis",    label: "Hotéis",    table: "imghotel",  icon: <Building2 size={14} />, folder: "aurohubv2/biblioteca/hoteis" },
  { key: "avioes",    label: "Aviões",    table: "imgaviao",  icon: <Plane    size={14} />, folder: "aurohubv2/biblioteca/avioes" },
  { key: "cruzeiros", label: "Cruzeiros", table: "imgcruise", icon: <Ship     size={14} />, folder: "aurohubv2/biblioteca/cruzeiros" },
];

const CIAS = ["MSC", "Costa", "Royal", "Celebrity", "Princess", "Oceania", "Norwegian", "Disney"];

/* ── Helpers ─────────────────────────────────────── */

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

/* ── Página ──────────────────────────────────────── */

export default function BibliotecaPage() {
  const [tab, setTab] = useState<TabKey>("destinos");
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Datasets
  const [destinos, setDestinos] = useState<ImgDestino[]>([]);
  const [hoteis, setHoteis]     = useState<ImgHotel[]>([]);
  const [avioes, setAvioes]     = useState<ImgAviao[]>([]);
  const [cruises, setCruises]   = useState<ImgCruise[]>([]);

  // Modal
  const [uploadOpen, setUploadOpen] = useState(false);

  const tabMeta = TABS.find((t) => t.key === tab)!;

  /* ── Load ──────────────────────────────────────── */

  const loadTab = useCallback(async (k: TabKey) => {
    setLoading(true);
    try {
      const meta = TABS.find((t) => t.key === k)!;
      const { data, error } = await supabase
        .from(meta.table)
        .select("*")
        .order("id", { ascending: false })
        .limit(500);
      if (error) {
        console.error(`[Biblioteca] ${meta.table}:`, error);
        // tabela ausente → lista vazia em vez de crash
        if (k === "destinos")  setDestinos([]);
        if (k === "hoteis")    setHoteis([]);
        if (k === "avioes")    setAvioes([]);
        if (k === "cruzeiros") setCruises([]);
        return;
      }
      if (k === "destinos")  setDestinos((data ?? []) as ImgDestino[]);
      if (k === "hoteis")    setHoteis((data ?? []) as ImgHotel[]);
      if (k === "avioes")    setAvioes((data ?? []) as ImgAviao[]);
      if (k === "cruzeiros") setCruises((data ?? []) as ImgCruise[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTab(tab); }, [tab, loadTab]);

  /* ── Derived ───────────────────────────────────── */

  const items = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matches = (name: string, cia?: string | null) => {
      if (!q) return true;
      return name.toLowerCase().includes(q) || (cia ?? "").toLowerCase().includes(q);
    };
    if (tab === "destinos")  return destinos.filter((x) => matches(x.nome));
    if (tab === "hoteis")    return hoteis.filter((x) => matches(x.nome));
    if (tab === "avioes")    return avioes; // sem nome
    if (tab === "cruzeiros") return cruises.filter((x) => matches(x.nome, x.cia));
    return [];
  }, [tab, search, destinos, hoteis, avioes, cruises]);

  const counts = useMemo(() => ({
    destinos: destinos.length,
    hoteis:   hoteis.length,
    avioes:   avioes.length,
    cruzeiros: cruises.length,
  }), [destinos, hoteis, avioes, cruises]);

  /* ── Ações ─────────────────────────────────────── */

  async function handleDelete(table: string, id: number) {
    if (!confirm("Excluir esta imagem?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) { alert("Erro ao excluir: " + error.message); return; }
    await loadTab(tab);
  }

  /* ── Render ────────────────────────────────────── */

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
              Central ADM · Recursos
            </p>
            <h1 className="mt-1.5 flex items-center gap-3 font-[family-name:var(--font-dm-serif)] text-[24px] font-bold leading-tight text-[var(--txt)]">
              <Images size={22} className="text-[var(--orange)]" />
              Biblioteca de Imagens
            </h1>
            <p className="mt-1 text-[12px] text-[var(--txt3)]">
              Fundos, hotéis, aviões e cruzeiros usados pelos editores e publicações.
            </p>
          </div>

          <button
            onClick={() => setUploadOpen(true)}
            className="flex shrink-0 items-center gap-2 rounded-xl px-5 py-3 text-[13px] font-semibold text-white shadow-lg transition-transform hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, var(--orange), #D4A843)" }}
          >
            <Plus size={15} /> Nova imagem
          </button>
        </div>
      </div>

      {/* ═══ TABS ═══ */}
      <div className="card-glass flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-1 rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition-colors"
              style={
                tab === t.key
                  ? { background: "rgba(255,122,26,0.14)", color: "var(--orange)" }
                  : { color: "var(--txt3)" }
              }
            >
              {t.icon}
              {t.label}
              <span
                className="ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums"
                style={
                  tab === t.key
                    ? { background: "rgba(255,122,26,0.22)", color: "var(--orange)" }
                    : { background: "var(--bg2)", color: "var(--txt3)" }
                }
              >
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>

        {tab !== "avioes" && (
          <div className="relative max-w-[320px] flex-1 lg:flex-none lg:w-[320px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--txt3)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === "cruzeiros" ? "Buscar navio ou CIA..." : "Buscar por nome..."}
              className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] pl-9 pr-3 text-[12px] text-[var(--txt)] placeholder:text-[var(--txt3)] focus:border-[var(--orange)] focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* ═══ GRID ═══ */}
      {loading ? (
        <div className="text-[13px] text-[var(--txt3)]">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="card-glass flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-[var(--orange)]"
            style={{
              background: "linear-gradient(135deg, rgba(255,122,26,0.18), rgba(30,58,110,0.12))",
              border: "1px solid var(--bdr2)",
            }}
          >
            {tabMeta.icon}
          </div>
          <div className="font-[family-name:var(--font-dm-serif)] text-[18px] font-bold text-[var(--txt)]">
            {search ? "Nenhum resultado" : `Nenhum${tab === "avioes" ? " avião" : tab === "cruzeiros" ? " cruzeiro" : tab === "hoteis" ? " hotel" : " destino"} cadastrado`}
          </div>
          <p className="max-w-[380px] text-[12px] text-[var(--txt3)]">
            {search
              ? "Ajuste a busca ou adicione uma imagem nova."
              : "Clique em “Nova imagem” para fazer upload."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((it) => {
            type Item = ImgDestino | ImgHotel | ImgAviao | ImgCruise;
            const item = it as Item;
            const hasNome = "nome" in item;
            const hasCia = "cia" in item;
            return (
              <div
                key={item.id}
                className="card-glass group flex flex-col overflow-hidden transition-transform hover:-translate-y-0.5 page-fade"
              >
                <div className="relative aspect-[4/5] w-full overflow-hidden border-b border-[var(--bdr)] bg-[var(--bg2)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt={hasNome ? (item as ImgDestino).nome : "imagem"} className="h-full w-full object-cover" />
                  <button
                    onClick={() => handleDelete(tabMeta.table, item.id)}
                    title="Excluir"
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white opacity-0 backdrop-blur transition-opacity hover:bg-[#EF4444] group-hover:opacity-100"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="flex flex-col gap-0.5 p-3">
                  {hasNome ? (
                    <h3 className="truncate text-[12px] font-bold text-[var(--txt)]" title={(item as ImgDestino).nome}>
                      {(item as ImgDestino).nome}
                    </h3>
                  ) : (
                    <h3 className="truncate text-[12px] font-bold text-[var(--txt3)] italic">
                      Sem rótulo
                    </h3>
                  )}
                  {hasCia && (item as ImgCruise).cia && (
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#D4A843]">
                      {(item as ImgCruise).cia}
                    </div>
                  )}
                  <div className="text-[10px] text-[var(--txt3)]">
                    {formatDate(item.created_at)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ MODAL UPLOAD ═══ */}
      {uploadOpen && (
        <UploadModal
          tab={tab}
          onClose={() => setUploadOpen(false)}
          onSaved={async () => {
            setUploadOpen(false);
            await loadTab(tab);
          }}
        />
      )}
    </>
  );
}

/* ── Modal de Upload ─────────────────────────────── */

function UploadModal({
  tab,
  onClose,
  onSaved,
}: {
  tab: TabKey;
  onClose: () => void;
  onSaved: () => void;
}) {
  const meta = TABS.find((t) => t.key === tab)!;
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [nome, setNome] = useState("");
  const [cia, setCia] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function pickFile(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) { setError("Arquivo inválido — envie uma imagem."); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError("");
  }

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    pickFile(e.target.files?.[0] ?? null);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    pickFile(e.dataTransfer.files?.[0] ?? null);
  }

  const needsNome = tab !== "avioes";
  const valid = !!file && (!needsNome || nome.trim().length > 0);

  async function save() {
    if (!valid || saving || !file) return;
    setSaving(true);
    setError("");
    try {
      const url = await uploadToCloudinary(file, meta.folder);
      const row: Record<string, unknown> = { url };
      if (needsNome) row.nome = nome.trim();
      if (tab === "cruzeiros") row.cia = cia.trim() || null;

      const { error: insErr } = await supabase.from(meta.table).insert(row);
      if (insErr) throw new Error(insErr.message);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="card-glass w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--bdr)] px-5 py-4">
          <h3 className="flex items-center gap-2 font-[family-name:var(--font-dm-serif)] text-[18px] font-bold text-[var(--txt)]">
            {meta.icon} Nova imagem · {meta.label}
          </h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--bdr2)] text-[var(--txt3)] transition-colors hover:border-[rgba(239,68,68,0.3)] hover:bg-[rgba(239,68,68,0.12)] hover:text-[#EF4444]"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          {/* Dropzone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--bdr2)] px-6 py-8 text-center transition-colors hover:border-[var(--orange)]"
          >
            {preview ? (
              <div className="w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="preview" className="mx-auto max-h-[220px] rounded-lg object-contain" />
                <p className="mt-2 text-[10px] text-[var(--txt3)]">{file?.name}</p>
              </div>
            ) : (
              <>
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-2xl text-[var(--orange)]"
                  style={{
                    background: "linear-gradient(135deg, rgba(255,122,26,0.18), rgba(30,58,110,0.12))",
                    border: "1px solid var(--bdr2)",
                  }}
                >
                  <Upload size={18} />
                </div>
                <div className="text-[12px] font-semibold text-[var(--txt)]">
                  Arraste ou clique para enviar
                </div>
                <div className="text-[10px] text-[var(--txt3)]">PNG, JPG, WEBP</div>
              </>
            )}
            <input ref={inputRef} type="file" accept="image/*" onChange={onFileInput} className="hidden" />
          </div>

          {/* Campos específicos */}
          {needsNome && (
            <Field label={tab === "destinos" ? "Destino *" : tab === "hoteis" ? "Nome do hotel *" : "Nome do navio *"}>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder={tab === "destinos" ? "Ex.: Fernando de Noronha" : tab === "hoteis" ? "Ex.: Tivoli Mofarrej" : "Ex.: Splendida"}
                className="h-9 w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 text-[12px] text-[var(--txt)] placeholder:text-[var(--txt3)] focus:border-[var(--orange)] focus:outline-none"
              />
            </Field>
          )}

          {tab === "cruzeiros" && (
            <Field label="Companhia marítima">
              <div className="flex flex-wrap gap-1.5">
                {CIAS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCia(cia === c ? "" : c)}
                    className="rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors"
                    style={
                      cia === c
                        ? { borderColor: "#D4A843", background: "rgba(212,168,67,0.18)", color: "#D4A843" }
                        : { borderColor: "var(--bdr)", color: "var(--txt3)" }
                    }
                  >
                    {c}
                  </button>
                ))}
              </div>
              <input
                value={cia}
                onChange={(e) => setCia(e.target.value)}
                placeholder="Ou digite livremente..."
                className="mt-2 h-9 w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 text-[12px] text-[var(--txt)] placeholder:text-[var(--txt3)] focus:border-[var(--orange)] focus:outline-none"
              />
            </Field>
          )}

          {tab === "avioes" && (
            <div className="rounded-lg border border-[var(--bdr)] bg-[var(--bg2)] px-3 py-2 text-[11px] text-[var(--txt3)]">
              Aviões não têm nome — o sistema escolhe uma imagem aleatória do pool.
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-[var(--red)] bg-[var(--red3)] px-3 py-2 text-[11px] font-semibold text-[var(--red)]">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--bdr)] px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-[var(--bdr)] px-4 py-2 text-[12px] font-semibold text-[var(--txt2)] transition-colors hover:bg-[var(--hover-bg)]"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={!valid || saving}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold text-white shadow-sm transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            style={{ background: "linear-gradient(135deg, var(--orange), #D4A843)" }}
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">
        {label}
      </label>
      {children}
    </div>
  );
}
