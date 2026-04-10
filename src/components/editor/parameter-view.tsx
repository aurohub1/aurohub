import { EditorElement, EditorSchema, BIND_GROUPS } from "./types";
import { Download, RotateCcw, Upload } from "lucide-react";

interface Props {
  schema: EditorSchema;
  onUpdate: (id: string, u: Partial<EditorElement>) => void;
  onExport?: () => void;
}

const IMAGE_BINDS = ["imgfundo", "imgdestino", "imghotel", "imgloja", "imgperfil", "imgbadge1", "imgbadge2", "imgbadge3", "img_fundo", "img_campanha", "img_aviao", "img_anoiteceu"];

export default function ParameterView({ schema, onUpdate, onExport }: Props) {
  const bindElements = schema.elements.filter(el => el.bindParam);
  const isImageBind = (bp: string) => IMAGE_BINDS.includes(bp) || bp.startsWith("img");

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
      </div>

      {/* Footer */}
      {onExport && bindElements.length > 0 && (
        <div style={{ padding: "8px 12px", borderTop: "1px solid var(--ed-bdr)", flexShrink: 0 }}>
          <button onClick={onExport} style={{ width: "100%", padding: "8px 0", borderRadius: 6, border: "none", background: "#FF7A1A", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <Download size={12} /> Exportar com estes dados
          </button>
        </div>
      )}
    </div>
  );
}

const inputS: React.CSSProperties = { width: "100%", height: 28, borderRadius: 6, border: "1px solid var(--ed-bdr)", background: "var(--ed-input)", padding: "0 8px", fontSize: 10, color: "var(--ed-txt)", outline: "none", boxSizing: "border-box" };
const btnS: React.CSSProperties = { width: 26, height: 26, borderRadius: 6, border: "none", background: "var(--ed-hover)", color: "var(--ed-txt2)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
