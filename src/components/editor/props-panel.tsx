import React, { useState, useEffect, useRef } from "react";
import { HslaColorPicker } from "react-colorful";
import { EditorElement, FONTS, BLEND_MODES, BlendMode, TextCase, getBindGroups, resolveFontSpec, getImageBindFields, GradientFill, GradientDirection, EnterAnimType, ExitAnimType } from "./types";
import { uploadToCloudinary } from "@/lib/cloudinary";

interface Props {
  selected: EditorElement | null;
  canvasW: number; canvasH: number;
  allElements: EditorElement[];
  onUpdate: (id: string, u: Partial<EditorElement>) => void;
  onAlign: (a: string | string[]) => void;
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
        background: "rgba(0,0,0,0.05)",
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
            color: (() => {
              const f = typeof s.fill === "string" ? s.fill : "#D4A843";
              return f || "#D4A843";
            })(),
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
        {/* Para SVG icon */}
        {s.type === "svg" && s.svgPaths && (
          <div style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}
            dangerouslySetInnerHTML={{ __html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" ${s.svgStyle === "fill" ? `fill="${typeof s.fill === "string" ? s.fill : "#FFF"}"` : `fill="none" stroke="${typeof s.fill === "string" ? s.fill : "#FFF"}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`}>${s.svgPaths}</svg>` }}
          />
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
function DesignTab({ s, u, allElements, onAlign, onOpenCrop, formType, isAdm }: { s: EditorElement; u: (up: Partial<EditorElement>) => void; allElements: EditorElement[]; onAlign: (a: string | string[]) => void; onOpenCrop?: () => void; formType?: string; isAdm?: boolean }) {
  const [bindUploading, setBindUploading] = useState(false);
  const bindFileRef = useRef<HTMLInputElement>(null);

  async function handleBindImageUpload(file: File) {
    setBindUploading(true);
    try {
      const url = await uploadToCloudinary(file, "aurohubv2/badges");
      u({ src: url });
    } catch (err) {
      console.error("[imageBind upload]", err);
      alert("Falha ao enviar imagem.");
    } finally {
      setBindUploading(false);
    }
  }

  return (
    <>
      {/* ═══ 1. CAMPO BIND ═══ (apenas ADM) */}
      {isAdm && (
        <Sec t="Campo Bind">
          {s.bindParam && <div style={{ borderRadius: 6, background: "rgba(212,168,67,0.1)", padding: "4px 8px", fontSize: 9, fontWeight: 700, color: "var(--ed-bind)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>⬡ {s.bindParam}</div>}
          <select value={s.bindParam || ""} onChange={e => {
            const bp = e.target.value;
            const up: Partial<EditorElement> = {
              bindParam: bp || undefined,
              hideIfEmpty: bp ? true : undefined,
            };
            if (s.type === "text" && bp) { up.text = `[${bp}]`; up.fill = "#D4A843"; up.name = `[${bp}]`; }
            u(up);
          }} style={selS}>
            <option value="">Nenhum</option>
            {getBindGroups(formType).map(g => <optgroup key={g.group} label={g.group}>{g.fields.map(f => <option key={f} value={f}>{f}</option>)}</optgroup>)}
          </select>
          {(() => {
            const b = (s as any).bindField || s.bindParam || "";
            return (b === "destino" || b === "hotel" || b === "navio") && (
              <SBtn
                active={s.autoFetchImage !== false}
                onClick={() => u({ autoFetchImage: s.autoFetchImage === false ? undefined : false })}
                title="Se desativado, não busca imagem automaticamente pelo valor deste campo"
              >
                {s.autoFetchImage !== false ? "↺ Buscar imagem auto" : "✗ Imagem fixa"}
              </SBtn>
            );
          })()}
        </Sec>
      )}

      {/* ═══ 2. LAYOUT ═══ */}
      <Sec t="Layout">
        {/* Alinhar ao Canvas */}
        <div style={{ fontSize: 10, color: "var(--ed-txt2)", marginBottom: 4, fontWeight: 600 }}>Alinhar ao Canvas</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 4 }}>
          {[
            { k: ["top", "left"],           t: "Topo + esquerda",      d: "M14 14L4 4M4 9V4h5" },
            { k: ["top", "center-h"],       t: "Topo + centralizado",  d: "M9 15V3M5 7l4-4 4 4" },
            { k: ["top", "right"],          t: "Topo + direita",       d: "M4 14L14 4M9 4h5v5" },
            { k: ["center-v", "left"],      t: "Meio + esquerda",      d: "M15 9H3M7 5l-4 4 4 4" },
            { k: ["center-v", "center-h"],  t: "Centralizar tudo",     d: "M3 9h12M9 3v12" },
            { k: ["center-v", "right"],     t: "Meio + direita",       d: "M3 9h12M11 5l4 4-4 4" },
            { k: ["bottom", "left"],        t: "Base + esquerda",      d: "M14 4L4 14M9 14H4v-5" },
            { k: ["bottom", "center-h"],    t: "Base + centralizado",  d: "M9 3v12M5 11l4 4 4-4" },
            { k: ["bottom", "right"],       t: "Base + direita",       d: "M4 4L14 14M14 9v5h-5" },
          ].map(a => (
            <AlignBtn key={a.k.join("-")} onClick={() => onAlign(a.k)} title={a.t} d={a.d} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
          <SBtn active={!!s.locked} onClick={() => u({ locked: !s.locked })} title="Travar posição — impede mover acidentalmente">{s.locked ? "🔒 Travado" : "🔓 Travar"}</SBtn>
        </div>
        <F l="Ocultar quando bind:">
          <input
            type="text"
            value={s.hideWhenBind || ""}
            onChange={e => u({ hideWhenBind: e.target.value || undefined })}
            placeholder="ex: imgfundo"
            style={{ ...inpS, textAlign: "left" }}
          />
        </F>
        <F l="Cursor">
          <select value={s.cursor || "default"} onChange={e => u({ cursor: e.target.value as EditorElement["cursor"] })} style={selS}>
            <option value="default">Padrão</option>
            <option value="pointer">Pointer (mãozinha)</option>
            <option value="text">Texto</option>
            <option value="move">Mover</option>
            <option value="not-allowed">Não permitido</option>
          </select>
        </F>
        <F l="Link URL">
          <input
            type="text"
            value={s.linkUrl || ""}
            onChange={e => u({ linkUrl: e.target.value || undefined })}
            placeholder="https://..."
            style={{ ...inpS, textAlign: "left" }}
          />
        </F>

        {/* Posição & Tamanho */}
        <div style={{ fontSize: 10, color: "var(--ed-txt2)", marginTop: 8, marginBottom: 4, fontWeight: 600 }}>Posição & Tamanho</div>
        <G2><F l="X"><Num v={Math.round(s.x)} c={v => u({ x: v })} /></F><F l="Y"><Num v={Math.round(s.y)} c={v => u({ y: v })} /></F></G2>
        <div style={{ display: "flex", gap: 4, alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <F l="W"><Num v={Math.round(s.width)} c={v => {
              if (s.lockAspectRatio && s.width > 0 && s.height > 0)
                u({ width: v, height: Math.max(1, Math.round(v * s.height / s.width)) });
              else u({ width: v });
            }} /></F>
          </div>
          <button
            onClick={() => u({ lockAspectRatio: !s.lockAspectRatio })}
            title={s.lockAspectRatio ? "Proporção travada — clique para liberar" : "Travar proporção"}
            style={{ flexShrink: 0, width: 20, height: 22, marginBottom: 2, border: "1px solid var(--ed-bdr)", borderRadius: 4, background: s.lockAspectRatio ? "var(--ed-active)" : "var(--ed-input)", color: s.lockAspectRatio ? "var(--ed-active-txt)" : "var(--ed-txt3)", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
          >{s.lockAspectRatio ? "🔒" : "🔓"}</button>
          <div style={{ flex: 1 }}>
            <F l="H"><Num v={Math.round(s.height)} c={v => {
              if (s.lockAspectRatio && s.width > 0 && s.height > 0)
                u({ height: v, width: Math.max(1, Math.round(v * s.width / s.height)) });
              else u({ height: v });
            }} /></F>
          </div>
        </div>
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

      {/* ═══ REPETIR EM GRADE ═══ */}
      <Sec t="Repetir em Grade">
        <div style={{ display: "flex", gap: 3 }}>
          <SBtn active={!!s.repeatGrid} onClick={() => u({ repeatGrid: !s.repeatGrid })} title="Repetir elemento em grade">
            {s.repeatGrid ? "Grade ON" : "Grade OFF"}
          </SBtn>
        </div>
        {s.repeatGrid && (
          <>
            <G2>
              <F l="Colunas"><Num v={s.repeatCols ?? 2} c={v => u({ repeatCols: Math.max(1, v) })} min={1} max={20} /></F>
              <F l="Linhas"><Num v={s.repeatRows ?? 2} c={v => u({ repeatRows: Math.max(1, v) })} min={1} max={20} /></F>
            </G2>
            <G2>
              <F l="Gap H"><Num v={s.repeatGapX ?? 8} c={v => u({ repeatGapX: v })} min={0} /></F>
              <F l="Gap V"><Num v={s.repeatGapY ?? 8} c={v => u({ repeatGapY: v })} min={0} /></F>
            </G2>
          </>
        )}
      </Sec>

      {/* ═══ 3. TIPOGRAFIA ═══ */}
      {s.type === "text" && (
        <Sec t="Tipografia">
          <TextStylesPanel el={s} isAdm={isAdm} onApply={u} />
          {/* 1. Conteúdo */}
          <F l="Conteúdo"><textarea value={s.text || ""} onChange={e => u({ text: e.target.value })} rows={3} style={{ ...inpS, height: "auto", resize: "vertical", padding: "6px 8px" }} /></F>

          {/* 2. Fonte + Tamanho + Peso */}
          <F l="Fonte"><select value={s.fontFamily && s.fontStyle && s.fontStyle.match(/^\d+$/) ? `Helvetica Neue ${({"100":"Thin","300":"Light","400":"","500":"Medium","700":"Bold","800":"Heavy","900":"Black"} as Record<string,string>)[s.fontStyle] || ""}`.trim() || s.fontFamily : (s.fontFamily || "Helvetica Neue")} onChange={e => {
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
              <WeightSelect
                value={s.fontStyle?.match(/^\d+$/) ? s.fontStyle : s.fontStyle === "bold" ? "700" : "400"}
                onChange={v => u({ fontStyle: v })}
              />
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
                {tc === "none" ? "Aa" : tc === "uppercase" ? "AA" : tc === "lowercase" ? "aa" : "Aa_"}
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
          <G2>
            <F l="Fundo do texto">
              <AdvancedColorPicker value={s.textBg || "#000000"} onChange={v => u({ textBg: v || undefined })} />
            </F>
            <F l="Opac. fundo"><Num v={s.textBgOpacity ?? 100} min={0} max={100} c={v => u({ textBgOpacity: v })} /></F>
          </G2>

          {/* 6. Espaçamento */}
          <G2>
            <F l="Espaç. letras"><Num v={s.letterSpacing ?? 0} c={v => u({ letterSpacing: v })} step={0.5} /></F>
            <F l="Altura da linha"><Num v={s.lineHeight ?? 1.2} c={v => u({ lineHeight: v })} step={0.1} /></F>
          </G2>
          <F l="Linhas máx">
            <Num v={s.linhas || 0} min={0} max={20} c={v => u({ linhas: v || undefined })} />
          </F>
          <G2>
            <F l="Padding H"><Num v={s.paddingH ?? 0} min={0} c={v => u({ paddingH: v })} /></F>
            <F l="Padding V"><Num v={s.paddingV ?? 0} min={0} c={v => u({ paddingV: v })} /></F>
          </G2>

          {/* 7. Stroke */}
          <SubSec t="Stroke" right={
            <SBtn active={s.strokeEnabled ?? false} onClick={() => u({ strokeEnabled: !s.strokeEnabled })}>
              {s.strokeEnabled ? "ON" : "OFF"}
            </SBtn>
          } />
          {s.strokeEnabled && (
            <>
              <G2>
                <F l="Cor"><AdvancedColorPicker value={s.stroke || "#000000"} onChange={v => u({ stroke: v })} /></F>
                <F l="Opacidade"><Num v={Math.round((s.strokeOpacity ?? 1) * 100)} min={0} max={100} step={1} c={v => u({ strokeOpacity: v / 100 })} /></F>
              </G2>
              <G2>
                <F l="Espessura"><Num v={s.strokeWidth ?? 1} min={0} step={0.5} c={v => u({ strokeWidth: v })} /></F>
                <F l="Tipo">
                  <select value={s.strokePosition || "center"} onChange={e => u({ strokePosition: e.target.value as EditorElement["strokePosition"] })} style={selS}>
                    <option value="center">Centralizado</option>
                    <option value="outside">Externo</option>
                    <option value="inside">Interno</option>
                  </select>
                </F>
              </G2>
            </>
          )}

          {/* 8. Comportamento */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <label
              title="Divide o valor em inteiro (grande) e centavos (pequeno) no canvas. Ex: R$ 1.234 ,56"
              style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: "var(--ed-txt2)", cursor: "pointer" }}
            >
              <input type="checkbox" checked={!!s.priceDisplay} onChange={e => u({ priceDisplay: e.target.checked })} />
              Split R$
            </label>
            <label
              title="O texto recorta a imagem do elemento abaixo — letras preenchidas com a imagem (efeito máscara)"
              style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, color: s.textMask ? "var(--ed-bind)" : "var(--ed-txt2)", cursor: "pointer", fontWeight: s.textMask ? 700 : 400 }}
            >
              <input type="checkbox" checked={!!s.textMask} onChange={e => u({ textMask: e.target.checked || undefined })} />
              Máscara
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
            <SubSec t={s.type === "svg" ? "Cor do Ícone" : "Preenchimento"} />
            {s.type === "svg"
              ? <F l="Cor"><AdvancedColorPicker value={typeof s.fill === "string" ? s.fill : "#FFFFFF"} onChange={v => u({ fill: v })} /></F>
              : <FillEditor value={s.fill || "#FFFFFF"} onChange={v => u({ fill: v })} />
            }
          </>
        )}

        {/* Linha — line-specific section */}
        {isLine(s) && (
          <>
            <SubSec t="Linha" />
            <F l="Cor"><AdvancedColorPicker value={typeof s.fill === "string" ? s.fill : "#FFFFFF"} onChange={v => u({ fill: v })} /></F>
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
                  <F l="Cor"><AdvancedColorPicker value={s.stroke || "#000"} onChange={v => u({ stroke: v })} /></F>
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
          <SBtn active={s.shadowEnabled ?? false}
            onClick={() => u({ shadowEnabled: !s.shadowEnabled })}>
            {s.shadowEnabled ? "ON" : "OFF"}
          </SBtn>
        } />
        {s.shadowEnabled && (
          <>
            <G2>
              <F l="Cor"><AdvancedColorPicker value={s.shadowColor || "#000000"} onChange={v => u({ shadowColor: v })} /></F>
              <F l="Opacidade"><Num v={Math.round((s.shadowOpacity ?? 0.3) * 100)} min={0} max={100} step={1} c={v => u({ shadowOpacity: v / 100 })} /></F>
            </G2>
            <G2>
              <F l="Off X"><Num v={s.shadowOffsetX ?? 0} c={v => u({ shadowOffsetX: v })} /></F>
              <F l="Off Y"><Num v={s.shadowOffsetY ?? 4} c={v => u({ shadowOffsetY: v })} /></F>
            </G2>
            <F l="Blur"><Num v={s.shadowBlur ?? 8} min={0} c={v => u({ shadowBlur: v })} /></F>
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
              <option value="triangle">Triângulo</option>
              <option value="hexagon">Hexágono</option>
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
          <F l="Imagem fixa">
            <div style={{ fontSize: 9, color: "var(--ed-txt3)", marginBottom: 4, lineHeight: 1.4 }}>
              Imagem exibida no preview. O bind controla só a visibilidade (show/hide).
            </div>
            {s.src && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <img src={s.src} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4, border: "1px solid var(--ed-bdr)", flexShrink: 0 }} />
                <button
                  onClick={() => u({ src: undefined })}
                  style={{ fontSize: 10, color: "var(--ed-txt3)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  Remover
                </button>
              </div>
            )}
            <input
              ref={bindFileRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleBindImageUpload(file);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => bindFileRef.current?.click()}
              disabled={bindUploading}
              style={{ width: "100%", height: 32, borderRadius: 6, border: "1px solid var(--ed-bdr)", background: "var(--ed-input)", color: bindUploading ? "var(--ed-txt3)" : "var(--ed-txt)", fontSize: 11, fontWeight: 600, cursor: bindUploading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              {bindUploading ? "⏳ Enviando..." : s.src ? "⟳ Trocar imagem" : "⟳ Fixar imagem"}
            </button>
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
              <option value="triangle">Triângulo</option>
              <option value="hexagon">Hexágono</option>
            </select>
          </F>
        </Sec>
      )}

      {/* QR Code */}
      {s.type === "qrcode" && (
        <Sec t="QR Code">
          <F l="URL / Texto"><Inp v={s.qrUrl || ""} c={v => u({ qrUrl: v })} /></F>
          <F l="Cor frente"><AdvancedColorPicker value={s.qrFg || "#000000"} onChange={v => u({ qrFg: v })} /></F>
          <F l="Cor fundo"><AdvancedColorPicker value={s.qrBg || "#FFFFFF"} onChange={v => u({ qrBg: v })} /></F>
        </Sec>
      )}

      {/* ═══ 6. EFEITOS ═══ */}
      <Sec t="Efeitos">
        <F l="Blend Mode">
          <select value={s.blendMode || "source-over"} onChange={e => u({ blendMode: e.target.value as BlendMode })} style={selS}>
            <option value="source-over">Normal</option>
            <option value="multiply">Multiply</option>
            <option value="screen">Screen</option>
            <option value="overlay">Overlay</option>
            <option value="darken">Darken</option>
            <option value="lighten">Lighten</option>
            <option value="color-dodge">Color Dodge</option>
            <option value="color-burn">Color Burn</option>
            <option value="hard-light">Hard Light</option>
            <option value="soft-light">Soft Light</option>
            <option value="difference">Difference</option>
            <option value="exclusion">Exclusion</option>
          </select>
        </F>
        <G2><F l="Skew X"><Num v={s.skewX ?? 0} min={-45} max={45} step={1} c={v => u({ skewX: v })} /></F><F l="Skew Y"><Num v={s.skewY ?? 0} min={-45} max={45} step={1} c={v => u({ skewY: v })} /></F></G2>
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
          <G2>
            <F l="Direção">
              <select
                value={s.smartTrack?.direction || "right"}
                onChange={e => { if (s.smartTrack) u({ smartTrack: { ...s.smartTrack, direction: e.target.value as "right"|"left"|"down"|"up" } }); }}
                style={{ ...selS, opacity: s.smartTrack ? 1 : 0.5 }}
                disabled={!s.smartTrack}
              >
                <option value="right">→ Direita</option>
                <option value="left">← Esquerda</option>
                <option value="down">↓ Abaixo</option>
                <option value="up">↑ Acima</option>
              </select>
            </F>
            <F l="Gap">
              <Num
                v={s.smartTrack?.gap ?? 8}
                c={v => { if (s.smartTrack) u({ smartTrack: { ...s.smartTrack, gap: v } }); }}
              />
            </F>
          </G2>
          <G2>
            <F l="X Offset"><Num v={s.smartTrackOffsetX ?? 0} c={v => u({ smartTrackOffsetX: v })} /></F>
            <F l="Y Offset"><Num v={s.smartTrackOffsetY ?? 0} c={v => u({ smartTrackOffsetY: v })} /></F>
          </G2>
          {!s.smartTrack && (
            <div style={{ fontSize: 8, color: "var(--ed-txt3)", marginTop: 2, fontStyle: "italic" }}>
              Selecione um alvo para ativar
            </div>
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
      {/* ── Timeline ── */}
      <Sec t="Timeline">
        <G2>
          <F l="Show At (s)">
            <Num v={s.showAt ?? 0} c={v => u({ showAt: v > 0 ? v : undefined })} step={0.1} min={0} />
          </F>
          <F l="Hide At (s)">
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <SBtn active={s.hideAt === undefined} onClick={() => u({ hideAt: s.hideAt !== undefined ? undefined : 3 })} title="End: elemento nunca some">
                {s.hideAt === undefined ? "End ✓" : "End"}
              </SBtn>
              {s.hideAt !== undefined && (
                <Num v={s.hideAt} c={v => u({ hideAt: Math.max(0.1, v) })} step={0.1} min={0.1} />
              )}
            </div>
          </F>
        </G2>
      </Sec>

      {/* ── Enter Animation ── */}
      <Sec t="Enter Anim">
        <select value={s.enterAnim || "none"} onChange={e => u({ enterAnim: e.target.value as EnterAnimType })} style={selS}>
          {[["none","None"],["fadeIn","Fade In"],["slideInLeft","Slide In Left"],["slideInRight","Slide In Right"],["slideInUp","Slide In Up"],["slideInDown","Slide In Down"],["scaleIn","Scale In"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </Sec>

      {/* ── Exit Animation ── */}
      <Sec t="Exit Anim">
        <select value={s.exitAnim || "none"} onChange={e => u({ exitAnim: e.target.value as ExitAnimType })} style={selS}>
          {[["none","None"],["fadeOut","Fade Out"],["slideOutLeft","Slide Out Left"],["slideOutRight","Slide Out Right"],["slideOutUp","Slide Out Up"],["slideOutDown","Slide Out Down"],["scaleOut","Scale Out"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </Sec>

      <Sec t="Enter Animation (legado)">
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
        <AdvancedColorPicker value={solidColor} onChange={c => onChange(c)} />
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

// Color utilities
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "").padEnd(6, "0");
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}
function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r,g,b].map(v => Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,"0")).join("");
}
function rgbToHsl(r: number, g: number, b: number): [number,number,number] {
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b), l=(max+min)/2;
  if (max===min) return [0, 0, Math.round(l*100)];
  const d=max-min, s=l>0.5?d/(2-max-min):d/(max+min);
  let h=0;
  if (max===r) h=((g-b)/d+(g<b?6:0))/6;
  else if (max===g) h=((b-r)/d+2)/6;
  else h=((r-g)/d+4)/6;
  return [Math.round(h*360), Math.round(s*100), Math.round(l*100)];
}
function hslToRgb(h: number, s: number, l: number): [number,number,number] {
  h/=360; s/=100; l/=100;
  if (s===0) { const v=Math.round(l*255); return [v,v,v]; }
  const q=l<0.5?l*(1+s):l+s-l*s, p=2*l-q;
  const hf=(p:number,q:number,t:number)=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<0.5)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;};
  return [Math.round(hf(p,q,h+1/3)*255), Math.round(hf(p,q,h)*255), Math.round(hf(p,q,h-1/3)*255)];
}
type AcpHsla = { h: number; s: number; l: number; a: number };
function parseToHsla(v: string): AcpHsla {
  if (!v || v==="transparent") return {h:0, s:0, l:100, a:0};
  const hex=v.replace("#","");
  if (/^[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(hex)) {
    const [r,g,b]=hexToRgb(v);
    const a=hex.length===8?parseInt(hex.slice(6,8),16)/255:1;
    const [h,s,l]=rgbToHsl(r,g,b);
    return {h, s, l, a};
  }
  if (v.startsWith("rgb")) {
    const m=v.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (m) { const [h,s,l]=rgbToHsl(+m[1],+m[2],+m[3]); return {h,s,l,a:m[4]!==undefined?+m[4]:1}; }
  }
  return {h:0, s:0, l:100, a:1};
}
function hslaToStr({h,s,l,a}: AcpHsla): string {
  const [r,g,b]=hslToRgb(h,s,l);
  const hex=rgbToHex(r,g,b);
  return a<0.999 ? hex+Math.round(a*255).toString(16).padStart(2,"0") : hex;
}
const ACP_KEY = "ah_recent_colors";
function getRecentColors(): string[] { try { return JSON.parse(localStorage.getItem(ACP_KEY)||"[]"); } catch { return []; } }
function saveRecentColor(c: string): string[] {
  const u=[c,...getRecentColors().filter(x=>x!==c)].slice(0,8);
  try { localStorage.setItem(ACP_KEY, JSON.stringify(u)); } catch {}
  return u;
}

function AdvancedColorPicker({ value, onChange, label, showTransparent=true }: {
  value: string; onChange: (v: string) => void; label?: string; showTransparent?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [hsla, setHsla] = useState<AcpHsla>(() => parseToHsla(value));
  const [hexIn, setHexIn] = useState(() => { const s=hslaToStr(parseToHsla(value)); return s.startsWith("#")?s.slice(1,7):"ffffff"; });
  const [recent, setRecent] = useState<string[]>([]);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const rowRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const lastVal = useRef(value);

  useEffect(() => {
    if (value !== lastVal.current) {
      lastVal.current = value;
      const p = parseToHsla(value);
      setHsla(p);
      if (value !== "transparent") setHexIn(hslaToStr(p).slice(1,7));
    }
  }, [value]);

  useEffect(() => { if (open) setRecent(getRecentColors()); }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (!rowRef.current?.contains(e.target as Node) && !popRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const openPicker = () => {
    if (rowRef.current) {
      const r = rowRef.current.getBoundingClientRect();
      setPos({ top: r.bottom+4, left: Math.max(8, Math.min(r.left, window.innerWidth-220)) });
    }
    setOpen(o => !o);
  };

  const emit = (nh: AcpHsla) => { const s=hslaToStr(nh); lastVal.current=s; onChange(s); };

  const handlePicker = (nh: AcpHsla) => { setHsla(nh); setHexIn(hslaToStr(nh).slice(1,7)); emit(nh); };

  const handleHexInput = (raw: string) => {
    const c = raw.replace(/[^0-9A-Fa-f]/g,"");
    setHexIn(c);
    if (c.length===6) { const p=parseToHsla("#"+c); setHsla(p); lastVal.current="#"+c; onChange("#"+c); }
  };

  const handleRgb = (ch: "r"|"g"|"b", val: number) => {
    const [r,g,b] = hslToRgb(hsla.h, hsla.s, hsla.l);
    const nr=ch==="r"?val:r, ng=ch==="g"?val:g, nb=ch==="b"?val:b;
    const [nh,ns,nl] = rgbToHsl(nr,ng,nb);
    const nh2 = {h:nh, s:ns, l:nl, a:hsla.a};
    setHsla(nh2); setHexIn(rgbToHex(nr,ng,nb).slice(1)); emit(nh2);
  };

  const closeAndSave = (color?: string) => {
    const final = color ?? hslaToStr(hsla);
    setRecent(saveRecentColor(final));
    if (color) onChange(color);
    setOpen(false);
  };

  const [cr,cg,cb] = hslToRgb(hsla.h, hsla.s, hsla.l);
  const swBg = value==="transparent" ? "repeating-conic-gradient(var(--ed-bdr) 0% 25%, transparent 0% 50%) 0 0/10px 10px" : value;
  const piS: React.CSSProperties = { ...inpS, height: 24, fontSize: 10, padding: "0 4px", textAlign: "center" };

  return (
    <div style={{ position: "relative" }}>
      {label && <div style={{ fontSize: 10, color: "var(--ed-txt2)", marginBottom: 2 }}>{label}</div>}
      <div ref={rowRef} style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <div onClick={openPicker} style={{ width: 28, height: 28, borderRadius: 6, background: swBg, border: "1px solid var(--ed-bdr)", cursor: "pointer", flexShrink: 0 }} />
        <input type="text"
          value={value==="transparent" ? "transparent" : "#"+hexIn}
          onChange={e => handleHexInput(e.target.value.replace(/^#/,""))}
          onClick={e => e.stopPropagation()}
          style={{ ...inpS, flex: 1 }} />
        <DropperBtn onChange={v => { onChange(v); setRecent(saveRecentColor(v)); }} />
      </div>
      {open && (
        <div ref={popRef} style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999, background: "var(--ed-surface)", border: "1px solid var(--ed-bdr)", borderRadius: 10, boxShadow: "0 8px 30px rgba(0,0,0,0.5)", padding: 10, width: 212 }}>
          <HslaColorPicker color={hsla} onChange={handlePicker} style={{ width: "100%" }} />
          <div style={{ display: "flex", gap: 3, marginTop: 8 }}>
            <div style={{ flex: 2 }}>
              <div style={{ fontSize: 8, color: "var(--ed-txt3)", marginBottom: 2, textAlign: "center" }}>HEX</div>
              <input value={"#"+hexIn} onChange={e => handleHexInput(e.target.value.replace(/^#/,""))} style={piS} />
            </div>
            {(["r","g","b"] as const).map(ch => (
              <div key={ch} style={{ flex: 1 }}>
                <div style={{ fontSize: 8, color: "var(--ed-txt3)", marginBottom: 2, textAlign: "center" }}>{ch.toUpperCase()}</div>
                <input type="number" min={0} max={255}
                  value={ch==="r"?cr:ch==="g"?cg:cb}
                  onChange={e => handleRgb(ch, Math.max(0,Math.min(255,+e.target.value)))}
                  style={piS} />
              </div>
            ))}
          </div>
          {showTransparent && (
            <button onClick={() => closeAndSave("transparent")}
              style={{ width: "100%", marginTop: 6, height: 24, borderRadius: 4, border: "1px solid var(--ed-bdr)", background: "repeating-conic-gradient(var(--ed-bdr) 0% 25%, transparent 0% 50%) 0 0/10px 10px", color: "var(--ed-txt2)", fontSize: 9, fontWeight: 600, cursor: "pointer" }}>
              Transparente
            </button>
          )}
          {recent.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 8, color: "var(--ed-txt3)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>Recentes</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                {recent.map((c, i) => (
                  <div key={i} onClick={() => { onChange(c); setOpen(false); }} title={c}
                    style={{ width: 22, height: 22, borderRadius: 4, background: c==="transparent" ? "repeating-conic-gradient(var(--ed-bdr) 0% 25%, transparent 0% 50%) 0 0/8px 8px" : c, border: "1px solid var(--ed-bdr)", cursor: "pointer" }} />
                ))}
              </div>
            </div>
          )}
          <button onClick={() => closeAndSave()}
            style={{ width: "100%", marginTop: 8, height: 26, borderRadius: 6, border: "none", background: "var(--ed-accent)", color: "#000", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
            OK
          </button>
        </div>
      )}
    </div>
  );
}

/* ══ TEXT STYLES PANEL ════════════════════════════ */
interface TextStyleDef {
  id: string; name: string;
  fontFamily: string; fontStyle: string; fontSize: number;
  fill: string; letterSpacing: number; lineHeight: number;
  custom?: boolean;
}

const PRESET_STYLES: TextStyleDef[] = [
  { id: "titulo-grande", name: "Título Grande",  fontFamily: "Helvetica Neue", fontStyle: "700", fontSize: 72, fill: "#FFFFFF", letterSpacing: -1,   lineHeight: 1.0 },
  { id: "titulo-medio",  name: "Título Médio",   fontFamily: "Helvetica Neue", fontStyle: "700", fontSize: 48, fill: "#FFFFFF", letterSpacing: -0.5,  lineHeight: 1.1 },
  { id: "subtitulo",     name: "Subtítulo",      fontFamily: "Helvetica Neue", fontStyle: "500", fontSize: 32, fill: "#FFFFFF", letterSpacing: 0,     lineHeight: 1.2 },
  { id: "corpo",         name: "Corpo",          fontFamily: "Helvetica Neue", fontStyle: "400", fontSize: 24, fill: "#FFFFFF", letterSpacing: 0,     lineHeight: 1.4 },
  { id: "destaque",      name: "Destaque",       fontFamily: "Helvetica Neue", fontStyle: "800", fontSize: 56, fill: "#D4A843", letterSpacing: 1,     lineHeight: 1.0 },
  { id: "preco",         name: "Preço",          fontFamily: "Helvetica Neue", fontStyle: "700", fontSize: 64, fill: "#D4A843", letterSpacing: -1,    lineHeight: 1.0 },
  { id: "label",         name: "Label Pequeno",  fontFamily: "Helvetica Neue", fontStyle: "400", fontSize: 16, fill: "#FFFFFF", letterSpacing: 2,     lineHeight: 1.3 },
];

const TS_KEY = "ah_text_styles";
function loadCustomStyles(): TextStyleDef[] {
  try { return JSON.parse(localStorage.getItem(TS_KEY) || "[]"); } catch { return []; }
}
function saveCustomStyles(list: TextStyleDef[]) {
  localStorage.setItem(TS_KEY, JSON.stringify(list));
}

function TextStylesPanel({ el, isAdm, onApply }: {
  el: EditorElement; isAdm?: boolean;
  onApply: (style: Partial<EditorElement>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState<TextStyleDef[]>([]);

  useEffect(() => { if (open) setCustom(loadCustomStyles()); }, [open]);

  const apply = (st: TextStyleDef) => {
    onApply({ fontFamily: st.fontFamily, fontStyle: st.fontStyle, fontSize: st.fontSize, fill: st.fill, letterSpacing: st.letterSpacing, lineHeight: st.lineHeight });
    setOpen(false);
  };

  const saveAsStyle = () => {
    const name = prompt("Nome do estilo:", el.name || "Meu Estilo");
    if (!name) return;
    const ns: TextStyleDef = {
      id: `custom_${Date.now()}`, name, custom: true,
      fontFamily: el.fontFamily || "Helvetica Neue",
      fontStyle: el.fontStyle || "400",
      fontSize: el.fontSize || 32,
      fill: typeof el.fill === "string" ? el.fill : "#FFFFFF",
      letterSpacing: el.letterSpacing || 0,
      lineHeight: el.lineHeight || 1.2,
    };
    const updated = [...loadCustomStyles(), ns];
    saveCustomStyles(updated);
    setCustom(updated);
  };

  const deleteCustom = (id: string) => {
    const updated = custom.filter(c => c.id !== id);
    saveCustomStyles(updated);
    setCustom(updated);
  };

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", height: 26, borderRadius: 6, border: "1px solid var(--ed-bdr)", background: open ? "var(--ed-accent)" : "var(--ed-input)", color: open ? "#000" : "var(--ed-txt2)", fontSize: 10, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginBottom: 2 }}
      >
        <span>✦</span> Estilos de texto
      </button>

      {open && (
        <div style={{ position: "fixed", right: 232, top: 44, bottom: 0, width: 200, background: "var(--ed-surface)", borderLeft: "1px solid var(--ed-bdr)", display: "flex", flexDirection: "column", zIndex: 1000, boxShadow: "-6px 0 24px rgba(0,0,0,0.4)" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", padding: "10px 12px", borderBottom: "1px solid var(--ed-bdr)", flexShrink: 0 }}>
            <span style={{ flex: 1, fontSize: 11, fontWeight: 800, color: "var(--ed-txt)", letterSpacing: 0.5 }}>Estilos de texto</span>
            <button onClick={() => setOpen(false)} style={{ width: 22, height: 22, borderRadius: 5, border: "none", background: "var(--ed-hover)", color: "var(--ed-txt2)", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px 4px" }}>
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "var(--ed-txt3)", marginBottom: 6 }}>Pré-definidos</div>
            {PRESET_STYLES.map(st => (
              <StyleCard key={st.id} st={st} onApply={() => apply(st)} />
            ))}

            {custom.length > 0 && (
              <>
                <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase" as const, color: "var(--ed-txt3)", margin: "12px 0 6px" }}>Personalizados</div>
                {custom.map(st => (
                  <StyleCard key={st.id} st={st} onApply={() => apply(st)} onDelete={() => deleteCustom(st.id)} />
                ))}
              </>
            )}
          </div>

          {/* Save button (ADM) */}
          {isAdm && (
            <div style={{ padding: 8, borderTop: "1px solid var(--ed-bdr)", flexShrink: 0 }}>
              <button onClick={saveAsStyle} style={{ width: "100%", height: 28, borderRadius: 6, border: "none", background: "#FF7A1A", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                + Salvar como estilo
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function StyleCard({ st, onApply, onDelete }: { st: TextStyleDef; onApply: () => void; onDelete?: () => void }) {
  const [hover, setHover] = useState(false);
  const previewSize = Math.min(20, Math.max(10, st.fontSize / 5));
  return (
    <div
      onClick={onApply}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ position: "relative", padding: "7px 8px", borderRadius: 6, border: "1px solid var(--ed-bdr)", cursor: "pointer", background: hover ? "var(--ed-active)" : "var(--ed-hover)", marginBottom: 4, transition: "background 0.12s" }}
    >
      <div style={{ fontSize: 8, color: "var(--ed-txt3)", marginBottom: 3 }}>{st.name}</div>
      <div style={{ fontFamily: st.fontFamily, fontSize: previewSize, fontWeight: parseInt(st.fontStyle) || 400, color: st.fill, letterSpacing: Math.max(-1, Math.min(2, st.letterSpacing * 0.3)), lineHeight: st.lineHeight, overflow: "hidden", whiteSpace: "nowrap" as const, textOverflow: "ellipsis" }}>
        {st.name}
      </div>
      <div style={{ fontSize: 8, color: "var(--ed-txt3)", marginTop: 3 }}>{st.fontSize}px · {st.fontStyle}w</div>
      {onDelete && hover && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{ position: "absolute", top: 4, right: 4, width: 16, height: 16, borderRadius: 4, border: "none", background: "var(--ed-danger)", color: "#fff", fontSize: 9, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >×</button>
      )}
    </div>
  );
}

/* ══ UI ATOMS ═════════════════════════════════════ */
const inpS: React.CSSProperties = { width: "100%", height: 28, borderRadius: 6, border: "1px solid var(--ed-bdr)", background: "var(--ed-input)", padding: "0 8px", fontSize: 11, color: "var(--ed-txt)", outline: "none", boxSizing: "border-box", textAlign: "center", transition: "border-color 0.15s" };
const selS: React.CSSProperties = { ...inpS, cursor: "pointer", textAlign: "left" };

const FONT_WEIGHTS = [
  { value: "100", label: "Thin" },
  { value: "200", label: "UltraLight" },
  { value: "300", label: "Light" },
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Heavy" },
  { value: "900", label: "Black" },
] as const;

function WeightSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const current = FONT_WEIGHTS.find(w => w.value === value) ?? FONT_WEIGHTS[3];
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ ...selS, display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: 6 }}
      >
        <span>{current.label} {current.value}</span>
        <span style={{ fontSize: 8, opacity: 0.5 }}>▾</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 200, marginTop: 2, background: "var(--ed-surface)", border: "1px solid var(--ed-bdr)", borderRadius: 6, boxShadow: "0 6px 20px rgba(0,0,0,0.4)", overflow: "hidden" }}>
          {FONT_WEIGHTS.map(w => (
            <div
              key={w.value}
              onMouseDown={() => { onChange(w.value); setOpen(false); }}
              style={{ padding: "6px 10px", fontSize: 11, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", background: w.value === value ? "var(--ed-accent)" : "transparent", color: w.value === value ? "#000" : "var(--ed-txt)", transition: "background 0.1s" }}
              onMouseEnter={e => { if (w.value !== value) (e.currentTarget as HTMLDivElement).style.background = "var(--ed-hover)"; }}
              onMouseLeave={e => { if (w.value !== value) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
            >
              <span>{w.label}</span>
              <span style={{ fontSize: 9, opacity: 0.6, fontVariantNumeric: "tabular-nums" }}>{w.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
