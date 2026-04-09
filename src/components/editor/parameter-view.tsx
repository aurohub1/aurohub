import { EditorElement, EditorSchema, BIND_GROUPS } from "./types";

interface Props {
  schema: EditorSchema;
  onUpdate: (id: string, u: Partial<EditorElement>) => void;
}

export default function ParameterView({ schema, onUpdate }: Props) {
  const bindElements = schema.elements.filter(el => el.bindParam);

  return (
    <div style={{ width: 232, background: "var(--ed-surface)", borderLeft: "1px solid var(--ed-bdr)", overflowY: "auto", flexShrink: 0, padding: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: "var(--ed-bind)", marginBottom: 8 }}>Parameter View</div>
      <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>Preencha os campos para preview ao vivo</div>

      {bindElements.length === 0 ? (
        <div style={{ textAlign: "center", padding: "30px 0", fontSize: 9, color: "var(--ed-txt3)" }}>Nenhum campo bind</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {BIND_GROUPS.map(g => {
            const groupEls = bindElements.filter(el => g.fields.includes(el.bindParam || ""));
            if (groupEls.length === 0) return null;
            return (
              <div key={g.group}>
                <div style={{ fontSize: 7, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.2)", marginBottom: 3 }}>{g.group}</div>
                {groupEls.map(el => (
                  <div key={el.id} style={{ marginBottom: 4 }}>
                    <div style={{ fontSize: 8, color: "var(--ed-bind)", marginBottom: 1 }}>⬡ {el.bindParam}</div>
                    {el.type === "text" ? (
                      <input type="text" value={el.text || ""} onChange={e => onUpdate(el.id, { text: e.target.value })} placeholder={`[${el.bindParam}]`}
                        style={{ width: "100%", height: 26, borderRadius: 4, border: "1px solid var(--ed-input-bdr)", background: "var(--ed-input)", padding: "0 6px", fontSize: 10, color: "var(--ed-txt)", outline: "none", boxSizing: "border-box" }} />
                    ) : (
                      <input type="text" value={el.src || ""} onChange={e => onUpdate(el.id, { src: e.target.value })} placeholder="URL da imagem"
                        style={{ width: "100%", height: 26, borderRadius: 4, border: "1px solid var(--ed-input-bdr)", background: "var(--ed-input)", padding: "0 6px", fontSize: 10, color: "var(--ed-txt)", outline: "none", boxSizing: "border-box" }} />
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <button style={{ width: "100%", marginTop: 12, padding: "8px 0", borderRadius: 6, border: "none", background: "#FF7A1A", color: "#fff", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
        Exportar com estes dados
      </button>
    </div>
  );
}
