import React from "react";
import { ArrowLeft, Undo2, Redo2, Copy, ClipboardPaste, CopyPlus, Trash2, Eye, EyeOff, Sun, Moon, Download, Save, Smartphone, Layers, History, Package, FilePlus, LayoutTemplate, Magnet } from "lucide-react";

interface Props {
  onUndo: () => void; onRedo: () => void;
  onCopy: () => void; onPaste: () => void; onDuplicate: () => void; onDelete: () => void;
  onExport?: () => void; onSave?: () => void;
  zoom: number; saving?: boolean;
  canUndo: boolean; canRedo: boolean;
  onToggleParamView?: () => void; paramViewActive?: boolean;
  onToggleSnap?: () => void; snapEnabled?: boolean;
  format?: string; onFormatChange?: (f: string) => void;
  formType?: string; onFormTypeChange?: (f: string) => void;
  qtdDestinos?: number; onQtdDestinosChange?: (n: number) => void;
  onLoadTemplate?: () => void;
  onPreview?: () => void;
  onVariants?: () => void; variantsEnabled?: boolean;
  onHistory?: () => void;
  onSaveComponent?: () => void; canSaveComponent?: boolean;
  onNew?: () => void;
}

export default function Toolbar(p: Props) {
  const toggleTheme = () => {
    const h = document.documentElement;
    const next = h.getAttribute("data-theme") === "light" ? "dark" : "light";
    h.setAttribute("data-theme", next);
    localStorage.setItem("ah_theme", next);
  };
  const isLight = typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "light";

  return (
    <header style={{ position: "relative", height: 44, display: "flex", alignItems: "center", gap: 4, padding: "0 10px", background: "var(--ed-surface)", borderBottom: "1px solid var(--ed-bdr)", flexShrink: 0 }}>
      <a href="/editor-de-templates" style={{ display: "flex", alignItems: "center", gap: 4, textDecoration: "none", color: "var(--ed-txt2)", fontSize: 11, marginRight: 4 }}>
        <ArrowLeft size={14} /> Voltar
      </a>
      <Sep />
      <LayoutTemplate size={15} color="#FF7A1A" style={{ marginRight: 3 }} />
      <span style={{ color: "var(--ed-txt)", fontSize: 12, fontWeight: 700, marginRight: 4 }}>Aurohub</span>
      <Sep />
      {p.onFormTypeChange && (
        <select value={p.formType || "pacote"} onChange={e => p.onFormTypeChange!(e.target.value)} style={selS}>
          <option value="pacote">Pacote</option><option value="campanha">Campanha</option>
          <option value="passagem">Passagem</option><option value="cruzeiro">Cruzeiro</option>
          <option value="anoiteceu">Anoiteceu</option><option value="lamina">Lâmina</option>
        </select>
      )}
      {p.onFormatChange && (
        <select value={p.format || "stories"} onChange={e => p.onFormatChange!(e.target.value)} style={selS}>
          <option value="stories">Stories 9:16</option><option value="reels">Reels 9:16</option>
          <option value="feed">Feed 4:5</option><option value="tv">TV 16:9</option>
        </select>
      )}
      {p.formType === "lamina" && p.onQtdDestinosChange && (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 9, color: "var(--ed-txt2)" }}>Destinos:</span>
          <input type="number" min={1} max={10} value={p.qtdDestinos || 4} onChange={e => p.onQtdDestinosChange!(Math.max(1, Math.min(10, +e.target.value)))} style={{ width: 40, height: 28, borderRadius: 6, border: "1px solid var(--ed-bdr)", background: "var(--ed-input)", color: "var(--ed-txt)", fontSize: 10, textAlign: "center", outline: "none" }} />
        </div>
      )}
      <Sep />
      <Btn icon={<Undo2 size={14} />} tip="Desfazer (Ctrl+Z)" o={p.onUndo} d={!p.canUndo} />
      <Btn icon={<Redo2 size={14} />} tip="Refazer (Ctrl+Y)" o={p.onRedo} d={!p.canRedo} />
      <Sep />
      <Btn icon={<Copy size={14} />} tip="Copiar" o={p.onCopy} />
      <Btn icon={<ClipboardPaste size={14} />} tip="Colar" o={p.onPaste} />
      <Btn icon={<CopyPlus size={14} />} tip="Duplicar" o={p.onDuplicate} />
      <Btn icon={<Trash2 size={14} />} tip="Deletar" o={p.onDelete} danger />
      {p.onSaveComponent && <Btn icon={<Package size={14} />} tip="Salvar como componente" o={p.onSaveComponent} d={!p.canSaveComponent} />}
      {p.onToggleSnap && <Btn icon={<Magnet size={14} />} tip={p.snapEnabled ? "Smart Guides ativo" : "Smart Guides desativado"} o={p.onToggleSnap} active={p.snapEnabled} />}
      {p.onToggleParamView && <><Sep /><Btn icon={p.paramViewActive ? <EyeOff size={14} /> : <Eye size={14} />} tip="Parameter View (Ctrl+P)" o={p.onToggleParamView} active={p.paramViewActive} /></>}
      {p.onHistory && <Btn icon={<History size={14} />} tip="Histórico" o={p.onHistory} />}
      {p.onPreview && <Btn icon={<Smartphone size={14} />} tip="Preview Instagram" o={p.onPreview} />}
      {p.onVariants && p.variantsEnabled && <Btn icon={<Layers size={14} />} tip="Gerar variantes" o={p.onVariants} gold label="Variantes" />}
      <div style={{ position: "absolute", right: 240, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 4 }}>
        <Sep />
        <Btn icon={isLight ? <Moon size={14} /> : <Sun size={14} />} tip="Alternar tema" o={toggleTheme} />
        <span style={{ fontSize: 9, color: "var(--ed-txt3)", fontVariantNumeric: "tabular-nums" }}>{Math.round(p.zoom * 100)}%</span>
        {p.onExport && <Btn icon={<Download size={14} />} tip="Exportar PNG" o={p.onExport} gold label="PNG" />}
        {(p.onNew || p.onSave) && <Sep />}
        {p.onNew && <button onClick={p.onNew} title="Novo template" style={{ height: 28, padding: "0 10px", borderRadius: 6, border: "1px solid var(--ed-bdr)", background: "var(--ed-hover)", color: "var(--ed-txt)", fontSize: 10, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          <FilePlus size={12} />Novo
        </button>}
        {p.onSave && <button onClick={p.onSave} disabled={p.saving} style={{ height: 28, padding: "0 10px", borderRadius: 6, border: "none", background: "#FF7A1A", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", opacity: p.saving ? 0.5 : 1, display: "flex", alignItems: "center", gap: 4 }}>
          <Save size={12} />{p.saving ? "..." : "Salvar"}
        </button>}
      </div>
    </header>
  );
}

function Btn({ icon, tip, o, d, danger, gold, active, label }: { icon: React.ReactNode; tip: string; o: () => void; d?: boolean; danger?: boolean; gold?: boolean; active?: boolean; label?: string }) {
  return <button onClick={o} title={tip} disabled={d} style={{ minWidth: label ? 52 : 28, height: 28, borderRadius: 6, border: "none", background: active ? "var(--ed-active)" : "var(--ed-hover)", color: danger ? "var(--ed-danger)" : gold ? "var(--ed-bind)" : active ? "var(--ed-active-txt)" : "var(--ed-txt2)", fontSize: 10, fontWeight: label ? 600 : 400, cursor: d ? "default" : "pointer", opacity: d ? 0.25 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 3, padding: label ? "0 8px" : 0 }}>{icon}{label}</button>;
}
function Sep() { return <div style={{ width: 1, height: 18, background: "var(--ed-bdr)", margin: "0 2px" }} />; }
const selS: React.CSSProperties = { height: 28, borderRadius: 6, border: "1px solid var(--ed-bdr)", background: "var(--ed-input)", color: "var(--ed-txt)", fontSize: 10, padding: "0 6px", outline: "none", cursor: "pointer" };
