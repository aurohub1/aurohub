import { MousePointer2, Type, Square, Circle, Minus, ImageIcon, Hexagon, AlignCenter, ArrowUp, ArrowDown, ZoomIn, ZoomOut, Maximize2, Lock, Unlock, Eye, EyeOff, Trash2, QrCode, FolderOpen, Package, MapPin } from "lucide-react";
import { EditorElement, EditorSchema, BIND_GROUPS, FONTS, genId, getLaminaBindGroups, getImageBindFields } from "./types";

interface Props {
  schema: EditorSchema; selectedId: string | null;
  canvasW: number; canvasH: number;
  onAdd: (el: EditorElement) => void; onSelect: (id: string | null) => void;
  onUpdate: (id: string, u: Partial<EditorElement>) => void;
  onMoveLayer: (dir: "up" | "down") => void; onRemove: (id: string) => void;
  stageScale: number; onZoom: (s: number) => void; onFit: () => void;
  formType?: string; qtdDestinos?: number;
  selectedIds?: string[];
  onOpenAssets?: () => void;
  onOpenComponents?: () => void;
  onOpenDestinos?: () => void;
}

export default function ToolsPanel(p: Props) {
  const bindGroups = p.formType === "lamina" ? getLaminaBindGroups(p.qtdDestinos || 4) : BIND_GROUPS;

  const add = (type: EditorElement["type"], overrides: Partial<EditorElement> = {}) => {
    const defaults: Record<string, Partial<EditorElement>> = {
      text: { name: "Texto", x: p.canvasW / 4, y: p.canvasH / 3, width: p.canvasW / 2, height: 60, text: "Texto", fontSize: 32, fontFamily: FONTS[0], fontStyle: "bold", fill: "#FFFFFF", align: "center", opacity: 1 },
      rect: { name: "Retângulo", x: p.canvasW / 4, y: p.canvasH / 3, width: p.canvasW / 3, height: p.canvasH / 6, fill: "#D4A843", cornerRadius: 0, opacity: 1 },
      circle: { name: "Círculo", x: p.canvasW / 2, y: p.canvasH / 2, width: 120, height: 120, fill: "#3B82F6", opacity: 1 },
      image: { name: "Imagem", x: p.canvasW / 4, y: p.canvasH / 4, width: p.canvasW / 2, height: p.canvasH / 3, opacity: 1 },
      imageBind: { name: "🖼 Bind Imagem", x: p.canvasW / 4, y: p.canvasH / 4, width: p.canvasW / 2, height: p.canvasH / 3, opacity: 1, imageFit: "cover", cornerRadius: 8 },
      qrcode: { name: "QR Code", x: p.canvasW / 2 - 150, y: p.canvasH / 2 - 150, width: 300, height: 300, qrUrl: "https://aurohub.com.br", qrFg: "#000000", qrBg: "#FFFFFF", opacity: 1 },
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

        <GL>QR</GL>
        <TB icon={<QrCode size={14} />} t="QR Code" o={() => add("qrcode")} />

        <GL>BIND</GL>
        {/* Bind de Imagem — placeholder que no cliente vira a imagem real do form */}
        <div style={{ position: "relative" }} className="group">
          <TB icon={<ImageIcon size={14} strokeDasharray="4 2" />} t="Bind Imagem" o={() => add("imageBind")} gold />
          <div className="hidden group-hover:block" style={{ position: "absolute", left: 42, top: 0, zIndex: 999, width: 180, maxHeight: 260, overflowY: "auto", borderRadius: 8, border: "1px solid var(--ed-bdr)", padding: 6, background: "var(--ed-surface)", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
            <div style={{ fontSize: 7, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "var(--ed-txt3)", marginBottom: 4 }}>Bind Imagem</div>
            <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 2 }}>{getImageBindFields(p.formType).map(f => (
              <button key={f} onClick={() => add("imageBind", { name: `🖼 ${f}`, bindParam: f })} style={{ padding: "3px 6px", borderRadius: 3, border: "none", background: "rgba(59,130,246,0.12)", color: "#3B82F6", fontSize: 9, fontWeight: 600, cursor: "pointer" }}>{f}</button>
            ))}</div>
          </div>
        </div>
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

        <GL>LIB</GL>
        {p.onOpenAssets && <TB icon={<FolderOpen size={14} />} t="Assets (Cloudinary)" o={p.onOpenAssets} />}
        {p.onOpenComponents && <TB icon={<Package size={14} />} t="Componentes" o={p.onOpenComponents} />}
        {p.onOpenDestinos && <TB icon={<MapPin size={14} />} t="Destinos" o={p.onOpenDestinos} gold />}

        <GL>OBJ</GL>
        <TB icon={<ArrowUp size={14} />} t="Camada +" o={() => p.onMoveLayer("up")} />
        <TB icon={<ArrowDown size={14} />} t="Camada -" o={() => p.onMoveLayer("down")} />

        <GL>ZOOM</GL>
        <TB icon={<ZoomIn size={14} />} t="Zoom In" o={() => p.onZoom(Math.min(3, p.stageScale * 1.2))} />
        <TB icon={<ZoomOut size={14} />} t="Zoom Out" o={() => p.onZoom(Math.max(0.1, p.stageScale * 0.8))} />
        <TB icon={<Maximize2 size={14} />} t="Fit Screen" o={p.onFit} />
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
