"use client";

import { useState, useRef, useCallback } from "react";
import html2canvas from "html2canvas";

const LOGO_URL = "https://res.cloudinary.com/dxgj4bcch/image/upload/f_auto,q_auto/page/page/logo_aurovista.png";
const FORMATS = [
  { id: "stories", label: "Stories", w: 1080, h: 1920 },
  { id: "feed", label: "Feed", w: 1080, h: 1350 },
  { id: "reels", label: "Reels", w: 1080, h: 1920 },
  { id: "tv", label: "TV", w: 1920, h: 1080 },
];
const BADGES = ["All Inclusive", "Última Chamada", "Últimos Lugares", "Ofertas"];
const PARCELAS_OPTIONS = ["10x", "12x"];

type Status = "idle" | "capturing" | "uploading" | "publishing" | "saving" | "done" | "error";

export default function PublishPage() {
  const [format, setFormat] = useState("stories");
  const [data, setData] = useState({
    destino: "", ida: "", volta: "", noites: "",
    parcelas_qtd: "10x",
    parcela_int: "", parcela_cent: "",
    total: "",
    servicos: "", badge: "", legenda: "",
  });
  const [status, setStatus] = useState<Status>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const previewRef = useRef<HTMLDivElement>(null);

  const update = (key: string, val: string) => setData((d) => ({ ...d, [key]: val }));
  const fmt = FORMATS.find(f => f.id === format)!;
  const isTV = format === "tv";
  const previewW = isTV ? 340 : 220;
  const previewH = isTV ? 191 : 390;
  const scale = fmt.w / previewW;

  const captureCanvas = useCallback(async (): Promise<Blob> => {
    if (!previewRef.current) throw new Error("Preview não encontrado");
    const canvas = await html2canvas(previewRef.current, {
      scale,
      useCORS: true,
      backgroundColor: null,
      width: previewW,
      height: previewH,
    });
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Falha ao gerar imagem")), "image/png", 1);
    });
  }, [scale, previewW, previewH]);

  async function handleDownload() {
    try {
      setStatus("capturing");
      setStatusMsg("Gerando imagem...");
      const blob = await captureCanvas();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.destino || "publicacao"}-${format}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus("idle");
      setStatusMsg("");
    } catch {
      setStatus("error");
      setStatusMsg("Erro ao gerar imagem");
    }
  }

  async function handlePublish() {
    if (!data.destino) { setStatus("error"); setStatusMsg("Preencha o destino"); return; }

    try {
      // 1. Capturar imagem
      setStatus("capturing");
      setStatusMsg("Gerando imagem...");
      const blob = await captureCanvas();

      // 2. Upload Cloudinary
      setStatus("uploading");
      setStatusMsg("Enviando imagem...");
      const formData = new FormData();
      formData.append("file", blob, `${data.destino}-${format}.png`);
      const uploadRes = await fetch("/api/cloudinary", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "Erro no upload");
      const imageUrl = uploadData.url;

      // 3. Buscar sessão para pegar loja_id
      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json();
      if (!sessionRes.ok || !sessionData.user) throw new Error("Sessão expirada");
      const user = sessionData.user;

      // 4. Publicar no Instagram (se tiver loja com IG)
      let igMediaId = null;
      if (user.loja_id) {
        setStatus("publishing");
        setStatusMsg("Publicando no Instagram...");
        const pubRes = await fetch("/api/instagram/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loja_id: user.loja_id,
            image_url: imageUrl,
            caption: data.legenda || `${data.destino} — ${data.parcelas_qtd} R$ ${data.parcela_int},${data.parcela_cent || "00"}`,
          }),
        });
        const pubData = await pubRes.json();
        if (pubRes.ok) igMediaId = pubData.ig_media_id;
      }

      // 5. Salvar postagem no banco
      setStatus("saving");
      setStatusMsg("Salvando...");
      await fetch("/api/postagens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imagem_url: imageUrl,
          legenda: data.legenda || "",
          formato: format,
          ig_media_id: igMediaId,
          status: igMediaId ? "publicado" : "rascunho",
        }),
      });

      setStatus("done");
      setStatusMsg(igMediaId ? "Publicado com sucesso!" : "Salvo como rascunho (loja sem Instagram)");
      setTimeout(() => { setStatus("idle"); setStatusMsg(""); }, 4000);
    } catch (err) {
      setStatus("error");
      setStatusMsg(err instanceof Error ? err.message : "Erro ao publicar");
    }
  }

  const busy = status !== "idle" && status !== "done" && status !== "error";

  return (
    <div style={{ display: "flex", gap: 0, margin: "-24px -24px -24px -24px", minHeight: "calc(100vh - 0px)" }}>
      {/* Form sidebar */}
      <div style={{
        width: 340, padding: "24px 20px", overflowY: "auto",
        borderRight: "1px solid var(--border)",
        background: "var(--bg-sidebar)",
        display: "flex", flexDirection: "column",
      }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px", color: "var(--text)" }}>Nova Publicação</h1>
        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 20px" }}>Pacote Viagem — Template V1</p>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
          <Field label="Destino" value={data.destino} onChange={(v) => update("destino", v)} placeholder="Ex: Cancún" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 70px", gap: 8 }}>
            <Field label="Ida" value={data.ida} onChange={(v) => update("ida", v)} placeholder="DD/MM" />
            <Field label="Volta" value={data.volta} onChange={(v) => update("volta", v)} placeholder="DD/MM" />
            <Field label="Noites" value={data.noites} onChange={(v) => update("noites", v)} placeholder="7" />
          </div>

          <div>
            <label style={labelStyle}>Parcela</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 4 }}>
                {PARCELAS_OPTIONS.map((p) => (
                  <button key={p} onClick={() => update("parcelas_qtd", p)} style={{
                    padding: "8px 12px", borderRadius: 8, border: "1px solid",
                    borderColor: data.parcelas_qtd === p ? "rgba(212,168,67,0.35)" : "var(--border)",
                    background: data.parcelas_qtd === p ? "rgba(212,168,67,0.1)" : "var(--bg-input)",
                    color: data.parcelas_qtd === p ? "var(--gold)" : "var(--text-muted)",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}>{p}</button>
                ))}
              </div>
              <span style={{ color: "var(--text-muted)", fontSize: 12 }}>R$</span>
              <input value={data.parcela_int} onChange={(e) => update("parcela_int", e.target.value)}
                placeholder="890" style={{ ...inputBaseStyle, flex: 1, width: "auto" }} />
              <span style={{ color: "var(--text-muted)", fontWeight: 600, fontSize: 16 }}>,</span>
              <input value={data.parcela_cent} onChange={(e) => update("parcela_cent", e.target.value)}
                placeholder="00" style={{ ...inputBaseStyle, width: 52 }} />
            </div>
          </div>

          <Field label="Valor Total" value={data.total} onChange={(v) => update("total", v)} placeholder="Ex: 8.905,00" />
          <Field label="Serviços inclusos" value={data.servicos} onChange={(v) => update("servicos", v)} placeholder="Transfer, Meia Pensão, Seguro" />

          <div>
            <label style={labelStyle}>Badge</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {BADGES.map((b) => (
                <button key={b} onClick={() => update("badge", data.badge === b ? "" : b)} style={{
                  padding: "6px 12px", borderRadius: 8, border: "1px solid",
                  borderColor: data.badge === b ? "rgba(212,168,67,0.35)" : "var(--border)",
                  background: data.badge === b ? "rgba(212,168,67,0.1)" : "var(--bg-input)",
                  color: data.badge === b ? "var(--gold)" : "var(--text-secondary)",
                  fontSize: 10, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                }}>{b}</button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Legenda IA</label>
              <span style={{ fontSize: 8, padding: "2px 6px", borderRadius: 4, background: "rgba(59,130,246,0.1)", color: "var(--blue)", fontWeight: 700 }}>AI</span>
            </div>
            <textarea rows={3} value={data.legenda} onChange={(e) => update("legenda", e.target.value)}
              placeholder="Clique em gerar para criar com IA..."
              style={{ ...inputBaseStyle, resize: "none", fontSize: 12, fontFamily: "inherit" }} />
          </div>
        </div>

        {/* Status */}
        {statusMsg && (
          <div style={{
            padding: "10px 14px", borderRadius: 10, marginTop: 12,
            fontSize: 12, fontWeight: 600,
            background: status === "error" ? "rgba(245,101,101,0.1)" : status === "done" ? "rgba(72,187,120,0.1)" : "rgba(59,130,246,0.1)",
            color: status === "error" ? "var(--danger)" : status === "done" ? "var(--success)" : "var(--blue)",
          }}>
            {statusMsg}
          </div>
        )}

        {/* Actions */}
        <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
          <button onClick={handlePublish} disabled={busy} style={{
            flex: 1, padding: 12, borderRadius: 12, border: "none",
            background: "linear-gradient(135deg, var(--gold), var(--orange))",
            color: "#0B1120", fontSize: 13, fontWeight: 700,
            cursor: busy ? "wait" : "pointer",
            boxShadow: "0 4px 16px rgba(212,168,67,0.25)",
            opacity: busy ? 0.7 : 1,
          }}>{busy ? "Processando..." : "Publicar"}</button>
          <button onClick={handleDownload} disabled={busy} style={{
            padding: "12px 16px", borderRadius: 12,
            border: "1px solid var(--border)", background: "var(--bg-card)",
            color: "var(--text-secondary)", fontSize: 13, fontWeight: 600,
            cursor: busy ? "wait" : "pointer",
            opacity: busy ? 0.7 : 1,
          }}>↓</button>
        </div>
      </div>

      {/* Preview */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 20,
        background: "var(--bg)",
        position: "relative",
      }}>
        <div style={{
          position: "absolute", inset: 0, opacity: 0.3,
          backgroundImage: "repeating-conic-gradient(var(--border-light) 0% 25%, transparent 0% 50%)",
          backgroundSize: "16px 16px",
        }} />

        <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
          <div style={{ width: 6, height: 6, borderRadius: 3, background: "var(--success)", boxShadow: "0 0 8px var(--success)", animation: "pulse 2s ease-in-out infinite" }} />
          <span style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>Preview ao vivo</span>
        </div>

        {/* Card preview — ref for capture */}
        <div ref={previewRef} style={{
          width: previewW, height: previewH,
          borderRadius: 0, overflow: "hidden", position: "relative",
          background: "linear-gradient(180deg, #0F2847 0%, #081428 100%)",
        }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 30%, rgba(59,130,246,0.1) 0%, transparent 50%)" }} />

          {data.badge && (
            <div style={{
              position: "absolute", top: 14, right: 14, padding: "4px 10px", borderRadius: 6,
              background: "linear-gradient(135deg, #D4A843, #FF7A1A)",
              fontSize: 9, fontWeight: 700, color: "#0A0F18", letterSpacing: 0.5, textTransform: "uppercase",
            }}>{data.badge}</div>
          )}

          <div style={{ position: "absolute", top: 12, left: 12, width: 24, height: 24, borderRadius: 6, overflow: "hidden", background: "rgba(0,0,0,0.4)" }}>
            <img src={LOGO_URL} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} crossOrigin="anonymous" />
          </div>

          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            padding: isTV ? "18px 22px" : "22px 18px",
            background: "linear-gradient(transparent, rgba(8,16,32,0.95))",
          }}>
            <p style={{ fontSize: 9, fontWeight: 700, margin: 0, color: "#D4A843", letterSpacing: 3, textTransform: "uppercase" }}>DESTINO</p>
            <h2 style={{
              fontSize: isTV ? 24 : 22, fontWeight: 800, margin: "4px 0 0",
              textTransform: "uppercase", letterSpacing: -0.5,
              color: "#FFFFFF",
            }}>{data.destino || "DESTINO"}</h2>

            {data.ida && (
              <p style={{ fontSize: 10, color: "#8DA2C0", margin: "6px 0 0" }}>
                {data.ida}{data.volta ? ` — ${data.volta}` : ""}{data.noites ? ` · ${data.noites} noites` : ""}
              </p>
            )}

            <div style={{ marginTop: 12, display: "flex", alignItems: "flex-end", gap: 4 }}>
              <span style={{ fontSize: 10, color: "#4E6585", fontWeight: 600, marginBottom: 2 }}>{data.parcelas_qtd || "10x"}</span>
              <span style={{ fontSize: 9, color: "#D4A843", fontWeight: 600, marginBottom: 2 }}>R$</span>
              <span style={{ fontSize: 30, fontWeight: 800, color: "#F0F4FA", letterSpacing: -1, lineHeight: 1 }}>
                {data.parcela_int || "0"}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#F0F4FA", marginBottom: 2 }}>
                ,{data.parcela_cent || "00"}
              </span>
            </div>

            <p style={{ fontSize: 9, color: "#4E6585", margin: "4px 0 0" }}>
              ou R$ {data.total || "0,00"} por pessoa apto. duplo
            </p>

            {data.servicos && (
              <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
                {data.servicos.split(",").map((s, i) => (
                  <span key={i} style={{
                    fontSize: 7, padding: "2px 6px", borderRadius: 4,
                    background: "rgba(59,130,246,0.10)", color: "#6BA3E8",
                    fontWeight: 600, border: "1px solid rgba(59,130,246,0.12)",
                  }}>{s.trim()}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <p style={{ fontSize: 10, color: "var(--text-muted)", position: "relative" }}>
          {fmt.w}×{fmt.h}
        </p>

        {/* Format switcher */}
        <div style={{
          display: "flex", gap: 4, padding: 4, borderRadius: 14,
          background: "var(--bg-card)", border: "1px solid var(--border)",
          position: "relative",
        }}>
          {FORMATS.map((f) => (
            <button key={f.id} onClick={() => setFormat(f.id)} style={{
              padding: "8px 18px", borderRadius: 10, border: "none",
              background: format === f.id ? "rgba(212,168,67,0.1)" : "transparent",
              color: format === f.id ? "var(--gold)" : "var(--text-muted)",
              fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
            }}>{f.label}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ===== Helpers ===== */
const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, color: "var(--text-muted)",
  letterSpacing: 1, textTransform: "uppercase",
  display: "block", marginBottom: 6,
};

const inputBaseStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  background: "var(--bg-input)", border: "1px solid var(--border)",
  color: "var(--text)", fontSize: 13, fontWeight: 500,
  outline: "none", transition: "all 0.25s", boxSizing: "border-box",
};

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} style={inputBaseStyle}
        onFocus={(e) => e.target.style.borderColor = "var(--border-focus)"}
        onBlur={(e) => e.target.style.borderColor = "var(--border)"}
      />
    </div>
  );
}
