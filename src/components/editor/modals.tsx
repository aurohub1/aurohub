"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Stage, Layer, Rect, Image as KImage, Transformer } from "react-konva";
import type Konva from "konva";
import { X, Search, Save, Upload, Heart, Send, MessageCircle, Bookmark, MoreHorizontal, Plus, Pencil, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getProfile } from "@/lib/auth";
import { EditorElement, EditorSchema, QUICK_START_PRESETS, rescaleSchema, genId } from "./types";

/* ── Shared UI ──────────────────────────────────── */
function Modal({ title, onClose, children, width = 640 }: { title: string; onClose: () => void; children: React.ReactNode; width?: number }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width, maxWidth: "95vw", maxHeight: "90vh", background: "var(--ed-surface)", border: "1px solid var(--ed-bdr)", borderRadius: 12, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--ed-bdr)" }}>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "var(--ed-txt)" }}>{title}</span>
          <button onClick={onClose} style={{ width: 26, height: 26, borderRadius: 6, border: "none", background: "var(--ed-hover)", color: "var(--ed-txt2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={14} /></button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>{children}</div>
      </div>
    </div>
  );
}

/* ══ 5. SALVAR COMO COMPONENTE ══════════════════════ */
export function SaveComponentModal({ elements, onClose, onSaved }: { elements: EditorElement[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await supabase.from("editor_components").insert({
        name: name.trim(),
        schema: { elements },
        thumbnail: null,
        licensee_id: null,
      });
      onSaved();
      onClose();
    } catch (err) { console.error("[SaveComponent]", err); alert("Erro ao salvar."); }
    finally { setSaving(false); }
  };
  return (
    <Modal title="Salvar como componente" onClose={onClose} width={420}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 11, color: "var(--ed-txt2)" }}>{elements.length} elemento(s) selecionado(s)</div>
        <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Nome do componente" style={{ height: 38, borderRadius: 8, border: "1px solid var(--ed-bdr)", background: "var(--ed-input)", color: "var(--ed-txt)", padding: "0 12px", fontSize: 13, outline: "none" }} />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--ed-bdr)", background: "transparent", color: "var(--ed-txt2)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Cancelar</button>
          <button onClick={save} disabled={saving || !name.trim()} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#FF7A1A", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 700, opacity: saving || !name.trim() ? 0.5 : 1 }}><Save size={12} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />Salvar</button>
        </div>
      </div>
    </Modal>
  );
}

/* ══ 5. PAINEL COMPONENTES ══════════════════════════ */
interface DbComponent { id: string; name: string; schema: { elements: EditorElement[] }; thumbnail: string | null; created_at: string; }
export function ComponentsPanel({ onClose, onInsert }: { onClose: () => void; onInsert: (elements: EditorElement[]) => void }) {
  const [list, setList] = useState<DbComponent[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from("editor_components").select("*").order("created_at", { ascending: false }).limit(60);
        setList((data as DbComponent[]) || []);
      } catch (err) { console.error("[Components]", err); }
      finally { setLoading(false); }
    })();
  }, []);
  const insert = (c: DbComponent) => {
    const regenerated = c.schema.elements.map(el => ({ ...el, id: genId() }));
    onInsert(regenerated);
    onClose();
  };
  return (
    <Modal title="Componentes salvos" onClose={onClose} width={720}>
      {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--ed-txt3)", fontSize: 11 }}>Carregando...</div>
        : list.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "var(--ed-txt3)", fontSize: 11 }}>Nenhum componente salvo ainda. Selecione elementos no canvas e clique em &quot;Salvar componente&quot;.</div>
        : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
          {list.map(c => (
            <button key={c.id} onClick={() => insert(c)} style={{ display: "flex", flexDirection: "column", alignItems: "stretch", padding: 8, borderRadius: 8, border: "1px solid var(--ed-bdr)", background: "var(--ed-input)", cursor: "pointer", color: "var(--ed-txt)" }}>
              <div style={{ aspectRatio: "1", background: c.thumbnail ? `url(${c.thumbnail}) center/contain no-repeat` : "var(--ed-hover)", borderRadius: 6, marginBottom: 6 }} />
              <span style={{ fontSize: 11, fontWeight: 600, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
              <span style={{ fontSize: 9, color: "var(--ed-txt3)", textAlign: "left" }}>{c.schema.elements.length} elem</span>
            </button>
          ))}
        </div>}
    </Modal>
  );
}

/* ══ 6. BIBLIOTECA DE ASSETS (Cloudinary) ══════════ */
type AssetTab = "imagens" | "logos" | "badges";
interface CloudResource { public_id: string; secure_url: string; width: number; height: number; filename: string; }
export function AssetsPanel({ onClose, onInsert }: { onClose: () => void; onInsert: (url: string, w: number, h: number) => void }) {
  const [tab, setTab] = useState<AssetTab>("imagens");
  const [q, setQ] = useState("");
  const [list, setList] = useState<CloudResource[]>([]);
  const [loading, setLoading] = useState(false);
  const folderFor = (t: AssetTab) => t === "imagens" ? "aurohubv2/imagens" : t === "logos" ? "aurohubv2/logos" : "aurohubv2/badges";
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cloudinary/list?folder=${encodeURIComponent(folderFor(tab))}&q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setList(data.resources || []);
    } catch (err) { console.error("[Assets]", err); }
    finally { setLoading(false); }
  }, [tab, q]);
  useEffect(() => { load(); }, [tab]);
  return (
    <Modal title="Biblioteca de Assets" onClose={onClose} width={760}>
      <div style={{ display: "flex", gap: 4, marginBottom: 10, borderBottom: "1px solid var(--ed-bdr)", paddingBottom: 6 }}>
        {(["imagens", "logos", "badges"] as AssetTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: tab === t ? "var(--ed-active)" : "transparent", color: tab === t ? "var(--ed-active-txt)" : "var(--ed-txt2)", fontSize: 11, fontWeight: 700, cursor: "pointer", textTransform: "capitalize" }}>{t}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, padding: "0 10px", height: 34, borderRadius: 8, border: "1px solid var(--ed-bdr)", background: "var(--ed-input)" }}>
          <Search size={13} color="var(--ed-txt3)" />
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && load()} placeholder="Buscar por nome..." style={{ flex: 1, border: "none", background: "transparent", color: "var(--ed-txt)", fontSize: 11, outline: "none" }} />
        </div>
        <button onClick={load} style={{ padding: "0 14px", height: 34, borderRadius: 8, border: "none", background: "var(--ed-accent)", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Buscar</button>
      </div>
      {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--ed-txt3)", fontSize: 11 }}>Carregando...</div>
        : list.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "var(--ed-txt3)", fontSize: 11 }}>Nenhum asset encontrado.</div>
        : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 8 }}>
          {list.map(r => (
            <button key={r.public_id} onClick={() => { onInsert(r.secure_url, r.width, r.height); onClose(); }} title={r.filename} style={{ aspectRatio: "1", padding: 4, borderRadius: 6, border: "1px solid var(--ed-bdr)", background: `var(--ed-input) url(${r.secure_url}) center/contain no-repeat`, cursor: "pointer" }} />
          ))}
        </div>}
    </Modal>
  );
}

/* ══ 7. HISTÓRICO VISUAL ═══════════════════════════ */
interface HistoryEntry { id: string; template_id: string; schema: EditorSchema; thumbnail: string | null; created_at: string; }
export function HistoryPanel({ templateId, onClose, onRestore }: { templateId: string; onClose: () => void; onRestore: (s: EditorSchema) => void }) {
  const [list, setList] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from("template_history").select("*").eq("template_id", templateId).order("created_at", { ascending: false }).limit(40);
        setList((data as HistoryEntry[]) || []);
      } catch (err) { console.error("[History]", err); }
      finally { setLoading(false); }
    })();
  }, [templateId]);
  return (
    <Modal title="Histórico de versões" onClose={onClose} width={720}>
      {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--ed-txt3)", fontSize: 11 }}>Carregando...</div>
        : list.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "var(--ed-txt3)", fontSize: 11 }}>Nenhuma versão ainda. Salve o template para criar a primeira.</div>
        : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
          {list.map(h => (
            <button key={h.id} onClick={() => { onRestore(h.schema); onClose(); }} style={{ display: "flex", flexDirection: "column", padding: 6, borderRadius: 8, border: "1px solid var(--ed-bdr)", background: "var(--ed-input)", cursor: "pointer", color: "var(--ed-txt)" }}>
              <div style={{ aspectRatio: "9/16", background: h.thumbnail ? `url(${h.thumbnail}) center/contain no-repeat #000` : "var(--ed-hover)", borderRadius: 6, marginBottom: 4 }} />
              <span style={{ fontSize: 10, color: "var(--ed-txt2)", textAlign: "left" }}>{new Date(h.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
            </button>
          ))}
        </div>}
    </Modal>
  );
}

/* ══ 8. QUICK START ════════════════════════════════ */
export const STARTER_KEY_PREFIX = "starter_tmpl_";
type Preset = typeof QUICK_START_PRESETS[number];

export function QuickStartModal({ onClose, onPick, onEdit }: {
  onClose: () => void;
  onPick: (preset: Preset) => void;
  onEdit?: (preset: Preset, starterKey: string) => void;
}) {
  const [overrides, setOverrides] = useState<Record<string, { schema: EditorSchema; thumbnail: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const fetchOverrides = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from("system_config").select("key,value").like("key", `${STARTER_KEY_PREFIX}%`);
      const map: Record<string, { schema: EditorSchema; thumbnail: string | null }> = {};
      (data || []).forEach((r: { key: string; value: string }) => {
        try {
          const parsed = JSON.parse(r.value);
          const id = r.key.slice(STARTER_KEY_PREFIX.length);
          map[id] = { schema: parsed.schema || parsed, thumbnail: parsed.thumbnail || null };
        } catch {}
      });
      setOverrides(map);
    } catch (err) { console.error("[Starters]", err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOverrides(); }, [fetchOverrides]);

  const resolved: Preset[] = QUICK_START_PRESETS.map(p => {
    const ov = overrides[p.id];
    return ov ? { ...p, schema: ov.schema } : p;
  });
  const getThumb = (id: string) => overrides[id]?.thumbnail || null;

  const restoreDefault = async (e: React.MouseEvent, preset: Preset) => {
    e.stopPropagation();
    if (!confirm(`Restaurar "${preset.name}" para o padrão de fábrica?`)) return;
    setBusy(preset.id);
    try {
      await supabase.from("system_config").delete().eq("key", `${STARTER_KEY_PREFIX}${preset.id}`);
      await fetchOverrides();
    } catch (err) { console.error("[Restore]", err); alert("Erro ao restaurar."); }
    finally { setBusy(null); }
  };

  const editPreset = (e: React.MouseEvent, preset: Preset) => {
    e.stopPropagation();
    if (!onEdit) return;
    onEdit(preset, `${STARTER_KEY_PREFIX}${preset.id}`);
    onClose();
  };

  return (
    <Modal title="Começar novo template" onClose={onClose} width={780}>
      {loading && <div style={{ fontSize: 10, color: "var(--ed-txt3)", marginBottom: 8 }}>Carregando customizações...</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {resolved.map(p => {
          const isCustom = !!overrides[p.id];
          const thumb = getThumb(p.id);
          return (
            <div key={p.id} onClick={() => { onPick(p); onClose(); }} style={{ position: "relative", display: "flex", flexDirection: "column", padding: 10, borderRadius: 10, border: isCustom ? "1px solid var(--ed-bind)" : "1px solid var(--ed-bdr)", background: "var(--ed-input)", cursor: "pointer", color: "var(--ed-txt)" }}>
              {isCustom && (
                <span style={{ position: "absolute", top: 6, left: 6, padding: "2px 6px", borderRadius: 4, background: "var(--ed-bind)", color: "#0c0c12", fontSize: 8, fontWeight: 800, letterSpacing: 0.5, zIndex: 2 }}>CUSTOM</span>
              )}
              <div style={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 4, zIndex: 2 }}>
                {onEdit && p.id !== "blank" && (
                  <button onClick={e => editPreset(e, p)} title="Editar template padrão" style={iconBtnS}>
                    <Pencil size={11} />
                  </button>
                )}
                {isCustom && (
                  <button onClick={e => restoreDefault(e, p)} disabled={busy === p.id} title="Restaurar padrão de fábrica" style={{ ...iconBtnS, color: "var(--ed-danger)" }}>
                    <RotateCcw size={11} />
                  </button>
                )}
              </div>
              <div style={{
                aspectRatio: p.format === "feed" ? "4/5" : p.format === "tv" ? "16/9" : "9/16",
                background: thumb ? `url(${thumb}) center/contain no-repeat #000` : (p.schema.background || "#000"),
                borderRadius: 6, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, opacity: thumb ? 1 : 0.8
              }}>
                {!thumb && (p.id === "blank" ? <Plus size={24} /> : `${p.schema.elements.length} elem`)}
              </div>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{p.name}</span>
              <span style={{ fontSize: 10, color: "var(--ed-txt3)" }}>{p.formType} · {p.format}</span>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

const iconBtnS: React.CSSProperties = { width: 22, height: 22, borderRadius: 5, border: "none", background: "rgba(0,0,0,0.5)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };

/* ══ 9. DESTINOS ═══════════════════════════════════ */
interface DestinoRow { id: string | number; destino: string; img_destinos: string; }
export function DestinosPanel({ onClose, onPick }: { onClose: () => void; onPick: (url: string, asBackground: boolean) => void }) {
  const [q, setQ] = useState("");
  const [list, setList] = useState<DestinoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const search = useCallback(async () => {
    setLoading(true);
    try {
      const query = supabase.from("import_destinos").select("id,destino,img_destinos").limit(40);
      const { data } = q.trim()
        ? await query.ilike("destino", `%${q.trim()}%`)
        : await query;
      setList((data as DestinoRow[])?.filter(d => !!d.img_destinos) || []);
    } catch (err) { console.error("[Destinos]", err); }
    finally { setLoading(false); }
  }, [q]);
  useEffect(() => { search(); }, []);
  return (
    <Modal title="Banco de imagens — Destinos" onClose={onClose} width={760}>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, padding: "0 10px", height: 34, borderRadius: 8, border: "1px solid var(--ed-bdr)", background: "var(--ed-input)" }}>
          <Search size={13} color="var(--ed-txt3)" />
          <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} placeholder="Buscar destino (ex: Cancún, Paris)..." style={{ flex: 1, border: "none", background: "transparent", color: "var(--ed-txt)", fontSize: 11, outline: "none" }} />
        </div>
        <button onClick={search} style={{ padding: "0 14px", height: 34, borderRadius: 8, border: "none", background: "var(--ed-accent)", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Buscar</button>
      </div>
      {loading ? <div style={{ textAlign: "center", padding: 40, color: "var(--ed-txt3)", fontSize: 11 }}>Carregando...</div>
        : list.length === 0 ? <div style={{ textAlign: "center", padding: 40, color: "var(--ed-txt3)", fontSize: 11 }}>Nenhum destino encontrado.</div>
        : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
          {list.map(d => (
            <div key={d.id} style={{ border: "1px solid var(--ed-bdr)", borderRadius: 8, overflow: "hidden", background: "var(--ed-input)" }}>
              <div style={{ aspectRatio: "1", background: `url(${d.img_destinos}) center/cover`, borderBottom: "1px solid var(--ed-bdr)" }} />
              <div style={{ padding: 6 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: "var(--ed-txt)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 4 }}>{d.destino}</div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => { onPick(d.img_destinos, false); onClose(); }} style={{ flex: 1, padding: "4px 0", borderRadius: 4, border: "none", background: "var(--ed-hover)", color: "var(--ed-txt2)", fontSize: 9, fontWeight: 600, cursor: "pointer" }}>Inserir</button>
                  <button onClick={() => { onPick(d.img_destinos, true); onClose(); }} style={{ flex: 1, padding: "4px 0", borderRadius: 4, border: "none", background: "var(--ed-bind)", color: "#0c0c12", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>Fundo</button>
                </div>
              </div>
            </div>
          ))}
        </div>}
    </Modal>
  );
}

/* ══ 11. PREVIEW INSTAGRAM ═════════════════════════ */
export function InstagramPreviewModal({ dataUrl, format, onClose }: { dataUrl: string; format: string; onClose: () => void }) {
  const isStories = format === "stories" || format === "reels";
  return (
    <Modal title="Preview Instagram" onClose={onClose} width={isStories ? 420 : 520}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div style={{ width: isStories ? 340 : 440, borderRadius: 36, border: "8px solid #1a1a1a", overflow: "hidden", background: "#000", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
          {isStories ? (
            <div style={{ position: "relative", aspectRatio: "9/16", background: "#000" }}>
              <img src={dataUrl} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <div style={{ position: "absolute", top: 14, left: 14, right: 14, display: "flex", gap: 3 }}>
                {[1, 2, 3].map(i => <div key={i} style={{ flex: 1, height: 2, background: i === 1 ? "#fff" : "rgba(255,255,255,0.4)", borderRadius: 1 }} />)}
              </div>
              <div style={{ position: "absolute", top: 28, left: 14, right: 14, display: "flex", alignItems: "center", gap: 8, color: "#fff" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(45deg,#FF7A1A,#D4A843)" }} />
                <span style={{ fontSize: 12, fontWeight: 700 }}>aurohub</span>
                <span style={{ fontSize: 11, opacity: 0.7 }}>agora</span>
              </div>
              <div style={{ position: "absolute", bottom: 18, left: 14, right: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ flex: 1, height: 38, borderRadius: 20, border: "1px solid rgba(255,255,255,0.6)", display: "flex", alignItems: "center", padding: "0 14px", color: "rgba(255,255,255,0.7)", fontSize: 11 }}>Enviar mensagem</div>
                <Heart size={22} color="#fff" />
                <Send size={22} color="#fff" />
              </div>
            </div>
          ) : (
            <div style={{ background: "#000" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", color: "#fff" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(45deg,#FF7A1A,#D4A843)" }} />
                <span style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>aurohub</span>
                <MoreHorizontal size={18} />
              </div>
              <img src={dataUrl} alt="preview" style={{ width: "100%", display: "block" }} />
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 12px", color: "#fff" }}>
                <Heart size={22} /><MessageCircle size={22} /><Send size={22} />
                <div style={{ flex: 1 }} />
                <Bookmark size={22} />
              </div>
              <div style={{ padding: "0 12px 12px", color: "#fff", fontSize: 11 }}>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>142 curtidas</div>
                <div><span style={{ fontWeight: 700 }}>aurohub</span> Seu próximo destino começa aqui ✈️</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ══ 12. GERAÇÃO DE VARIANTES ══════════════════════ */
const FMT_DIMS: Record<string, [number, number]> = { stories: [1080, 1920], reels: [1080, 1920], feed: [1080, 1350], tv: [1920, 1080] };
export function VariantsModal({ schema, srcFormat, srcW, srcH, onClose, onConfirm }: {
  schema: EditorSchema; srcFormat: string; srcW: number; srcH: number;
  onClose: () => void;
  onConfirm: (variants: { format: string; width: number; height: number; schema: EditorSchema }[]) => void;
}) {
  const targets = (["stories", "feed", "tv"] as const).filter(f => f !== srcFormat);
  const variants = targets.map(f => {
    const [dw, dh] = FMT_DIMS[f];
    return { format: f, width: dw, height: dh, schema: rescaleSchema(schema, srcW, srcH, dw, dh) };
  });
  return (
    <Modal title="Gerar variantes" onClose={onClose} width={780}>
      <div style={{ fontSize: 11, color: "var(--ed-txt2)", marginBottom: 12 }}>Reescala proporcional para cada formato. Ajuste manualmente depois se necessário.</div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${variants.length}, 1fr)`, gap: 12 }}>
        {variants.map(v => (
          <div key={v.format} style={{ border: "1px solid var(--ed-bdr)", borderRadius: 8, overflow: "hidden", background: "var(--ed-input)" }}>
            <div style={{ aspectRatio: `${v.width}/${v.height}`, background: v.schema.background || "#000", position: "relative", overflow: "hidden" }}>
              {v.schema.elements.slice(0, 20).map(el => {
                const left = (el.x / v.width) * 100;
                const top = (el.y / v.height) * 100;
                const w = (el.width / v.width) * 100;
                const h = (el.height / v.height) * 100;
                if (el.type === "text") return <div key={el.id} style={{ position: "absolute", left: `${left}%`, top: `${top}%`, width: `${w}%`, color: el.fill, fontSize: Math.max(6, (el.fontSize || 32) / (v.width / 200)), textAlign: (el.align as "left" | "center" | "right") || "left", lineHeight: 1, fontWeight: el.fontStyle === "bold" ? 700 : 400, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{el.text}</div>;
                if (el.type === "rect") return <div key={el.id} style={{ position: "absolute", left: `${left}%`, top: `${top}%`, width: `${w}%`, height: `${h}%`, background: el.fill, borderRadius: el.cornerRadius || 0 }} />;
                return null;
              })}
            </div>
            <div style={{ padding: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ed-txt)", textTransform: "capitalize" }}>{v.format}</div>
              <div style={{ fontSize: 9, color: "var(--ed-txt3)" }}>{v.width}×{v.height}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
        <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--ed-bdr)", background: "transparent", color: "var(--ed-txt2)", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>Cancelar</button>
        <button onClick={() => onConfirm(variants)} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#FF7A1A", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Salvar {variants.length} variantes</button>
      </div>
    </Modal>
  );
}

/* ══ 2. CROP MODAL ═════════════════════════════════ */
export function CropModal({ src, initial, onClose, onConfirm }: {
  src: string;
  initial?: { x: number; y: number; width: number; height: number };
  onClose: () => void;
  onConfirm: (crop: { x: number; y: number; width: number; height: number }) => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [box, setBox] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const rectRef = useRef<Konva.Rect>(null);
  const trRef = useRef<Konva.Transformer>(null);
  useEffect(() => {
    const i = new window.Image();
    i.crossOrigin = "anonymous";
    i.onload = () => { setImg(i); setBox(initial || { x: 0, y: 0, width: i.width, height: i.height }); };
    i.src = src;
  }, [src, initial]);
  useEffect(() => {
    if (rectRef.current && trRef.current) {
      trRef.current.nodes([rectRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [img]);
  if (!img) return <Modal title="Cortar imagem" onClose={onClose} width={640}><div style={{ padding: 40, textAlign: "center", color: "var(--ed-txt3)", fontSize: 11 }}>Carregando...</div></Modal>;

  const maxW = 560;
  const scale = Math.min(1, maxW / img.width);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const confirm = () => onConfirm({
    x: Math.max(0, Math.round(box.x)),
    y: Math.max(0, Math.round(box.y)),
    width: Math.round(box.width),
    height: Math.round(box.height),
  });

  return (
    <Modal title="Cortar imagem" onClose={onClose} width={maxW + 80}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div style={{ position: "relative", background: "rgba(0,0,0,0.85)", borderRadius: 8, overflow: "hidden" }}>
          <Stage width={dw} height={dh} scaleX={scale} scaleY={scale}>
            <Layer>
              <KImage image={img} x={0} y={0} width={img.width} height={img.height} opacity={0.35} />
              <Rect x={0} y={0} width={img.width} height={img.height} fill="rgba(0,0,0,0.5)" listening={false} />
              <Rect
                ref={rectRef}
                x={box.x} y={box.y} width={box.width} height={box.height}
                stroke="#FF7A1A" strokeWidth={2 / scale}
                dash={[8 / scale, 5 / scale]}
                fillPatternImage={img}
                fillPatternOffsetX={box.x} fillPatternOffsetY={box.y}
                draggable
                onDragEnd={e => setBox({ ...box, x: e.target.x(), y: e.target.y() })}
                onTransformEnd={() => {
                  const n = rectRef.current!;
                  const sx = n.scaleX(); const sy = n.scaleY();
                  n.scaleX(1); n.scaleY(1);
                  setBox({ x: n.x(), y: n.y(), width: Math.max(10, n.width() * sx), height: Math.max(10, n.height() * sy) });
                }}
              />
              <Transformer ref={trRef} borderStroke="#FF7A1A" anchorStroke="#FF7A1A" anchorFill="#0c0c12" rotateEnabled={false} boundBoxFunc={(_, nb) => ({ ...nb, width: Math.max(20, nb.width), height: Math.max(20, nb.height) })} />
            </Layer>
          </Stage>
        </div>
        <div style={{ display: "flex", gap: 8, fontSize: 10, color: "var(--ed-txt2)" }}>
          <span>X: {Math.round(box.x)}</span><span>Y: {Math.round(box.y)}</span>
          <span>W: {Math.round(box.width)}</span><span>H: {Math.round(box.height)}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setBox({ x: 0, y: 0, width: img.width, height: img.height })} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--ed-bdr)", background: "transparent", color: "var(--ed-txt2)", cursor: "pointer", fontSize: 11 }}>Reset</button>
          <button onClick={onClose} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--ed-bdr)", background: "transparent", color: "var(--ed-txt2)", cursor: "pointer", fontSize: 11 }}>Cancelar</button>
          <button onClick={confirm} style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "#FF7A1A", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Aplicar corte</button>
        </div>
      </div>
    </Modal>
  );
}

/* ══ SAVE TEMPLATE MODAL ══════════════════════════ */

interface MarcaRow { id: string; name: string; }
interface LojaRow { id: string; name: string; licensee_id?: string; }

export interface SaveTemplateData {
  nome: string;
  formType: string;
  format: string;
  licenseeId: string;
  licenseeNome: string;
  lojaId: string;
  lojaNome: string;
}

const FORM_TYPES = ["pacote", "campanha", "passagem", "cruzeiro", "anoiteceu", "lamina"];
const FORMATS = [
  { value: "stories", label: "Stories 9:16" },
  { value: "reels", label: "Reels 9:16" },
  { value: "feed", label: "Feed 4:5" },
  { value: "tv", label: "TV 16:9" },
];

export function slugifyTemplateName(s: string): string {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "template";
}

export function SaveTemplateModal({ initialName, initialFormType, initialFormat, initialLicenseeId, initialLojaId, onClose, onConfirm }: {
  initialName?: string;
  initialFormType: string;
  initialFormat: string;
  initialLicenseeId?: string;
  initialLojaId?: string;
  onClose: () => void;
  onConfirm: (data: SaveTemplateData) => void | Promise<void>;
}) {
  const [nome, setNome] = useState(initialName || "");
  const [formType, setFormType] = useState(initialFormType);
  const [format, setFormat] = useState(initialFormat);
  const [marcas, setMarcas] = useState<MarcaRow[]>([]);
  const [lojas, setLojas] = useState<LojaRow[]>([]);
  const [licenseeId, setLicenseeId] = useState(initialLicenseeId || "");
  const [lojaId, setLojaId] = useState(initialLojaId || "");
  const [saving, setSaving] = useState(false);

  // Carrega marcas (licensees) + profile do usuário logado → pré-seleção
  useEffect(() => {
    (async () => {
      // Profile do usuário para pré-selecionar licensee/store
      let profileLicenseeId: string | null = null;
      let profileStoreId: string | null = null;
      try {
        const p = await getProfile(supabase);
        profileLicenseeId = p?.licensee_id ?? null;
        profileStoreId = p?.store_id ?? null;
      } catch {}

      // Carrega licensees
      let rows: MarcaRow[] = [];
      try {
        const r = await supabase.from("licensees").select("id,name").order("name");
        if (!r.error && r.data) rows = r.data as MarcaRow[];
      } catch {}
      setMarcas(rows);

      // Pré-seleção: initialLicenseeId > profile.licensee_id > primeiro da lista
      if (!initialLicenseeId) {
        if (profileLicenseeId && rows.find(m => m.id === profileLicenseeId)) {
          setLicenseeId(profileLicenseeId);
        } else if (rows.length > 0) {
          setLicenseeId(rows[0].id);
        }
      }

      // Guarda store do profile pra pré-seleção no efeito de lojas
      if (!initialLojaId && profileStoreId) {
        pendingStoreRef.current = profileStoreId;
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Referência pra pré-seleção da loja do profile após lojas carregarem
  const pendingStoreRef = useRef<string | null>(null);

  // Carrega stores da marca selecionada (ou todas se ADM sem marca)
  useEffect(() => {
    (async () => {
      let rows: LojaRow[] = [];
      try {
        if (licenseeId) {
          const r = await supabase.from("stores").select("id,name,licensee_id").eq("licensee_id", licenseeId).order("name");
          if (!r.error && r.data) rows = r.data as LojaRow[];
        } else {
          const r = await supabase.from("stores").select("id,name,licensee_id").order("name");
          if (!r.error && r.data) rows = r.data as LojaRow[];
        }
      } catch {}
      setLojas(rows);

      // Pré-seleção da loja: mantém se existir, senão usa profile.store_id, senão primeira
      const pending = pendingStoreRef.current;
      if (pending && rows.find(l => l.id === pending)) {
        setLojaId(pending);
        pendingStoreRef.current = null;
      } else if (!rows.find(l => l.id === lojaId)) {
        setLojaId(rows[0]?.id ?? "");
      }
    })();
  }, [licenseeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedMarca = marcas.find(m => m.id === licenseeId) || marcas[0];
  const selectedLoja = lojas.find(l => l.id === lojaId) || lojas[0];
  const canSave = nome.trim().length > 0 && !saving;

  const confirm = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onConfirm({
        nome: nome.trim(),
        formType,
        format,
        licenseeId: selectedMarca.id,
        licenseeNome: selectedMarca.name,
        lojaId: selectedLoja.id,
        lojaNome: selectedLoja.name,
      });
    } finally { setSaving(false); }
  };

  return (
    <Modal title="Salvar template" onClose={onClose} width={480}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <L label="Nome do template">
          <input autoFocus value={nome} onChange={e => setNome(e.target.value)} placeholder="ex: Pacote Rio Preto Verão"
            style={fieldS} onKeyDown={e => e.key === "Enter" && confirm()} />
        </L>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <L label="Tipo">
            <select value={formType} onChange={e => setFormType(e.target.value)} style={fieldS}>
              {FORM_TYPES.map(t => <option key={t} value={t} style={{ textTransform: "capitalize" }}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </L>
          <L label="Formato">
            <select value={format} onChange={e => setFormat(e.target.value)} style={fieldS}>
              {FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </L>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <L label="Marca">
            <select value={licenseeId} onChange={e => setLicenseeId(e.target.value)} style={fieldS}>
              {marcas.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </L>
          <L label="Loja">
            <select value={lojaId} onChange={e => setLojaId(e.target.value)} style={fieldS}>
              {licenseeId
                ? lojas.map(l => <option key={l.id} value={l.id}>{l.name}</option>)
                : (() => {
                    const grouped: Record<string, LojaRow[]> = {};
                    for (const l of lojas) {
                      const key = l.licensee_id || "sem-marca";
                      (grouped[key] ??= []).push(l);
                    }
                    return Object.entries(grouped).map(([licId, items]) => {
                      const marca = marcas.find(m => m.id === licId);
                      return (
                        <optgroup key={licId} label={marca?.name || licId}>
                          {items.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </optgroup>
                      );
                    });
                  })()
              }
            </select>
          </L>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
          <button onClick={onClose} disabled={saving} style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid var(--ed-bdr)", background: "transparent", color: "var(--ed-txt2)", cursor: saving ? "default" : "pointer", fontSize: 12, fontWeight: 600, opacity: saving ? 0.5 : 1 }}>Cancelar</button>
          <button onClick={confirm} disabled={!canSave} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: "#FF7A1A", color: "#fff", cursor: canSave ? "pointer" : "default", fontSize: 12, fontWeight: 700, opacity: canSave ? 1 : 0.5, display: "flex", alignItems: "center", gap: 6 }}>
            <Save size={13} />{saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--ed-txt3)" }}>{label}</span>
    {children}
  </label>;
}

const fieldS: React.CSSProperties = {
  height: 38, borderRadius: 8, border: "1px solid var(--ed-bdr)",
  background: "var(--ed-input)", color: "var(--ed-txt)",
  padding: "0 12px", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box",
};
