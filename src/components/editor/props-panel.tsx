import React, { useState, useEffect } from "react";
import { HexColorPicker } from "react-colorful";
import { EditorElement, FONTS, BLEND_MODES, BlendMode, TextCase, getBindGroups, resolveFontSpec, getImageBindFields, GradientFill, GradientDirection } from "./types";

interface Props {
  selected: EditorElement | null;
  canvasW: number; canvasH: number;
  allElements: EditorElement[];
  onUpdate: (id: string, u: Partial<EditorElement>) => void;
  onAlign: (a: string) => void;
  activeTab: "design" | "animate";
  onTabChange: (t: "design" | "animate") => void;
  selectedCount?: number;
  selectedIds?: string[];
  onOpenCrop?: () => void;
  formType?: string;
  isAdm?: boolean;
}

export default function PropsPanel({ selected: s, canvasW, canvasH, allElements, onUpdate, onAlign, activeTab, onTabChange, selectedCount, selectedIds, onOpenCrop, formType, isAdm }: Props) {
  if (!s) return (
    <div style={{ width: 232, background: "var(--ed-surface)", borderLeft: "1px solid var(--ed-bdr)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: 10, color: "var(--ed-txt3)" }}>Selecione um elemento</span>
    </div>
  );

  const u = (up: Partial<EditorElement>) => {
    if (selectedIds && selectedIds.length > 1) {
      // Batch update para seleção múltipla
      selectedIds.forEach(id => onUpdate(id, up));
    } else {
      // Single update
      onUpdate(s.id, up);
    }
  };

  return (
    <div style={{ width: 232, background: "var(--ed-bg, #0f1218)", borderLeft: "1px solid var(--ed-bdr)", overflowY: "auto", flexShrink: 0, display: "flex", flexDirection: "column" }}>
      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--ed-bdr)", flexShrink: 0, background: "var(--ed-surface)" }}>
        <TabBtn active={activeTab === "design"} onClick={() => onTabChange("design")}>Design</TabBtn>
        <TabBtn active={activeTab === "animate"} onClick={() => onTabChange("animate")}>Animate</TabBtn>
      </div>
      {selectedCount && selectedCount > 1 && (
        <div style={{ padding: "8px 12px", fontSize: 10, color: "var(--ed-bind)", fontWeight: 700, borderBottom: "1px solid var(--ed-bdr)", background: "var(--ed-surface)" }}>
          ✦ {selectedCount} selecionados
        </div>
      )}
      {/* Mini preview do elemento */}
      <div style={{
        height: 60,
        margin: "8px 8px 4px 8px",
        background: "var(--ed-input)",
        borderRadius: 8,
        border: "1px solid var(--ed-bdr)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
      }}>
        {/* Para texto: mostra o texto com a cor e fonte */}
        {s.type === "text" && (
          <span style={{
            fontSize: Math.min(14, (s.fontSize || 32) / 8),
            fontWeight: s.fontStyle?.match(/^\d+$/) ? parseInt(s.fontStyle) : 400,
            color: typeof s.fill === "string" ? s.fill : "#D4A843",
            maxWidth: "90%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            textTransform: (s.textTransform as React.CSSProperties["textTransform"]) || "none",
          }}>
            {s.text?.slice(0, 24) || "[texto]"}
          </span>
        )}
        {/* Para rect/circle: mostra a forma com a cor */}
        {(s.type === "rect" || s.type === "circle") && (
          <div style={{
            width: 36,
            height: 36,
            borderRadius: s.type === "circle" ? "50%" : (s.cornerRadius ? 6 : 4),
            background: typeof s.fill === "string" ? s.fill : "#D4A843",
            border: s.stroke ? `${s.strokeWidth || 1}px solid ${s.stroke}` : "none",
            opacity: s.opacity ?? 1,
          }} />
        )}
        {/* Para imagem: mostra thumbnail */}
        {s.type === "image" && s.src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.src} alt="" style={{
            maxHeight: 52,
            maxWidth: "90%",
            borderRadius: 4,
            objectFit: "contain",
          }} />
        )}
        {/* Para imagem sem src */}
        {s.type === "image" && !s.src && (
          <span style={{ fontSize: 9, color: "var(--ed-txt3)" }}>Sem imagem</span>
        )}
        {/* Para imageBind */}
        {s.type === "imageBind" && (
          <span style={{ fontSize: 9, color: "var(--ed-bind)", fontWeight: 700 }}>🖼 {s.bindParam || "bind"}</span>
        )}
        {/* Para QR code */}
        {s.type === "qrcode" && (
          <div style={{ width: 36, height: 36, background: s.qrBg || "#FFFFFF", border: `2px solid ${s.qrFg || "#000000"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>▦</div>
        )}
        {/* Label do tipo no canto */}
        <span style={{
          position: "absolute",
          bottom: 4,
          right: 6,
          fontSize: 8,
          color: "var(--ed-txt3)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}>
          {s.type}
        </span>
        {/* Nome do elemento no canto esquerdo */}
        <span style={{
          position: "absolute",
          bottom: 4,
          left: 6,
          fontSize: 8,
          color: "var(--ed-txt3)",
          fontWeight: 500,
          maxWidth: "60%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {s.name || s.id}
        </span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
        {activeTab === "design" ? <DesignTab s={s} u={u} allElements={allElements} onAlign={onAlign} onOpenCrop={onOpenCrop} formType={formType} isAdm={isAdm} /> : <AnimateTab s={s} u={u} />}
      </div>
    </div>
  );
}

/* ══ Helpers ══════════════════════════════════════ */
function isLine(el: EditorElement): boolean {
  return el.type === "rect" && (el.name?.toLowerCase().includes("linha") || el.height <= 8);
}

/* ══ DESIGN TAB ═══════════════════════════════════ */
function DesignTab({ s, u, allElements, onAlign, onOpenCrop, formType, isAdm }: { s: EditorElement; u: (up: Partial<EditorElement>) => void; allElements: EditorElement[]; onAlign: (a: string) => void; onOpenCrop?: () => void; formType?: string; isAdm?: boolean }) {
  return (
    <>
      {/* ═══ 1. CAMPO BIND ═══ (apenas ADM) */}
      {isAdm && (
        <Sec t="Campo Bind">
          {s.bindParam && <div style={{ borderRadius: 6, background: "rgba(212,168,67,0.1)", padding: "4px 8px", fontSize: 9, fontWeight: 700, color: "var(--ed-bind)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>⬡ {s.bindParam}</div>}
          <select value={s.bindParam || ""} onChange={e => {
            const bp = e.target.value;
            const up: Partial<EditorElement> = { bindParam: bp };
            if (s.type === "text" && bp) { up.text = `[${bp}]`; up.fill = "#D4A843"; up.name = `[${bp}]`; }
            u(up);
          }} style={selS}>
            <option value="">Nenhum</option>
            {getBindGroups(formType).map(g => <optgroup key={g.group} label={g.group}>{g.fields.map(f => <option key={f} value={f}>{f}</option>)}</optgroup>)}
          </select>
        </Sec>
      )}

      {/* ═══ 2. LAYOUT ═══ */}
      <Sec t="Layout">
        {/* Alinhar ao Canvas */}
        <div style={{ fontSize: 10, color: "var(--ed-txt2)", marginBottom: 4, fontWeight: 600 }}>Alinhar ao Canvas</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 4 }}>
          {[
            { k: "left",     t: "Alinhar à esquerda",     d: "M3 9h12M3 5l4 4-4 4" },
            { k: "center-h", t: "Centralizar horizontal", d: "M9 3v12M6 6l3-3 3 3M6 12l3 3 3-3" },
            { k: "right",    t: "Alinhar à direita",      d: "M15 9H3M15 5l-4 4 4 4" },
            { k: "top",      t: "Alinhar ao topo",        d: "M9 15V3M5 7l4-4 4 4" },
            { k: "center-v", t: "Centralizar vertical",   d: "M3 9h12M6 6l3-3 3 3M6 12l3 3 3-3" },
            { k: "bottom",   t: "Alinhar à base",         d: "M9 3v12M5 11l4 4 4-4" },
          ].map(a => (
            <AlignBtn key={a.k} onClick={() => onAlign(a.k)} title={a.t} d={a.d} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
          <SBtn active={!!s.locked} onClick={() => u({ locked: !s.locked })} title="Travar posição — impede mover acidentalmente">{s.locked ? "🔒 Travado" : "🔓 Travar"}</SBtn>
        </div>

        {/* Posição & Tamanho */}
        <div style={{ fontSize: 10, color: "var(--ed-txt2)", marginTop: 8, marginBottom: 4, fontWeight: 600 }}>Posição & Tamanho</div>
        <G2><F l="X"><Num v={Math.round(s.x)} c={v => u({ x: v })} /></F><F l="Y"><Num v={Math.round(s.y)} c={v => u({ y: v })} /></F></G2>
        <G2><F l="W"><Num v={Math.round(s.width)} c={v => u({ width: v })} /></F><F l="H"><Num v={Math.round(s.height)} c={v => u({ height: v })} /></F></G2>
        <G2>
          <F l="Rotação"><Num v={Math.round(s.rotation || 0)} c={v => u({ rotation: v })} /></F>
          <F l="Opacidade">
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <input type="range" min={0} max={1} step={0.05} value={s.opacity ?? 1} onChange={e => u({ opacity: +e.target.value })} style={{ flex: 1, accentColor: "var(--ed-accent)" }} />
              <span style={{ fontSize: 9, color: "var(--ed-txt3)", fontVariantNumeric: "tabular-nums", minWidth: 28, textAlign: "right" }}>{Math.round((s.opacity ?? 1) * 100)}%</span>
            </div>
          </F>
        </G2>
        <div style={{ display: "flex", gap: 3 }}>
          <SBtn active={!!s.flipX} onClick={() => u({ flipX: !s.flipX })} title="Espelhar horizontalmente">↔ Flip H</SBtn>
          <SBtn active={!!s.flipY} onClick={() => u({ flipY: !s.flipY })} title="Espelhar verticalmente">↕ Flip V</SBtn>
        </div>
      </Sec>

      {/* ═══ 3. TIPOGRAFIA ═══ */}
      {s.type === "text" && (
        <Sec t="Tipografia">
          {/* 1. Conteúdo */}
          <F l="Conteúdo"><textarea value={s.text || ""} onChange={e => u({ text: e.target.value })} rows={3} style={{ ...inpS, height: "auto", resize: "vertical", padding: "6px 8px" }} /></F>

          {/* 2. Fonte + Tamanho + Peso */}
          <F l="Fonte"><select value={s.fontFamily && s.fontStyle && s.fontStyle.match(/^\d+$/) ? `Helvetica Neue ${({"100":"Thin","300":"Light","400":"","500":"Medium","700":"Bold","800":"Heavy","900":"Black"} as Record<string,string>)[s.fontStyle] || ""}`.trim() || s.fontFamily : (s.fontFamily || FONTS[0])} onChange={e => {
            const picked = e.target.value;
            const spec = resolveFontSpec(picked);
            // Se for variante de Helvetica Neue, grava fontFamily "Helvetica Neue" + fontStyle numérico
            if (picked.startsWith("Helvetica Neue")) {
              u({ fontFamily: spec.fontFamily, fontStyle: spec.fontWeight });
            } else {
              // Fonte não-HN: limpa peso numérico se existir
              u({ fontFamily: picked, ...(s.fontStyle?.match(/^\d+$/) ? { fontStyle: "normal" } : {}) });
            }
          }} style={selS}>{FONTS.map(f => <option key={f} value={f}>{f}</option>)}</select></F>
          <G2>
            <F l="Tamanho"><Num v={s.fontSize || 32} c={v => u({ fontSize: v })} /></F>
            <F l="Peso">
              <select
                value={
                  s.fontStyle?.match(/^\d+$/)
                    ? s.fontStyle
                    : s.fontStyle === "bold"
                    ? "700"
                    : "400"
                }
                onChange={e => u({ fontStyle: e.target.value })}
                style={selS}
              >
                <option value="100">100 · Thin</option>
                <option value="300">300 · Light</option>
                <option value="400">400 · Regular</option>
                <option value="500">500 · Medium</option>
                <option value="700">700 · Bold</option>
                <option value="800">800 · Heavy</option>
                <option value="900">900 · Black</option>
              </select>
            </F>
          </G2>

          {/* 3. Formatação — B U S + transform Aa AA aa Ab */}
          <div style={{ display: "flex", gap: 3 }}>
            <AlBtn
              title="Negrito"
              active={
                s.fontStyle?.match(/^\d+$/)
                  ? parseInt(s.fontStyle) >= 700
                  : s.fontStyle === "bold"
              }
              onClick={() => {
                const currentWeight = s.fontStyle?.match(/^\d+$/)
                  ? parseInt(s.fontStyle)
                  : s.fontStyle === "bold"
                  ? 700
                  : 400;
                u({ fontStyle: currentWeight >= 700 ? "400" : "700" });
              }}
            >
              B
            </AlBtn>
            <AlBtn title="Sublinhado" active={s.textDecoration === "underline"} onClick={() => u({ textDecoration: s.textDecoration === "underline" ? "none" : "underline" })}>U</AlBtn>
            <AlBtn title="Tachado" active={s.textDecoration === "line-through"} onClick={() => u({ textDecoration: s.textDecoration === "line-through" ? "none" : "line-through" })}>S</AlBtn>
          </div>
          <div style={{ display: "flex", gap: 3, marginTop: 3 }}>
            {(["none","uppercase","lowercase","capitalize"] as const).map(tc => (
              <button key={tc}
                title={tc === "none" ? "Normal" : tc === "uppercase" ? "MAIÚSCULAS" : tc === "lowercase" ? "minúsculas" : "Capitalizar"}
                onClick={() => u({ textTransform: tc })}
                style={{
                  flex: 1, height: 24, fontSize: 9, fontWeight: 700,
                  borderRadius: 4, border: "1px solid var(--ed-bdr)",
                  background: s.textTransform === tc ? "var(--ed-accent)" : "var(--ed-surface2)",
                  color: s.textTransform === tc ? "#fff" : "var(--ed-txt2)",
                  cursor: "pointer",
                }}>
                {tc === "none" ? "Aa" : tc === "uppercase" ? "AA" : tc === "lowercase" ? "aa" : "Ab"}
              </button>
            ))}
          </div>

          {/* 4. Alinhamento */}
          <div style={{ display: "flex", gap: 3 }}>
            {(["left","center","right","justify"] as const).map(a => (
              <AlBtn key={a} active={s.align === a} onClick={() => u({ align: a })}>
                <svg viewBox="0 0 14 14" width={12} height={12}><path d={a === "left" ? "M2 3h8M2 6h5M2 9h7M2 12h4" : a === "center" ? "M2 3h10M4 6h6M3 9h8M4 12h6" : a === "right" ? "M4 3h8M7 6h5M5 9h7M8 12h4" : "M2 3h10M2 6h10M2 9h10M2 12h10"} stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" /></svg>
              </AlBtn>
            ))}
          </div>

          {/* 5. Cor */}
          <F l="Cor texto"><FillEditor value={s.fill || "#FFFFFF"} onChange={v => u({ fill: v })} /></F>

          {/* 6. Espaçamento */}
          <G2><F l="Letter"><Num v={s.letterSpacing || 0} c={v => u({ letterSpacing: v })} /></F><F l="Line H"><Num v={s.lineHeight || 1.2} c={v => u({ lineHeight: v })} step={0.1} /></F></G2>
          <F l="Linhas máx">
            <Num v={s.linhas || 0} min={0} max={20} c={v => u({ linhas: v || undefined })} />
          </F>

          {/* 7. Stroke */}
          <G2>
            <F l="Stroke cor"><ColorSwatch value={s.stroke || "#000"} onChange={v => u({ stroke: v })} /></F>
            <F l="Stroke W"><Num v={s.strokeWidth || 0} c={v => u({ strokeWidth: v })} min={0} /></F>
          </G2>

          {/* 8. Comportamento */}
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <label
              title="Divide o valor em inteiro (grande) e centavos (pequeno) no canvas. Ex: R$ 1.234 ,56"
              style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--ed-txt2)", cursor: "pointer" }}
            >
              <input type="checkbox" checked={!!s.priceDisplay} onChange={e => u({ priceDisplay: e.target.checked })} />
              Split R$
            </label>
            <label
              title="Se o bind não tiver valor preenchido no formulário, o elemento some da arte final"
              style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--ed-txt2)", cursor: "pointer" }}
            >
              <input type="checkbox" checked={!!s.hideIfEmpty} onChange={e => u({ hideIfEmpty: e.target.checked })} />
              Ocultar vazio
            </label>
          </div>
        </Sec>
      )}

      {/* ═══ 4. APARÊNCIA ═══ */}
      <Sec t="Aparência">
        {/* Preenchimento — hide for lines, images and qrcode */}
        {s.type !== "image" && s.type !== "qrcode" && !isLine(s) && (
          <>
            <SubSec t="Preenchimento" />
            <FillEditor value={s.fill || "#FFFFFF"} onChange={v => u({ fill: v })} />
          </>
        )}

        {/* Linha — line-specific section */}
        {isLine(s) && (
          <>
            <SubSec t="Linha" />
            <F l="Cor"><ColorField value={typeof s.fill === "string" ? s.fill : "#FFFFFF"} onChange={v => u({ fill: v })} /></F>
            <F l="Espessura"><Num v={s.height} c={v => u({ height: Math.max(1, Math.min(100, v)) })} min={1} /></F>
            <F l="Estilo">
              <div style={{ display: "flex", gap: 3 }}>
                <SBtn active={!s.strokeDashArray || s.strokeDashArray.length === 0} onClick={() => u({ strokeDashArray: undefined })}>Sólido</SBtn>
                <SBtn active={!!s.strokeDashArray && s.strokeDashArray[0] === 6} onClick={() => u({ strokeDashArray: [6, 4] })}>Tracejado</SBtn>
                <SBtn active={!!s.strokeDashArray && s.strokeDashArray[0] === 2} onClick={() => u({ strokeDashArray: [2, 3] })}>Pontilhado</SBtn>
              </div>
            </F>
          </>
        )}

        {/* Borda — hide for lines */}
        {!isLine(s) && (
          <>
            <hr style={{ border: "none", borderTop: "1px solid var(--ed-bdr)", margin: "8px 0" }} />
            <SubSec t="Borda" right={
              <button
                onClick={() => u({
                  strokeWidth: (s.strokeWidth && s.strokeWidth > 0) ? 0 : (s.strokeWidth || 1),
                  stroke: s.stroke || "#000000"
                })}
                style={{
                  height: 22,
                  padding: "0 10px",
                  borderRadius: 11,
                  border: "none",
                  background: (s.strokeWidth && s.strokeWidth > 0) ? "var(--ed-accent)" : "var(--ed-input)",
                  color: (s.strokeWidth && s.strokeWidth > 0) ? "#000" : "var(--ed-txt3)",
                  fontSize: 9,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
              >
                {(s.strokeWidth && s.strokeWidth > 0) ? "ON" : "OFF"}
              </button>
            } />
            {!!s.strokeWidth && s.strokeWidth > 0 && (
              <>
                <G2>
                  <F l="Cor"><ColorSwatch value={s.stroke || "#000"} onChange={v => u({ stroke: v })} /></F>
                  <F l="Espessura"><Num v={s.strokeWidth || 0} c={v => u({ strokeWidth: v })} min={0} /></F>
                </G2>
                <F l="Estilo">
                  <div style={{ display: "flex", gap: 3 }}>
                    <SBtn active={!s.strokeDashArray || s.strokeDashArray.length === 0}
                      onClick={() => u({ strokeDashArray: undefined })}>Sólido</SBtn>
                    <SBtn active={!!s.strokeDashArray && s.strokeDashArray[0] === 6}
                      onClick={() => u({ strokeDashArray: [6, 4] })}>Tracejado</SBtn>
                    <SBtn active={!!s.strokeDashArray && s.strokeDashArray[0] === 2}
                      onClick={() => u({ strokeDashArray: [2, 3] })}>Pontilhado</SBtn>
                  </div>
                </F>
              </>
            )}
          </>
        )}

        {/* Cantos */}
        {s.type === "rect" && (
          <>
            <hr style={{ border: "none", borderTop: "1px solid var(--ed-bdr)", margin: "8px 0" }} />
            <SubSec t="Cantos" />
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
          </>
        )}

        {/* Sombra */}
        <hr style={{ border: "none", borderTop: "1px solid var(--ed-bdr)", margin: "8px 0" }} />
        <SubSec t="Sombra" right={
          <SBtn active={!!s.shadow}
            onClick={() => u({ shadow: s.shadow ? undefined : { color: "rgba(0,0,0,0.4)", offsetX: 4, offsetY: 4, blur: 12 } })}>
            {s.shadow ? "ON" : "OFF"}
          </SBtn>
        } />
        {s.shadow && (
          <>
            <ColorSwatch value={s.shadow.color} onChange={v => u({ shadow: { ...s.shadow!, color: v } })} label="Cor" />
            <G2>
              <F l="Off X"><Num v={s.shadow.offsetX} c={v => u({ shadow: { ...s.shadow!, offsetX: v } })} /></F>
              <F l="Off Y"><Num v={s.shadow.offsetY} c={v => u({ shadow: { ...s.shadow!, offsetY: v } })} /></F>
            </G2>
            <F l="Blur"><Num v={s.shadow.blur} c={v => u({ shadow: { ...s.shadow!, blur: v } })} /></F>
          </>
        )}
      </Sec>

      {/* ═══ 5. IMAGEM ═══ */}
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

      {/* Image Bind — placeholder para imagens do formulário */}
      {s.type === "imageBind" && (
        <Sec t="Bind Imagem">
          <div style={{ fontSize: 9, color: "var(--ed-txt3)", marginBottom: 4, lineHeight: 1.4 }}>
            Placeholder visível só no editor. No cliente, será substituído pela imagem do campo vinculado.
          </div>
          <F l="Campo do formulário">
            <select
              value={s.bindParam || ""}
              onChange={e => {
                const bp = e.target.value;
                u({ bindParam: bp || undefined, name: bp ? `🖼 ${bp}` : s.name });
              }}
              style={selS}
            >
              <option value="">— escolha um campo —</option>
              {getImageBindFields(formType).map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </F>
          <F l="Borda Raio"><Num v={s.cornerRadius || 0} c={v => u({ cornerRadius: v })} /></F>
          <F l="Ajuste (preview)">
            <select value={s.imageFit || "cover"} onChange={e => u({ imageFit: e.target.value as EditorElement["imageFit"] })} style={selS}>
              <option value="fill">Esticar (fill)</option>
              <option value="cover">Cobrir (cover)</option>
              <option value="contain">Conter (contain)</option>
            </select>
          </F>
          <F l="Máscara">
            <select value={s.clipShape || "none"} onChange={e => u({ clipShape: e.target.value as EditorElement["clipShape"] })} style={selS}>
              <option value="none">Nenhuma</option>
              <option value="circle">Círculo</option>
              <option value="rounded">Retângulo arredondado</option>
            </select>
          </F>
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

      {/* ═══ 6. EFEITOS ═══ */}
      <Sec t="Efeitos">
        <F l="Blend Mode">
          <select value={s.blendMode || "source-over"} onChange={e => u({ blendMode: e.target.value as BlendMode })} style={selS}>
            {BLEND_MODES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </F>
        <G2><F l="Skew X"><Num v={s.skewX || 0} c={v => u({ skewX: v })} /></F><F l="Skew Y"><Num v={s.skewY || 0} c={v => u({ skewY: v })} /></F></G2>
      </Sec>

      {/* ═══ 7. SMART FEATURES ═══ (apenas ADM) */}
      {isAdm && (
      <Sec t="Smart Features">
        <div style={{ fontSize: 9, color: "var(--ed-txt3)", marginBottom: 6, lineHeight: 1.4 }}>
          Vincule este elemento para seguir/acompanhar outro automaticamente.
        </div>

        {/* Smart Track — segue posição */}
        <SmartCard icon="⟷" titulo="Seguir posição" subtitulo="Acompanha movimento de outro" temAlvo={!!s.smartTrack?.targetId} tooltip="Move junto com outro elemento. Configure direção (direita/esquerda/acima/abaixo) e distância em pixels.">
          <select
            value={s.smartTrack?.targetId || ""}
            onChange={e => {
              const targetId = e.target.value;
              if (!targetId) u({ smartTrack: undefined });
              else u({ smartTrack: { targetId, direction: s.smartTrack?.direction || "right", gap: s.smartTrack?.gap ?? 8 } });
            }}
            style={selS}
          >
            <option value="">— nenhum —</option>
            {allElements.filter(e => e.id !== s.id).map(e => (
              <option key={e.id} value={e.id}>{e.name || e.id}</option>
            ))}
          </select>
          {s.smartTrack && (
            <G2>
              <F l="Direção">
                <select
                  value={s.smartTrack.direction}
                  onChange={e => u({ smartTrack: { ...s.smartTrack!, direction: e.target.value as "right"|"left"|"down"|"up" } })}
                  style={selS}
                >
                  <option value="right">→ Direita</option>
                  <option value="left">← Esquerda</option>
                  <option value="down">↓ Abaixo</option>
                  <option value="up">↑ Acima</option>
                </select>
              </F>
              <F l="Gap"><Num v={s.smartTrack.gap} c={v => u({ smartTrack: { ...s.smartTrack!, gap: v } })} /></F>
            </G2>
          )}
        </SmartCard>

        {/* Text Anchor — A termina onde B começa */}
        <SmartCard icon="⚓" titulo="Âncora de texto" subtitulo="Inicia onde outro termina" temAlvo={!!s.textAnchor?.targetId} tooltip="Este elemento começa onde o alvo termina. Útil para empilhar elementos que variam de tamanho.">
          <select
            value={s.textAnchor?.targetId || ""}
            onChange={e => {
              const targetId = e.target.value;
              if (!targetId) u({ textAnchor: undefined });
              else u({ textAnchor: { targetId, position: s.textAnchor?.position || "after" } });
            }}
            style={selS}
          >
            <option value="">— nenhum —</option>
            {allElements.filter(e => e.id !== s.id).map(e => (
              <option key={e.id} value={e.id}>{e.name || e.id}</option>
            ))}
          </select>
          {s.textAnchor && (
            <F l="Posição">
              <select
                value={s.textAnchor.position}
                onChange={e => u({ textAnchor: { ...s.textAnchor!, position: e.target.value as "after"|"below" } })}
                style={selS}
              >
                <option value="after">→ Depois (mesma linha)</option>
                <option value="below">↓ Abaixo</option>
              </select>
            </F>
          )}
        </SmartCard>

        {/* Smart Resize — ajusta tamanho */}
        <SmartCard icon="⤢" titulo="Ajustar tamanho" subtitulo="Redimensiona conforme outro" temAlvo={!!s.smartResize?.targetId} tooltip="Este elemento cresce e encolhe junto com o alvo. Ideal para retângulos de fundo que envolvem textos dinâmicos.">
          <select
            value={s.smartResize?.targetId || ""}
            onChange={e => {
              const targetId = e.target.value;
              if (!targetId) u({ smartResize: undefined });
              else u({ smartResize: { targetId, direction: s.smartResize?.direction || "vertical", padding: s.smartResize?.padding ?? 0 } });
            }}
            style={selS}
          >
            <option value="">— nenhum —</option>
            {allElements.filter(e => e.id !== s.id).map(e => (
              <option key={e.id} value={e.id}>{e.name || e.id}</option>
            ))}
          </select>
          {s.smartResize && (
            <G2>
              <F l="Eixo">
                <select
                  value={s.smartResize.direction}
                  onChange={e => u({ smartResize: { ...s.smartResize!, direction: e.target.value as "vertical"|"horizontal" } })}
                  style={selS}
                >
                  <option value="vertical">↕ Vertical (altura)</option>
                  <option value="horizontal">↔ Horizontal (largura)</option>
                </select>
              </F>
              <F l="Padding"><Num v={s.smartResize.padding} c={v => u({ smartResize: { ...s.smartResize!, padding: v } })} /></F>
            </G2>
          )}
        </SmartCard>
      </Sec>
      )}
    </>
  );
}

/* ══ ANIMATE TAB ═════════════════════════════════ */
function getPreviewAnimation(animation?: string): string {
  if (!animation || animation === "none") return "none";
  const map: Record<string, string> = {
    fadeIn: "ahPrevFadeIn 1.4s ease-out infinite",
    slideLeft: "ahPrevSlideLeft 1.4s ease-out infinite",
    slideRight: "ahPrevSlideRight 1.4s ease-out infinite",
    slideUp: "ahPrevSlideUp 1.4s ease-out infinite",
    slideDown: "ahPrevSlideDown 1.4s ease-out infinite",
    zoomIn: "ahPrevZoomIn 1.4s ease-out infinite",
    bounce: "ahPrevBounce 1.4s ease-out infinite",
    rotate360: "ahPrevRotate 1.6s linear infinite",
    typewriter: "ahPrevFadeIn 1.4s ease-out infinite",
    blurIn: "ahPrevBlurIn 1.4s ease-out infinite",
    pulse: "ahPrevPulse 1.4s ease-in-out infinite",
    float: "ahPrevFloat 1.6s ease-in-out infinite",
    shake: "ahPrevShake 0.6s ease-in-out infinite",
    flipX: "ahPrevFlipX 1.6s ease-in-out infinite",
  };
  return map[animation] || "none";
}

function AnimateTab({ s, u }: { s: EditorElement; u: (up: Partial<EditorElement>) => void }) {
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("aurohub-anim-preview-styles")) return;
    const style = document.createElement("style");
    style.id = "aurohub-anim-preview-styles";
    style.textContent = `
@keyframes ahPrevFadeIn { 0% { opacity: 0 } 60%, 100% { opacity: 1 } }
@keyframes ahPrevSlideLeft { 0% { transform: translateX(-30px); opacity: 0 } 60%, 100% { transform: translateX(0); opacity: 1 } }
@keyframes ahPrevSlideRight { 0% { transform: translateX(30px); opacity: 0 } 60%, 100% { transform: translateX(0); opacity: 1 } }
@keyframes ahPrevSlideUp { 0% { transform: translateY(20px); opacity: 0 } 60%, 100% { transform: translateY(0); opacity: 1 } }
@keyframes ahPrevSlideDown { 0% { transform: translateY(-20px); opacity: 0 } 60%, 100% { transform: translateY(0); opacity: 1 } }
@keyframes ahPrevZoomIn { 0% { transform: scale(0.4); opacity: 0 } 60%, 100% { transform: scale(1); opacity: 1 } }
@keyframes ahPrevBounce { 0% { transform: scale(0.5) } 40% { transform: scale(1.15) } 60% { transform: scale(0.95) } 80% { transform: scale(1.05) } 100% { transform: scale(1) } }
@keyframes ahPrevRotate { 0% { transform: rotate(0deg) } 100% { transform: rotate(360deg) } }
@keyframes ahPrevBlurIn { 0% { filter: blur(8px); opacity: 0 } 60%, 100% { filter: blur(0); opacity: 1 } }
@keyframes ahPrevPulse { 0%, 100% { transform: scale(1) } 50% { transform: scale(1.15) } }
@keyframes ahPrevFloat { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
@keyframes ahPrevShake { 0%, 100% { transform: translateX(0) } 25% { transform: translateX(-4px) } 75% { transform: translateX(4px) } }
@keyframes ahPrevFlipX { 0% { transform: rotateY(0deg) } 100% { transform: rotateY(360deg) } }
`;
    document.head.appendChild(style);
  }, []);

  const anims = [
    { v: "none", l: "None" },{ v: "fadeIn", l: "Fade In" },{ v: "slideLeft", l: "Slide ←" },
    { v: "slideRight", l: "Slide →" },{ v: "slideUp", l: "Slide ↑" },{ v: "slideDown", l: "Slide ↓" },
    { v: "zoomIn", l: "Scale In" },{ v: "bounce", l: "Bounce" },{ v: "rotate360", l: "Rotate" },
    { v: "typewriter", l: "Typewriter" },{ v: "blurIn", l: "Blur In" },{ v: "pulse", l: "Pulse" },
    { v: "float", l: "Float" },{ v: "shake", l: "Shake" },{ v: "flipX", l: "Flip X" },
  ];

  const previewColor = s.type === "text"
    ? (typeof s.fill === "string" ? s.fill : "#D4A843")
    : (typeof s.fill === "string" ? s.fill : "#D4A843");

  return (
    <>
      <Sec t="Enter Animation">
        {/* Mini preview */}
        <div style={{
          height: 80,
          background: "var(--ed-input)",
          borderRadius: 8,
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          position: "relative",
          border: "1px solid var(--ed-bdr)",
        }}>
          <div
            key={(s.animation || "none") + "-" + previewKey}
            style={{
              width: s.type === "text" ? "80%" : 40,
              height: s.type === "text" ? "auto" : 40,
              background: s.type === "text" ? "transparent" : previewColor,
              borderRadius: s.cornerRadius ? 6 : (s.type === "circle" ? "50%" : 4),
              fontSize: s.type === "text" ? 12 : undefined,
              color: s.type === "text" ? previewColor : undefined,
              fontWeight: 700,
              textAlign: "center",
              padding: s.type === "text" ? "0 4px" : undefined,
              animation: getPreviewAnimation(s.animation),
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {s.type === "text" ? (s.text?.slice(0, 20) || "Texto") : ""}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 3 }}>
          {anims.map(a => (
            <button key={a.v} onClick={() => { u({ animation: a.v as EditorElement["animation"] }); setPreviewKey(k => k + 1); }} style={{
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

/* ══ FILL EDITOR (Sólido / Gradiente) ═════════ */
function FillEditor({ value, onChange }: { value: string | GradientFill; onChange: (v: string | GradientFill) => void }) {
  const isGradient = typeof value === "object" && value.type === "gradient";
  const solidColor = typeof value === "string" ? value : "#FFFFFF";
  const gradientData = isGradient ? value : { type: "gradient" as const, colors: ["#FFFFFF", "#000000"] as [string, string], direction: "vertical" as GradientDirection };

  // Stops customizados ou padrão (início e fim)
  const stops = gradientData.stops || [
    { offset: 0, color: gradientData.colors[0] },
    { offset: 1, color: gradientData.colors[1] }
  ];

  const updateStops = (newStops: Array<{ offset: number; color: string }>) => {
    // Atualiza colors array com início e fim para compatibilidade
    onChange({
      ...gradientData,
      colors: [newStops[0].color, newStops[newStops.length - 1].color],
      stops: newStops.length > 2 ? newStops : undefined
    });
  };

  const addStop = () => {
    if (stops.length >= 5) return;
    const newOffset = stops.length > 0 ? (stops[stops.length - 1].offset + 0.5) / 1.5 : 0.5;
    updateStops([...stops, { offset: Math.min(1, newOffset), color: "#808080" }].sort((a, b) => a.offset - b.offset));
  };

  const removeStop = (index: number) => {
    if (stops.length <= 2) return;
    updateStops(stops.filter((_, i) => i !== index));
  };

  const updateStop = (index: number, update: Partial<{ offset: number; color: string }>) => {
    const newStops = [...stops];
    newStops[index] = { ...newStops[index], ...update };
    updateStops(newStops.sort((a, b) => a.offset - b.offset));
  };

  return (
    <div>
      {/* Toggle Sólido / Gradiente */}
      <div style={{ display: "flex", gap: 3, marginBottom: 6 }}>
        <SBtn active={!isGradient} onClick={() => onChange(solidColor)}>Sólido</SBtn>
        <SBtn active={isGradient} onClick={() => onChange(gradientData)}>Gradiente</SBtn>
      </div>

      {/* Sólido: 1 color picker */}
      {!isGradient && (
        <ColorField value={solidColor} onChange={c => onChange(c)} />
      )}

      {/* Gradiente: stops customizados + direção */}
      {isGradient && (
        <>
          <F l="Direção">
            <select value={gradientData.direction} onChange={e => onChange({ ...gradientData, direction: e.target.value as GradientDirection })} style={selS}>
              <option value="horizontal">Horizontal →</option>
              <option value="vertical">Vertical ↓</option>
              <option value="diagonal-down">Diagonal ↘</option>
              <option value="diagonal-up">Diagonal ↗</option>
            </select>
          </F>

          <F l="Cores">
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {stops.map((stop, i) => (
                <div key={i} style={{ display: "flex", gap: 3, alignItems: "center" }}>
                  <div onClick={() => {
                    const input = document.createElement("input");
                    input.type = "color";
                    input.value = stop.color;
                    input.onchange = () => updateStop(i, { color: input.value });
                    input.click();
                  }} style={{ width: 24, height: 24, borderRadius: 4, background: stop.color, border: "1px solid var(--ed-bdr)", cursor: "pointer", flexShrink: 0 }} />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(stop.offset * 100)}
                    onChange={e => updateStop(i, { offset: +e.target.value / 100 })}
                    style={{ flex: 1, accentColor: "var(--ed-accent)" }}
                  />
                  <span style={{ fontSize: 9, color: "var(--ed-txt3)", width: 30, textAlign: "right" }}>{Math.round(stop.offset * 100)}%</span>
                  {stops.length > 2 && (
                    <button onClick={() => removeStop(i)} style={{ width: 20, height: 20, borderRadius: 4, border: "none", background: "var(--ed-hover)", color: "var(--ed-txt3)", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                  )}
                </div>
              ))}
              {stops.length < 5 && (
                <button onClick={addStop} style={{ width: "100%", height: 24, borderRadius: 4, border: "1px solid var(--ed-bdr)", background: "var(--ed-hover)", color: "var(--ed-txt2)", fontSize: 9, fontWeight: 600, cursor: "pointer" }}>+ Cor</button>
              )}
            </div>
          </F>
        </>
      )}
    </div>
  );
}

/* ══ COLOR COMPONENTS ════════════════════════════ */
function DropperBtn({ onChange }: { onChange: (v: string) => void }) {
  if (typeof window === "undefined" || !("EyeDropper" in window)) return null;
  return (
    <button
      title="Conta-gotas"
      onClick={async () => {
        try {
          const dropper = new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper();
          const result = await dropper.open();
          onChange(result.sRGBHex);
        } catch { /* cancelado */ }
      }}
      style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--ed-bdr)", background: "var(--ed-surface2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}
    >
      🩸
    </button>
  );
}

function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer", flex: 1 }} onClick={() => setOpen(!open)}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: value, border: "1px solid var(--ed-bdr)", flexShrink: 0 }} />
          <input type="text" value={value} onChange={e => onChange(e.target.value)} onClick={e => e.stopPropagation()} style={{ ...inpS, flex: 1 }} />
        </div>
        <DropperBtn onChange={onChange} />
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
        <DropperBtn onChange={onChange} />
      </div>
      {open && <div style={{ marginTop: 4 }}><HexColorPicker color={value.startsWith("rgba") ? "#000" : value} onChange={onChange} /></div>}
    </div>
  );
}

/* ══ UI ATOMS ═════════════════════════════════════ */
const inpS: React.CSSProperties = { width: "100%", height: 28, borderRadius: 6, border: "1px solid var(--ed-bdr)", background: "var(--ed-input)", padding: "0 8px", fontSize: 11, color: "var(--ed-txt)", outline: "none", boxSizing: "border-box", textAlign: "center", transition: "border-color 0.15s" };
const selS: React.CSSProperties = { ...inpS, cursor: "pointer", textAlign: "left" };

function Sec({ t, children }: { t: string; children: React.ReactNode }) {
  const [o, setO] = useState(true);
  return (
    <div style={{
      marginBottom: 4,
      background: "var(--ed-surface, rgba(255,255,255,0.04))",
      borderRadius: 8,
      border: "1px solid var(--ed-bdr)",
      overflow: "hidden",
    }}>
      <button onClick={() => setO(!o)} style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        padding: "8px 12px",
        background: "none",
        border: "none",
        borderBottom: o ? "1px solid var(--ed-bdr)" : "none",
        cursor: "pointer",
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--ed-txt)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: "var(--ed-accent)",
            flexShrink: 0,
          }} />
          <span style={{ color: "var(--ed-txt)", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{t}</span>
        </div>
        <span style={{
          transform: o ? "rotate(90deg)" : "none",
          transition: "transform 0.15s",
          fontSize: 10,
          color: "var(--ed-txt3)",
        }}>›</span>
      </button>
      {o && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          padding: "10px 12px",
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

function F({ l, children }: { l: string; children: React.ReactNode }) { return <div><div style={{ fontSize: 10, color: "var(--ed-txt2)", marginBottom: 3, fontWeight: 500 }}>{l}</div>{children}</div>; }

function Num({ v, c, step, min, max }: { v: number; c: (v: number) => void; step?: number; min?: number; max?: number }) {
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  return <input
    type="number"
    value={v}
    onChange={e => c(+e.target.value)}
    step={step} min={min} max={max}
    onMouseEnter={() => setHover(true)}
    onMouseLeave={() => setHover(false)}
    onFocus={() => setFocus(true)}
    onBlur={() => setFocus(false)}
    style={{ ...inpS, borderColor: (hover || focus) ? "var(--ed-accent)" : "var(--ed-bdr)" }}
  />;
}

function Inp({ v, c }: { v: string; c: (v: string) => void }) { return <input type="text" value={v} onChange={e => c(e.target.value)} style={{ ...inpS, textAlign: "left" }} />; }
function G2({ children }: { children: React.ReactNode }) { return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>{children}</div>; }

function SBtn({ active, onClick, children, title }: { active: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return <button onClick={onClick} title={title} style={{ flex: 1, height: 26, borderRadius: 6, border: "none", background: active ? "var(--ed-accent)" : "var(--ed-input)", color: active ? "#000000" : "var(--ed-txt2)", fontSize: 10, fontWeight: active ? 700 : 600, cursor: "pointer", transition: "background 0.15s" }}>{children}</button>;
}

function AlBtn({ active, onClick, children, italic, title }: { active: boolean; onClick: () => void; children: React.ReactNode; italic?: boolean; title?: string }) {
  return <button onClick={onClick} title={title} style={{ width: 26, height: 26, borderRadius: 5, border: "none", background: active ? "var(--ed-accent)" : "var(--ed-input)", color: active ? "#000000" : "var(--ed-txt2)", fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontStyle: italic ? "italic" : "normal", transition: "background 0.15s" }}>{children}</button>;
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} style={{ flex: 1, padding: "10px 0", border: "none", borderBottom: active ? "2px solid var(--ed-accent)" : "2px solid transparent", background: "none", color: active ? "var(--ed-accent)" : "var(--ed-txt3)", fontSize: 10, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: 1 }}>{children}</button>;
}

function AlignBtn({ onClick, title, d }: { onClick: () => void; title: string; d: string }) {
  const [hover, setHover] = useState(false);
  const iconColor = hover ? "var(--ed-accent)" : "var(--ed-txt2)";
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "100%",
        height: 36,
        borderRadius: 8,
        border: "1px solid var(--ed-bdr)",
        background: hover ? "var(--ed-hover)" : "var(--ed-input)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      <svg viewBox="0 0 18 18" width={16} height={16} fill="none">
        <path
          d={d}
          stroke={iconColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function SubSec({ t, right }: { t: string; right?: React.ReactNode }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 6,
      marginTop: 2,
    }}>
      <span style={{
        fontSize: 9,
        fontWeight: 700,
        color: "var(--ed-txt2)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        whiteSpace: "nowrap",
      }}>{t}</span>
      <div style={{ flex: 1, height: 1, background: "var(--ed-bdr)" }} />
      {right && right}
    </div>
  );
}

function SmartCard({ icon, titulo, subtitulo, temAlvo, tooltip, children }: { icon: string; titulo: string; subtitulo: string; temAlvo: boolean; tooltip?: string; children: React.ReactNode }) {
  return (
    <div title={tooltip} style={{
      background: "var(--ed-input)",
      borderRadius: 8,
      padding: "8px 10px",
      marginBottom: 4,
      border: "1px solid var(--ed-bdr)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: temAlvo ? 8 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 14 }}>{icon}</span>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ed-txt)" }}>{titulo}</div>
            <div style={{ fontSize: 9, color: "var(--ed-txt3)" }}>{subtitulo}</div>
          </div>
        </div>
        {temAlvo && <span style={{ fontSize: 8, background: "var(--ed-accent)", color: "#000", padding: "2px 6px", borderRadius: 10, fontWeight: 700 }}>ON</span>}
      </div>
      {children}
    </div>
  );
}
