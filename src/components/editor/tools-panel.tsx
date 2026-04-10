import { MousePointer2, Type, Square, Circle, Minus, ImageIcon, Hexagon, AlignCenter, ArrowUp, ArrowDown, ZoomIn, ZoomOut, Maximize2, Lock, Unlock, Eye, EyeOff, Trash2 } from "lucide-react";
import { EditorElement, EditorSchema, BIND_GROUPS, FONTS, genId, getLaminaBindGroups } from "./types";

interface Props {
  schema: EditorSchema; selectedId: string | null;
  canvasW: number; canvasH: number;
  onAdd: (el: EditorElement) => void; onSelect: (id: string | null) => void;
  onUpdate: (id: string, u: Partial<EditorElement>) => void;
  onMoveLayer: (dir: "up" | "down") => void; onRemove: (id: string) => void;
  stageScale: number; onZoom: (s: number) => void; onFit: () => void;
  formType?: string; qtdDestinos?: number;
  selectedIds?: string[];
}

export default function ToolsPanel(p: Props) {
  const bindGroups = p.formType === "lamina" ? getLaminaBindGroups(p.qtdDestinos || 4) : BIND_GROUPS;

  const add = (type: EditorElement["type"], overrides: Partial<EditorElement> = {}) => {
    const defaults: Record<string, Partial<EditorElement>> = {
      text: { name: "Texto", x: p.canvasW / 4, y: p.canvasH / 3, width: p.canvasW / 2, height: 60, text: "Texto", fontSize: 32, fontFamily: FONTS[0], fontStyle: "bold", fill: "#FFFFFF", align: "center", opacity: 1 },
      rect: { name: "Retângulo", x: p.canvasW / 4, y: p.canvasH / 3, width: p.canvasW / 3, height: p.canvasH / 6, fill: "#D4A843", cornerRadius: 0, opacity: 1 },
      circle: { name: "Círculo", x: p.canvasW / 2, y: p.canvasH / 2, width: 120, height: 120, fill: "#3B82F6", opacity: 1 },
      image: { name: "Imagem", x: p.canvasW / 4, y: p.canvasH / 4, width: p.canvasW / 2, height: p.canvasH / 3, opacity: 1 },
    };
    p.onAdd({ id: genId(), type, ...defaults[type], ...overrides } as EditorElement);
  };

  return (
    <div style={{ width: 42, display: "flex", flexDirection: "column", background: "var(--ed-surface)", borderRight: "1px solid var(--ed-bdr)", flexShrink: 0 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, padding: "6px 0", flex: 1, overflowY: "auto" }}>
        <GL>SEL</GL>
        <TB icon={<MousePointer2 size={14} />} t="Selecionar (V)" o={() => {}} />

        <GL>FORM</GL>
        <TB icon={<Square size={14} />} t="Retângulo (R)" o={() => add("rect")} />
        <TB icon={<Square size={14} strokeDasharray="4 2" />} t="Rect Arredondado" o={() => add("rect", { cornerRadius: 40, fill: "#1E3A6E" })} />
        <TB icon={<Circle size={14} />} t="Círculo (O)" o={() => add("circle")} />
        <TB icon={<Minus size={14} />} t="Linha (L)" o={() => add("rect", { name: "Linha", height: 4, cornerRadius: 2, fill: "#FFFFFF" })} />

        <GL>TEXT</GL>
        <TB icon={<Type size={14} />} t="Texto (T)" o={() => add("text")} />

        <GL>MÍDIA</GL>
        <TB icon={<ImageIcon size={14} />} t="Imagem (I)" o={() => {
          const input = document.createElement("input"); input.type = "file"; input.accept = "image/*";
          input.onchange = (e) => {
            const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
            const r = new FileReader(); r.onload = () => {
              if (!r.result) return;
              const img = new window.Image(); img.onload = () => {
                const ratio = img.naturalWidth / img.naturalHeight;
                const maxW = p.canvasW * 0.6;
                const w = Math.min(img.naturalWidth, maxW);
                const h = w / ratio;
                p.onAdd({ id: genId(), type: "image", name: f.name.replace(/\.[^.]+$/, ""), x: (p.canvasW - w) / 2, y: (p.canvasH - h) / 2, width: w, height: h, src: r.result as string, opacity: 1 });
              }; img.src = r.result as string;
            }; r.readAsDataURL(f);
          };
          input.click();
        }} />

        <GL>BIND</GL>
        <div style={{ position: "relative" }} className="group">
          <TB icon={<Hexagon size={14} />} t="Campo Bind" o={() => {}} gold />
          <div className="hidden group-hover:block" style={{ position: "absolute", left: 42, top: 0, zIndex: 999, width: 180, maxHeight: 300, overflowY: "auto", borderRadius: 8, border: "1px solid var(--ed-bdr)", padding: 6, background: "var(--ed-surface)", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
            {bindGroups.map(g => (
              <div key={g.group} style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 7, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "var(--ed-txt3)", marginBottom: 2 }}>{g.group}</div>
                <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 2 }}>{g.fields.map(f => (
                  <button key={f} onClick={() => add("text", { name: `[${f}]`, text: `[${f}]`, fill: "#D4A843", bindParam: f, fontSize: 28 })} style={{ padding: "1px 5px", borderRadius: 3, border: "none", background: "rgba(212,168,67,0.1)", color: "var(--ed-bind)", fontSize: 8, cursor: "pointer" }}>{f}</button>
                ))}</div>
              </div>
            ))}
          </div>
        </div>

        <GL>OBJ</GL>
        <TB icon={<ArrowUp size={14} />} t="Camada +" o={() => p.onMoveLayer("up")} />
        <TB icon={<ArrowDown size={14} />} t="Camada -" o={() => p.onMoveLayer("down")} />

        <GL>ZOOM</GL>
        <TB icon={<ZoomIn size={14} />} t="Zoom In" o={() => p.onZoom(Math.min(3, p.stageScale * 1.2))} />
        <TB icon={<ZoomOut size={14} />} t="Zoom Out" o={() => p.onZoom(Math.max(0.1, p.stageScale * 0.8))} />
        <TB icon={<Maximize2 size={14} />} t="Fit Screen" o={p.onFit} />
      </div>

      {/* Layers */}
      <div style={{ maxHeight: "40%", overflowY: "auto", borderTop: "1px solid var(--ed-bdr)" }}>
        <div style={{ fontSize: 7, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--ed-txt3)", padding: "6px 4px 2px" }}>Layers</div>
        {[...p.schema.elements].reverse().map(el => (
          <div key={el.id} onClick={() => p.onSelect(el.id)} style={{
            display: "flex", alignItems: "center", gap: 3, padding: "4px 4px", cursor: "pointer", fontSize: 8,
            background: (p.selectedIds ?? [p.selectedId]).filter(Boolean).includes(el.id) ? "var(--ed-active)" : "transparent",
            borderLeft: (p.selectedIds ?? [p.selectedId]).filter(Boolean).includes(el.id) ? "2px solid var(--ed-active-txt)" : "2px solid transparent",
            color: (p.selectedIds ?? [p.selectedId]).filter(Boolean).includes(el.id) ? "var(--ed-active-txt)" : "var(--ed-txt2)",
            opacity: el.visible === false ? 0.3 : 1,
          }}>
            <span style={{ color: el.bindParam ? "var(--ed-bind)" : undefined, fontSize: 7 }}>{el.bindParam ? "⬡" : el.type === "text" ? "T" : el.type === "rect" ? "□" : el.type === "circle" ? "○" : "🖼"}</span>
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{el.name || el.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TB({ icon, t, o, gold }: { icon: React.ReactNode; t: string; o: () => void; gold?: boolean }) {
  return <button onClick={o} title={t} style={{ width: 30, height: 30, borderRadius: 6, border: "none", background: "var(--ed-hover)", color: gold ? "var(--ed-bind)" : "var(--ed-txt2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</button>;
}
function GL({ children }: { children: string }) {
  return <div style={{ fontSize: 6, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--ed-txt3)", margin: "4px 0 1px", textAlign: "center", width: "100%" }}>{children}</div>;
}
