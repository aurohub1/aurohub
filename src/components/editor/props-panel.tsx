import React, { useState } from "react";
import { HexColorPicker } from "react-colorful";
import { EditorElement, FONTS, BIND_GROUPS, BLEND_MODES, BlendMode, TextCase } from "./types";

interface Props {
  selected: EditorElement | null;
  canvasW: number; canvasH: number;
  allElements: EditorElement[];
  onUpdate: (id: string, u: Partial<EditorElement>) => void;
  onAlign: (a: string) => void;
  activeTab: "design" | "animate";
  onTabChange: (t: "design" | "animate") => void;
  selectedCount?: number;
  onOpenCrop?: () => void;
}

export default function PropsPanel({ selected: s, canvasW, canvasH, allElements, onUpdate, onAlign, activeTab, onTabChange, selectedCount, onOpenCrop }: Props) {
  if (!s) return (
    <div style={{ width: 232, background: "var(--ed-surface)", borderLeft: "1px solid var(--ed-bdr)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: 10, color: "var(--ed-txt3)" }}>Selecione um elemento</span>
    </div>
  );

  const u = (up: Partial<EditorElement>) => onUpdate(s.id, up);

  return (
    <div style={{ width: 232, background: "var(--ed-surface)", borderLeft: "1px solid var(--ed-bdr)", overflowY: "auto", flexShrink: 0, display: "flex", flexDirection: "column" }}>
      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--ed-bdr)", flexShrink: 0 }}>
        <TabBtn active={activeTab === "design"} onClick={() => onTabChange("design")}>Design</TabBtn>
        <TabBtn active={activeTab === "animate"} onClick={() => onTabChange("animate")}>Animate</TabBtn>
      </div>
      {selectedCount && selectedCount > 1 && (
        <div style={{ padding: "8px 12px", fontSize: 10, color: "var(--ed-bind)", fontWeight: 700, borderBottom: "1px solid var(--ed-bdr)" }}>
          ✦ {selectedCount} selecionados
        </div>
      )}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
        {activeTab === "design" ? <DesignTab s={s} u={u} allElements={allElements} onAlign={onAlign} onOpenCrop={onOpenCrop} /> : <AnimateTab s={s} u={u} />}
      </div>
    </div>
  );
}

/* ══ Helpers ══════════════════════════════════════ */
function isLine(el: EditorElement): boolean {
  return el.type === "rect" && (el.name?.toLowerCase().includes("linha") || el.height <= 8);
}

/* ══ DESIGN TAB ═══════════════════════════════════ */
function DesignTab({ s, u, allElements, onAlign, onOpenCrop }: { s: EditorElement; u: (up: Partial<EditorElement>) => void; allElements: EditorElement[]; onAlign: (a: string) => void; onOpenCrop?: () => void }) {
  return (
    <>
      {/* Align 3x3 SVG grid */}
      <Sec t="Alinhar ao Canvas">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 3 }}>
          {[
            { k: "left", d: "M4 4v10M7 6h7M7 9h5" },
            { k: "center-h", d: "M9 4v10M5 6h8M6 9h6" },
            { k: "right", d: "M14 4v10M5 6h7M7 9h5" },
            { k: "top", d: "M4 4h10M6 7v7M9 7v5" },
            { k: "center-v", d: "M4 9h10M6 5v8M9 6v6" },
            { k: "bottom", d: "M4 14h10M6 5v7M9 7v5" },
          ].map(a => (
            <button key={a.k} onClick={() => onAlign(a.k)} style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "var(--ed-input)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg viewBox="0 0 18 18" width={14} height={14}><path d={a.d} stroke="var(--ed-txt2)" strokeWidth="1.5" fill="none" strokeLinecap="round" /></svg>
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
          <SBtn active={!!s.locked} onClick={() => u({ locked: !s.locked })}>{s.locked ? "🔒 Travado" : "🔓 Travar"}</SBtn>
        </div>
      </Sec>

      {/* Position */}
      <Sec t="Posição & Tamanho">
        <G2><F l="X"><Num v={Math.round(s.x)} c={v => u({ x: v })} /></F><F l="Y"><Num v={Math.round(s.y)} c={v => u({ y: v })} /></F></G2>
        <G2><F l="W"><Num v={Math.round(s.width)} c={v => u({ width: v })} /></F><F l="H"><Num v={Math.round(s.height)} c={v => u({ height: v })} /></F></G2>
        <G2>
          <F l="Rotação"><Num v={Math.round(s.rotation || 0)} c={v => u({ rotation: v })} /></F>
          <F l="Opacidade"><input type="range" min={0} max={1} step={0.05} value={s.opacity ?? 1} onChange={e => u({ opacity: +e.target.value })} style={{ width: "100%", accentColor: "var(--ed-accent)", marginTop: 6 }} /></F>
        </G2>
        <div style={{ display: "flex", gap: 3 }}>
          <SBtn active={!!s.flipX} onClick={() => u({ flipX: !s.flipX })}>Flip H</SBtn>
          <SBtn active={!!s.flipY} onClick={() => u({ flipY: !s.flipY })}>Flip V</SBtn>
        </div>
      </Sec>

      {/* Fill — hide for lines, images and qrcode */}
      {s.type !== "image" && s.type !== "qrcode" && !isLine(s) && (
        <Sec t="Preenchimento">
          <ColorField value={s.fill || "#FFFFFF"} onChange={v => u({ fill: v })} />
        </Sec>
      )}

      {/* Line-specific section */}
      {isLine(s) && (
        <Sec t="Linha">
          <F l="Cor"><ColorField value={s.fill || "#FFFFFF"} onChange={v => u({ fill: v })} /></F>
          <F l="Espessura"><Num v={s.height} c={v => u({ height: Math.max(1, Math.min(100, v)) })} /></F>
          <F l="Estilo">
            <div style={{ display: "flex", gap: 3 }}>
              <SBtn active={!s.strokeDashArray || s.strokeDashArray.length === 0} onClick={() => u({ strokeDashArray: undefined })}>Sólido</SBtn>
              <SBtn active={!!s.strokeDashArray && s.strokeDashArray[0] === 6} onClick={() => u({ strokeDashArray: [6, 4] })}>Tracejado</SBtn>
              <SBtn active={!!s.strokeDashArray && s.strokeDashArray[0] === 2} onClick={() => u({ strokeDashArray: [2, 3] })}>Pontilhado</SBtn>
            </div>
          </F>
        </Sec>
      )}

      {/* Border — hide for lines */}
      {!isLine(s) && <Sec t="Borda">
        <G2>
          <F l="Cor"><ColorSwatch value={s.stroke || "#000"} onChange={v => u({ stroke: v })} /></F>
          <F l="Espessura"><Num v={s.strokeWidth || 0} c={v => u({ strokeWidth: v })} /></F>
        </G2>
        <F l="Estilo">
          <div style={{ display: "flex", gap: 3 }}>
            <SBtn active={!s.strokeDashArray || s.strokeDashArray.length === 0} onClick={() => u({ strokeDashArray: undefined })}>Sólido</SBtn>
            <SBtn active={!!s.strokeDashArray && s.strokeDashArray[0] === 6} onClick={() => u({ strokeDashArray: [6, 4] })}>Tracejado</SBtn>
            <SBtn active={!!s.strokeDashArray && s.strokeDashArray[0] === 2} onClick={() => u({ strokeDashArray: [2, 3] })}>Pontilhado</SBtn>
          </div>
        </F>
      </Sec>}

      {/* Corners */}
      {s.type === "rect" && (
        <Sec t="Cantos">
          <F l="Raio global"><input type="range" min={0} max={200} value={typeof s.cornerRadius === "number" ? s.cornerRadius : 0} onChange={e => u({ cornerRadius: +e.target.value })} style={{ width: "100%", accentColor: "var(--ed-accent)" }} /></F>
          <Num v={typeof s.cornerRadius === "number" ? s.cornerRadius : 0} c={v => u({ cornerRadius: v })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, marginTop: 4 }}>
            <F l="↖ TL"><Num v={Array.isArray(s.cornerRadius) ? s.cornerRadius[0] : (s.cornerRadius || 0)} c={v => { const r = Array.isArray(s.cornerRadius) ? [...s.cornerRadius] : [s.cornerRadius || 0, s.cornerRadius || 0, s.cornerRadius || 0, s.cornerRadius || 0]; r[0] = v; u({ cornerRadius: r as unknown as number }); }} /></F>
            <F l="↗ TR"><Num v={Array.isArray(s.cornerRadius) ? s.cornerRadius[1] : (s.cornerRadius || 0)} c={v => { const r = Array.isArray(s.cornerRadius) ? [...s.cornerRadius] : [s.cornerRadius || 0, s.cornerRadius || 0, s.cornerRadius || 0, s.cornerRadius || 0]; r[1] = v; u({ cornerRadius: r as unknown as number }); }} /></F>
            <F l="↙ BL"><Num v={Array.isArray(s.cornerRadius) ? s.cornerRadius[3] : (s.cornerRadius || 0)} c={v => { const r = Array.isArray(s.cornerRadius) ? [...s.cornerRadius] : [s.cornerRadius || 0, s.cornerRadius || 0, s.cornerRadius || 0, s.cornerRadius || 0]; r[3] = v; u({ cornerRadius: r as unknown as number }); }} /></F>
            <F l="↘ BR"><Num v={Array.isArray(s.cornerRadius) ? s.cornerRadius[2] : (s.cornerRadius || 0)} c={v => { const r = Array.isArray(s.cornerRadius) ? [...s.cornerRadius] : [s.cornerRadius || 0, s.cornerRadius || 0, s.cornerRadius || 0, s.cornerRadius || 0]; r[2] = v; u({ cornerRadius: r as unknown as number }); }} /></F>
          </div>
          <F l="Seguir texto">
            <select value={s.autoHeightRef || ""} onChange={e => u({ autoHeightRef: e.target.value || undefined })} style={selS}>
              <option value="">— nenhum —</option>
              {allElements.filter(e => e.type === "text" && e.id !== s.id).map(e => (
                <option key={e.id} value={e.id}>{e.name || e.id}</option>
              ))}
            </select>
          </F>
        </Sec>
      )}

      {/* Shadow */}
      <Sec t="Sombra">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: "var(--ed-txt2)" }}>Ativa</span>
          <SBtn active={!!s.shadow} onClick={() => u({ shadow: s.shadow ? undefined : { color: "rgba(0,0,0,0.4)", offsetX: 4, offsetY: 4, blur: 12 } })}>{s.shadow ? "ON" : "OFF"}</SBtn>
        </div>
        {s.shadow && <>
          <ColorSwatch value={s.shadow.color} onChange={v => u({ shadow: { ...s.shadow!, color: v } })} label="Cor" />
          <G2><F l="Off X"><Num v={s.shadow.offsetX} c={v => u({ shadow: { ...s.shadow!, offsetX: v } })} /></F><F l="Off Y"><Num v={s.shadow.offsetY} c={v => u({ shadow: { ...s.shadow!, offsetY: v } })} /></F></G2>
          <F l="Blur"><Num v={s.shadow.blur} c={v => u({ shadow: { ...s.shadow!, blur: v } })} /></F>
        </>}
      </Sec>

      {/* Effects */}
      <Sec t="Efeitos">
        <F l="Blend Mode">
          <select value={s.blendMode || "source-over"} onChange={e => u({ blendMode: e.target.value as BlendMode })} style={selS}>
            {BLEND_MODES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </F>
        <G2><F l="Skew X"><Num v={s.skewX || 0} c={v => u({ skewX: v })} /></F><F l="Skew Y"><Num v={s.skewY || 0} c={v => u({ skewY: v })} /></F></G2>
      </Sec>

      {/* Text */}
      {s.type === "text" && (
        <Sec t="Texto">
          <F l="Conteúdo"><textarea value={s.text || ""} onChange={e => u({ text: e.target.value })} rows={3} style={{ ...inpS, height: "auto", resize: "vertical", padding: "6px 8px" }} /></F>
          <F l="Fonte"><select value={s.fontFamily || FONTS[0]} onChange={e => u({ fontFamily: e.target.value })} style={selS}>{FONTS.map(f => <option key={f} value={f}>{f}</option>)}</select></F>
          <G2>
            <F l="Tamanho"><Num v={s.fontSize || 32} c={v => u({ fontSize: v })} /></F>
            <F l="Peso"><select value={(s.fontStyle || "normal").includes("bold") ? "bold" : "normal"} onChange={e => u({ fontStyle: e.target.value })} style={selS}><option value="normal">Normal</option><option value="bold">Bold</option></select></F>
          </G2>
          <F l="Cor texto"><ColorField value={s.fill || "#FFFFFF"} onChange={v => u({ fill: v })} /></F>
          <div style={{ display: "flex", gap: 3 }}>
            <AlBtn active={s.fontStyle === "bold"} onClick={() => u({ fontStyle: s.fontStyle === "bold" ? "normal" : "bold" })}>B</AlBtn>
            <AlBtn active={s.fontStyle === "italic"} onClick={() => u({ fontStyle: s.fontStyle === "italic" ? "normal" : "italic" })} italic>I</AlBtn>
            <AlBtn active={s.textDecoration === "underline"} onClick={() => u({ textDecoration: s.textDecoration === "underline" ? "none" : "underline" })}>U</AlBtn>
            <AlBtn active={s.textDecoration === "line-through"} onClick={() => u({ textDecoration: s.textDecoration === "line-through" ? "none" : "line-through" })}>S</AlBtn>
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            {(["left","center","right","justify"] as const).map(a => (
              <AlBtn key={a} active={s.align === a} onClick={() => u({ align: a })}>
                <svg viewBox="0 0 14 14" width={12} height={12}><path d={a === "left" ? "M2 3h8M2 6h5M2 9h7M2 12h4" : a === "center" ? "M2 3h10M4 6h6M3 9h8M4 12h6" : a === "right" ? "M4 3h8M7 6h5M5 9h7M8 12h4" : "M2 3h10M2 6h10M2 9h10M2 12h10"} stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" /></svg>
              </AlBtn>
            ))}
          </div>
          <G2><F l="Letter"><Num v={s.letterSpacing || 0} c={v => u({ letterSpacing: v })} /></F><F l="Line H"><Num v={s.lineHeight || 1.2} c={v => u({ lineHeight: v })} step={0.1} /></F></G2>
          <F l="Linhas">
            <Num v={s.linhas || 0} min={0} max={20} c={v => u({ linhas: v || undefined })} />
          </F>
          <G2>
            <F l="Stroke cor"><ColorSwatch value={s.stroke || "#000"} onChange={v => u({ stroke: v })} /></F>
            <F l="Stroke W"><Num v={s.strokeWidth || 0} c={v => u({ strokeWidth: v })} /></F>
          </G2>
        </Sec>
      )}

      {/* Image */}
      {s.type === "image" && (
        <Sec t="Imagem">
          <F l="URL"><Inp v={s.src || ""} c={v => u({ src: v })} /></F>
          <button
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file"; input.accept = "image/*";
              input.onchange = (e) => {
                const f = (e.target as HTMLInputElement).files?.[0]; if (!f) return;
                const r = new FileReader();
                r.onload = () => {
                  if (!r.result) return;
                  const dataUrl = r.result as string;
                  const img = new window.Image();
                  img.onload = () => {
                    const ratio = img.naturalWidth / img.naturalHeight;
                    // Mantém width, recalcula height proporcional — limpa crop antigo pra evitar mismatch
                    u({
                      src: dataUrl,
                      height: Math.max(10, Math.round(s.width / ratio)),
                      cropX: undefined, cropY: undefined, cropW: undefined, cropH: undefined,
                    });
                  };
                  img.onerror = () => u({ src: dataUrl });
                  img.src = dataUrl;
                };
                r.readAsDataURL(f);
              };
              input.click();
            }}
            style={{ width: "100%", height: 32, borderRadius: 6, border: "1px solid var(--ed-bdr)", background: "var(--ed-input)", color: "var(--ed-txt)", fontSize: 11, fontWeight: 600, cursor: "pointer", marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            ⟳ Substituir imagem
          </button>
          <F l="Borda Raio"><Num v={s.cornerRadius || 0} c={v => u({ cornerRadius: v })} /></F>
          <F l="Ajuste">
            <select value={s.imageFit || "fill"} onChange={e => u({ imageFit: e.target.value as EditorElement["imageFit"] })} style={selS}>
              <option value="fill">Esticar (fill)</option>
              <option value="cover">Cobrir (cover)</option>
              <option value="contain">Conter (contain)</option>
            </select>
          </F>
          {s.src && onOpenCrop && (
            <button onClick={onOpenCrop} style={{ width: "100%", height: 32, borderRadius: 6, border: "1px solid var(--ed-bdr)", background: "var(--ed-input)", color: "var(--ed-txt)", fontSize: 11, fontWeight: 600, cursor: "pointer", marginTop: 4 }}>✂ Cortar imagem</button>
          )}
          {(s.cropW && s.cropH) ? (
            <button onClick={() => u({ cropX: undefined, cropY: undefined, cropW: undefined, cropH: undefined })} style={{ width: "100%", height: 28, borderRadius: 6, border: "1px solid var(--ed-bdr)", background: "transparent", color: "var(--ed-txt2)", fontSize: 10, cursor: "pointer", marginTop: 2 }}>Remover corte</button>
          ) : null}
          <F l="Máscara">
            <select value={s.clipShape || "none"} onChange={e => u({ clipShape: e.target.value as EditorElement["clipShape"] })} style={selS}>
              <option value="none">Nenhuma</option>
              <option value="circle">Círculo</option>
              <option value="rounded">Retângulo arredondado</option>
            </select>
          </F>
          {s.clipShape === "rounded" && (
            <F l="Raio da máscara"><Num v={s.clipRadius ?? 40} c={v => u({ clipRadius: Math.max(0, v) })} /></F>
          )}
        </Sec>
      )}

      {/* QR Code */}
      {s.type === "qrcode" && (
        <Sec t="QR Code">
          <F l="URL / Texto"><Inp v={s.qrUrl || ""} c={v => u({ qrUrl: v })} /></F>
          <F l="Cor frente"><ColorField value={s.qrFg || "#000000"} onChange={v => u({ qrFg: v })} /></F>
          <F l="Cor fundo"><ColorField value={s.qrBg || "#FFFFFF"} onChange={v => u({ qrBg: v })} /></F>
        </Sec>
      )}

      {/* Bind */}
      <Sec t="Campo Bind">
        {s.bindParam && <div style={{ borderRadius: 6, background: "rgba(212,168,67,0.1)", padding: "4px 8px", fontSize: 9, fontWeight: 700, color: "var(--ed-bind)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>⬡ {s.bindParam}</div>}
        <select value={s.bindParam || ""} onChange={e => {
          const bp = e.target.value;
          const up: Partial<EditorElement> = { bindParam: bp };
          if (s.type === "text" && bp) { up.text = `[${bp}]`; up.fill = "#D4A843"; up.name = `[${bp}]`; }
          u(up);
        }} style={selS}>
          <option value="">Nenhum</option>
          {BIND_GROUPS.map(g => <optgroup key={g.group} label={g.group}>{g.fields.map(f => <option key={f} value={f}>{f}</option>)}</optgroup>)}
        </select>
      </Sec>
    </>
  );
}

/* ══ ANIMATE TAB ═════════════════════════════════ */
function AnimateTab({ s, u }: { s: EditorElement; u: (up: Partial<EditorElement>) => void }) {
  const anims = [
    { v: "none", l: "None" },{ v: "fadeIn", l: "Fade In" },{ v: "slideLeft", l: "Slide ←" },
    { v: "slideRight", l: "Slide →" },{ v: "slideUp", l: "Slide ↑" },{ v: "slideDown", l: "Slide ↓" },
    { v: "zoomIn", l: "Scale In" },{ v: "bounce", l: "Bounce" },{ v: "rotate360", l: "Rotate" },
    { v: "typewriter", l: "Typewriter" },{ v: "blurIn", l: "Blur In" },{ v: "pulse", l: "Pulse" },
    { v: "float", l: "Float" },{ v: "shake", l: "Shake" },{ v: "flipX", l: "Flip X" },
  ];
  return (
    <>
      <Sec t="Enter Animation">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 3 }}>
          {anims.map(a => (
            <button key={a.v} onClick={() => u({ animation: a.v as EditorElement["animation"] })} style={{
              padding: "7px 2px", borderRadius: 6, fontSize: 8, fontWeight: 600, cursor: "pointer",
              border: s.animation === a.v ? "1.5px solid var(--ed-accent)" : "1px solid var(--ed-bdr)",
              background: s.animation === a.v ? "var(--ed-active)" : "var(--ed-input)",
              color: s.animation === a.v ? "var(--ed-accent)" : "var(--ed-txt2)",
            }}>{a.l}</button>
          ))}
        </div>
      </Sec>
      {s.animation && s.animation !== "none" && (
        <Sec t="Timing">
          <G2>
            <F l="Delay (s)"><Num v={s.animDelay || 0} c={v => u({ animDelay: Math.max(0, v) })} step={0.1} /></F>
            <F l="Duração (s)"><Num v={s.animDuration || 0.6} c={v => u({ animDuration: Math.max(0.1, v) })} step={0.1} /></F>
          </G2>
          <F l="Easing">
            <select value={s.animEasing || "easeOut"} onChange={e => u({ animEasing: e.target.value as EditorElement["animEasing"] })} style={selS}>
              {[["linear","Linear"],["easeIn","Ease In"],["easeOut","Ease Out"],["easeInOut","Ease In Out"],["bounce","Bounce"],["elastic","Elastic"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </F>
          <F l="Repetição">
            <div style={{ display: "flex", gap: 3 }}>
              {[1,2,3,0].map(n => <SBtn key={n} active={(s.animRepeat ?? 1) === n} onClick={() => u({ animRepeat: n })}>{n === 0 ? "Loop" : `${n}x`}</SBtn>)}
            </div>
          </F>
        </Sec>
      )}
    </>
  );
}

/* ══ COLOR COMPONENTS ════════════════════════════ */
function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }} onClick={() => setOpen(!open)}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: value, border: "1px solid var(--ed-bdr)", flexShrink: 0 }} />
        <input type="text" value={value} onChange={e => onChange(e.target.value)} onClick={e => e.stopPropagation()} style={{ ...inpS, flex: 1 }} />
      </div>
      {open && (
        <div style={{ marginTop: 6 }}>
          <HexColorPicker color={value === "transparent" ? "#ffffff" : value} onChange={onChange} />
          <button onClick={() => { onChange("transparent"); setOpen(false); }} style={{ width: "100%", marginTop: 4, height: 24, borderRadius: 4, border: "1px solid var(--ed-bdr)", background: "repeating-conic-gradient(var(--ed-bdr) 0% 25%, transparent 0% 50%) 0 0/10px 10px", color: "var(--ed-txt2)", fontSize: 9, fontWeight: 600, cursor: "pointer" }}>
            Transparente
          </button>
        </div>
      )}
    </div>
  );
}

function ColorSwatch({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      {label && <div style={{ fontSize: 10, color: "var(--ed-txt2)", marginBottom: 2 }}>{label}</div>}
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <div onClick={() => setOpen(!open)} style={{ width: 28, height: 28, borderRadius: 6, background: value, border: "1px solid var(--ed-bdr)", cursor: "pointer", flexShrink: 0 }} />
        <input type="text" value={value} onChange={e => onChange(e.target.value)} style={{ ...inpS, flex: 1 }} />
      </div>
      {open && <div style={{ marginTop: 4 }}><HexColorPicker color={value.startsWith("rgba") ? "#000" : value} onChange={onChange} /></div>}
    </div>
  );
}

/* ══ UI ATOMS ═════════════════════════════════════ */
const inpS: React.CSSProperties = { width: "100%", height: 32, borderRadius: 6, border: "1px solid var(--ed-bdr)", background: "var(--ed-input)", padding: "0 8px", fontSize: 11, color: "var(--ed-txt)", outline: "none", boxSizing: "border-box" };
const selS: React.CSSProperties = { ...inpS, cursor: "pointer" };

function Sec({ t, children }: { t: string; children: React.ReactNode }) {
  const [o, setO] = useState(true);
  return <div style={{ marginBottom: 6, borderBottom: "1px solid var(--ed-bdr)", paddingBottom: 6 }}>
    <button onClick={() => setO(!o)} style={{ display: "flex", alignItems: "center", gap: 4, width: "100%", padding: "4px 0", background: "none", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--ed-txt2)" }}>
      <span style={{ transform: o ? "rotate(90deg)" : "none", transition: "transform 0.15s", fontSize: 10 }}>›</span>{t}
    </button>
    {o && <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 4 }}>{children}</div>}
  </div>;
}

function F({ l, children }: { l: string; children: React.ReactNode }) { return <div><div style={{ fontSize: 10, color: "var(--ed-txt2)", marginBottom: 2 }}>{l}</div>{children}</div>; }
function Num({ v, c, step, min, max }: { v: number; c: (v: number) => void; step?: number; min?: number; max?: number }) { return <input type="number" value={v} onChange={e => c(+e.target.value)} step={step} min={min} max={max} style={inpS} />; }
function Inp({ v, c }: { v: string; c: (v: string) => void }) { return <input type="text" value={v} onChange={e => c(e.target.value)} style={inpS} />; }
function G2({ children }: { children: React.ReactNode }) { return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>{children}</div>; }

function SBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} style={{ flex: 1, height: 28, borderRadius: 6, border: "none", background: active ? "var(--ed-active)" : "var(--ed-input)", color: active ? "var(--ed-accent)" : "var(--ed-txt2)", fontSize: 10, fontWeight: 600, cursor: "pointer" }}>{children}</button>;
}

function AlBtn({ active, onClick, children, italic }: { active: boolean; onClick: () => void; children: React.ReactNode; italic?: boolean }) {
  return <button onClick={onClick} style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: active ? "var(--ed-accent)" : "var(--ed-input)", color: active ? "#fff" : "var(--ed-txt2)", fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontStyle: italic ? "italic" : "normal" }}>{children}</button>;
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} style={{ flex: 1, padding: "10px 0", border: "none", borderBottom: active ? "2px solid var(--ed-accent)" : "2px solid transparent", background: "none", color: active ? "var(--ed-accent)" : "var(--ed-txt3)", fontSize: 10, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: 1 }}>{children}</button>;
}
