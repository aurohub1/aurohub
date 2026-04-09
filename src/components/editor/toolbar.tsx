import { ArrowLeft, Undo2, Redo2, Copy, ClipboardPaste, CopyPlus, Trash2, Eye, EyeOff, Sun, Moon, Download, Save } from "lucide-react";

interface Props {
  onUndo: () => void; onRedo: () => void;
  onCopy: () => void; onPaste: () => void; onDuplicate: () => void; onDelete: () => void;
  onExport?: () => void; onSave?: () => void;
  zoom: number; saving?: boolean;
  canUndo: boolean; canRedo: boolean;
  onToggleParamView?: () => void; paramViewActive?: boolean;
  format?: string; onFormatChange?: (f: string) => void;
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
    <header style={{ height: 44, display: "flex", alignItems: "center", gap: 4, padding: "0 10px", background: "var(--ed-surface)", borderBottom: "1px solid var(--ed-bdr)", flexShrink: 0 }}>
      <a href="/editor-de-templates" style={{ display: "flex", alignItems: "center", gap: 4, textDecoration: "none", color: "var(--ed-txt2)", fontSize: 11, marginRight: 4 }}>
        <ArrowLeft size={14} /> Voltar
      </a>
      <Sep />
      <span style={{ color: "#FF7A1A", fontSize: 14, marginRight: 2 }}>★</span>
      <span style={{ color: "var(--ed-txt)", fontSize: 12, fontWeight: 700, marginRight: 4 }}>Aurohub</span>
      <Sep />
      {p.onFormatChange && (
        <select value={p.format || "stories"} onChange={e => p.onFormatChange!(e.target.value)} style={{ height: 28, borderRadius: 6, border: "1px solid var(--ed-bdr)", background: "var(--ed-input)", color: "var(--ed-txt)", fontSize: 10, padding: "0 6px", outline: "none", cursor: "pointer" }}>
          <option value="stories">Stories 9:16</option>
          <option value="reels">Reels 9:16</option>
          <option value="feed">Feed 4:5</option>
          <option value="tv">TV 16:9</option>
        </select>
      )}
      <Sep />
      <Btn icon={<Undo2 size={14} />} tip="Desfazer (Ctrl+Z)" o={p.onUndo} d={!p.canUndo} />
      <Btn icon={<Redo2 size={14} />} tip="Refazer (Ctrl+Y)" o={p.onRedo} d={!p.canRedo} />
      <Sep />
      <Btn icon={<Copy size={14} />} tip="Copiar" o={p.onCopy} />
      <Btn icon={<ClipboardPaste size={14} />} tip="Colar" o={p.onPaste} />
      <Btn icon={<CopyPlus size={14} />} tip="Duplicar" o={p.onDuplicate} />
      <Btn icon={<Trash2 size={14} />} tip="Deletar" o={p.onDelete} danger />
      {p.onToggleParamView && <><Sep /><Btn icon={p.paramViewActive ? <EyeOff size={14} /> : <Eye size={14} />} tip="Parameter View (Ctrl+P)" o={p.onToggleParamView} active={p.paramViewActive} /></>}
      <div style={{ flex: 1 }} />
      <Btn icon={isLight ? <Moon size={14} /> : <Sun size={14} />} tip="Alternar tema" o={toggleTheme} />
      <Sep />
      <span style={{ fontSize: 9, color: "var(--ed-txt3)", fontVariantNumeric: "tabular-nums" }}>{Math.round(p.zoom * 100)}%</span>
      {p.onExport && <Btn icon={<Download size={14} />} tip="Exportar PNG" o={p.onExport} gold label="PNG" />}
      {p.onSave && <button onClick={p.onSave} disabled={p.saving} style={{ height: 28, padding: "0 10px", borderRadius: 6, border: "none", background: "#FF7A1A", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", opacity: p.saving ? 0.5 : 1, display: "flex", alignItems: "center", gap: 4 }}>
        <Save size={12} />{p.saving ? "..." : "Salvar"}
      </button>}
    </header>
  );
}

function Btn({ icon, tip, o, d, danger, gold, active, label }: { icon: React.ReactNode; tip: string; o: () => void; d?: boolean; danger?: boolean; gold?: boolean; active?: boolean; label?: string }) {
  return <button onClick={o} title={tip} disabled={d} style={{ minWidth: label ? 52 : 28, height: 28, borderRadius: 6, border: "none", background: active ? "var(--ed-active)" : "var(--ed-hover)", color: danger ? "var(--ed-danger)" : gold ? "var(--ed-bind)" : active ? "var(--ed-active-txt)" : "var(--ed-txt2)", fontSize: 10, fontWeight: label ? 600 : 400, cursor: d ? "default" : "pointer", opacity: d ? 0.25 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 3, padding: label ? "0 8px" : 0 }}>{icon}{label}</button>;
}
function Sep() { return <div style={{ width: 1, height: 18, background: "var(--ed-bdr)", margin: "0 2px" }} />; }
