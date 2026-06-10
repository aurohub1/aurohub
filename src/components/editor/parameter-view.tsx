import { useState } from "react";
import { EditorElement, EditorSchema, BIND_GROUPS } from "./types";
import { Download, RotateCcw, Upload, Trash2, Plus } from "lucide-react";

interface Props {
  schema: EditorSchema;
  onUpdate: (id: string, u: Partial<EditorElement>) => void;
  onExport?: () => void;
  onExportJpg?: () => void;
  onAddCustomBind?: (bind: { key: string; label: string }) => void;
  onRemoveCustomBind?: (key: string) => void;
}

function slugifyBind(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

const IMAGE_BINDS = ["imgfundo", "imgdestino", "imghotel", "imgloja", "imgperfil", "imgbadge1", "imgbadge2", "imgbadge3", "img_fundo", "img_campanha", "img_aviao", "img_anoiteceu", "badge", "allinclusive", "ofertas"];

export default function ParameterView({ schema, onUpdate, onExport, onExportJpg, onAddCustomBind, onRemoveCustomBind }: Props) {
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  // Normaliza backward-compat: aceita string[] (legado) ou { key, label }[]
  const customBinds: { key: string; label: string }[] = (schema.customBinds || []).map((b: any) =>
    typeof b === "string" ? { key: b, label: b } : b
  );
  const bindElements = schema.elements.filter(el => el.bindParam);
  const isImageBind = (bp: string) => IMAGE_BINDS.includes(bp) || bp.startsWith("img");

  function handleAddBind() {
    const slug = slugifyBind(newKey);
    if (!slug || customBinds.some(b => b.key === slug)) return;
    onAddCustomBind?.({ key: slug, label: newLabel.trim() || slug });
    setNewKey("");
    setNewLabel("");
  }

  function resetAll() {
    for (const el of bindElements) {
      if (el.type === "text") onUpdate(el.id, { text: `[${el.bindParam}]` });
      if (el.type === "image") onUpdate(el.id, { src: "" });
    }
  }

  function handleImageUpload(elId: string) {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { if (reader.result) onUpdate(elId, { src: reader.result as string }); };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  return (
    <div style={{ width: 232, background: "var(--ed-surface)", borderLeft: "1px solid var(--ed-bdr)", overflowY: "auto", flexShrink: 0, display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--ed-bdr)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "var(--ed-bind)" }}>Preview</span>
        <div style={{ display: "flex", gap: 3 }}>
          <button onClick={resetAll} title="Resetar campos" style={btnS}><RotateCcw size={12} /></button>
          {onExport && <button onClick={onExport} title="Exportar PNG" style={{ ...btnS, background: "var(--ed-active)", color: "var(--ed-active-txt)" }}><Download size={12} /></button>}
          {onExportJpg && <button onClick={onExportJpg} title="Exportar JPG" style={{ ...btnS, background: "var(--ed-active)", color: "var(--ed-active-txt)" }}><Download size={12} /></button>}
        </div>
      </div>

      {/* Fields */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
        {bindElements.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px 0", fontSize: 10, color: "var(--ed-txt3)" }}>Nenhum campo bind no template</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {BIND_GROUPS.map(g => {
              const groupEls = bindElements.filter(el => g.fields.includes(el.bindParam || ""));
              if (groupEls.length === 0) return null;
              return (
                <div key={g.group} style={{ marginBottom: 4 }}>
                  <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--ed-txt3)", marginBottom: 3 }}>{g.group}</div>
                  {groupEls.map(el => (
                    <div key={el.id} style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 9, color: "var(--ed-bind)", marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
                        ⬡ {el.bindParam}
                        {isImageBind(el.bindParam || "") && <span style={{ fontSize: 7, color: "var(--ed-txt3)" }}>img</span>}
                      </div>

                      {isImageBind(el.bindParam || "") ? (
                        /* Image bind: URL input + upload button */
                        <div style={{ display: "flex", gap: 3 }}>
                          <input
                            type="text"
                            value={el.src || ""}
                            onChange={e => onUpdate(el.id, { src: e.target.value })}
                            placeholder="URL da imagem"
                            style={inputS}
                          />
                          <button onClick={() => handleImageUpload(el.id)} title="Upload local" style={{ ...btnS, flexShrink: 0 }}>
                            <Upload size={11} />
                          </button>
                        </div>
                      ) : (
                        /* Text bind: editable input */
                        <input
                          type="text"
                          value={el.text || ""}
                          onChange={e => onUpdate(el.id, { text: e.target.value })}
                          placeholder={`[${el.bindParam}]`}
                          style={inputS}
                        />
                      )}
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Bind elements not in standard groups */}
            {(() => {
              const allGroupFields = BIND_GROUPS.flatMap(g => g.fields);
              const ungrouped = bindElements.filter(el => !allGroupFields.includes(el.bindParam || ""));
              if (ungrouped.length === 0) return null;
              return (
                <div style={{ marginBottom: 4 }}>
                  <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--ed-txt3)", marginBottom: 3 }}>Outros</div>
                  {ungrouped.map(el => (
                    <div key={el.id} style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 9, color: "var(--ed-bind)", marginBottom: 2 }}>⬡ {el.bindParam}</div>
                      <input type="text" value={el.text || el.src || ""} onChange={e => onUpdate(el.id, el.type === "image" ? { src: e.target.value } : { text: e.target.value })} placeholder={`[${el.bindParam}]`} style={inputS} />
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Binds customizados ── */}
        {(customBinds.length > 0 || onAddCustomBind) && (
          <div style={{ borderTop: "1px solid var(--ed-bdr)", paddingTop: 10, marginTop: 8 }}>
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--ed-txt3)", marginBottom: 6 }}>
              Binds customizados
            </div>

            {/* Lista */}
            {customBinds.map(b => (
              <div key={b.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4, gap: 4 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 9, color: "var(--ed-bind)", fontFamily: "monospace" }}>⬡ {b.key}</span>
                  {b.label !== b.key && (
                    <span style={{ fontSize: 9, color: "var(--ed-txt3)", marginLeft: 4 }}>→ "{b.label}"</span>
                  )}
                </div>
                {onRemoveCustomBind && (
                  <button
                    onClick={() => onRemoveCustomBind(b.key)}
                    title="Excluir bind"
                    style={{ width: 20, height: 20, border: "none", borderRadius: 4, background: "transparent", color: "#EF4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 }}
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            ))}

            {/* Inputs criar */}
            {onAddCustomBind && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
                <input
                  type="text"
                  value={newKey}
                  onChange={e => setNewKey(slugifyBind(e.target.value))}
                  placeholder="nome_do_bind"
                  style={inputS}
                  onKeyDown={e => { if (e.key === "Enter") handleAddBind(); }}
                />
                <div style={{ display: "flex", gap: 4 }}>
                  <input
                    type="text"
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    placeholder="Label para o usuário"
                    style={{ ...inputS, flex: 1 }}
                    onKeyDown={e => { if (e.key === "Enter") handleAddBind(); }}
                  />
                  <button
                    onClick={handleAddBind}
                    disabled={!slugifyBind(newKey) || customBinds.some(b => b.key === slugifyBind(newKey))}
                    title="Criar bind"
                    style={{
                      width: 28, height: 28, border: "none", borderRadius: 6, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: (!slugifyBind(newKey) || customBinds.some(b => b.key === slugifyBind(newKey))) ? "var(--ed-hover)" : "var(--ed-active)",
                      color: (!slugifyBind(newKey) || customBinds.some(b => b.key === slugifyBind(newKey))) ? "var(--ed-txt3)" : "var(--ed-active-txt)",
                      cursor: (!slugifyBind(newKey) || customBinds.some(b => b.key === slugifyBind(newKey))) ? "not-allowed" : "pointer",
                    }}
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {(onExport || onExportJpg) && bindElements.length > 0 && (
        <div style={{ padding: "8px 12px", borderTop: "1px solid var(--ed-bdr)", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {onExport && (
              <button onClick={onExport} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: "none", background: "#FF7A1A", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <Download size={12} /> PNG
              </button>
            )}
            {onExportJpg && (
              <button onClick={onExportJpg} style={{ flex: 1, padding: "8px 0", borderRadius: 6, border: "none", background: "#FF7A1A", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                <Download size={12} /> JPG
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const inputS: React.CSSProperties = { width: "100%", height: 28, borderRadius: 6, border: "1px solid var(--ed-bdr)", background: "var(--ed-input)", padding: "0 8px", fontSize: 10, color: "var(--ed-txt)", outline: "none", boxSizing: "border-box" };
const btnS: React.CSSProperties = { width: 26, height: 26, borderRadius: 6, border: "none", background: "var(--ed-hover)", color: "var(--ed-txt2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
