"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { CotaStatus } from "@/lib/cotas";
import html2canvas from "html2canvas";

const LOGO_URL = "https://res.cloudinary.com/dxgj4bcch/image/upload/f_auto,q_auto/page/page/logo_aurovista.png";

const FORMATS = [
  { id: "stories", label: "Stories", w: 1080, h: 1920 },
  { id: "feed", label: "Feed", w: 1080, h: 1350 },
  { id: "reels", label: "Reels", w: 1080, h: 1920 },
  { id: "transmissao", label: "Transmissão", w: 1080, h: 1920 },
  { id: "tv", label: "TV", w: 1920, h: 1080 },
];

const BADGES = [
  { value: "", label: "Nenhum" },
  { value: "All Inclusive", label: "All Inclusive" },
  { value: "Última Chamada", label: "Última Chamada" },
  { value: "Últimos Lugares", label: "Últimos Lugares" },
  { value: "Ofertas", label: "Ofertas" },
];

const PARCELAS_OPTIONS = ["6x", "10x", "12x"];

type Status = "idle" | "capturing" | "uploading" | "publishing" | "saving" | "done" | "error";

export default function PublishPage() {
  const [format, setFormat] = useState("stories");
  const [data, setData] = useState({
    destino: "", ida: "", volta: "", noites: "",
    parcelas_qtd: "10x", parcela_int: "", parcela_cent: "",
    total: "", servicos: "", badge: "", legenda: "",
  });
  const [status, setStatus] = useState<Status>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [badgeOpen, setBadgeOpen] = useState(false);
  const [gerandoIA, setGerandoIA] = useState(false);
  const [fonteIA, setFonteIA] = useState("");
  const [cotas, setCotas] = useState<CotaStatus | null>(null);
  const [lojasDisponiveis, setLojasDisponiveis] = useState<{ id: string; nome: string; cidade: string }[]>([]);
  const [lojasSelecionadas, setLojasSelecionadas] = useState<string[]>([]);
  const [multiResultados, setMultiResultados] = useState<{ loja_nome: string; status: string; erro?: string }[] | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);

  // Buscar cotas e lojas disponíveis
  useEffect(() => {
    fetch("/api/cotas").then(r => r.json()).then(d => {
      if (d.uso) setCotas(d);
    }).catch(() => {});
    fetch("/api/instagram/publish-multi").then(r => r.json()).then(d => {
      if (d.lojas) {
        setLojasDisponiveis(d.lojas);
        if (d.loja_id_padrao) setLojasSelecionadas([d.loja_id_padrao]);
      }
    }).catch(() => {});
  }, []);

  const update = (key: string, val: string) => setData(d => ({ ...d, [key]: val }));
  const fmt = FORMATS.find(f => f.id === format)!;
  const isTV = format === "tv";

  // Base do preview = tamanho "real" do card para captura (proporcional)
  const baseW = isTV ? 480 : 300;
  const baseH = isTV ? 270 : (format === "feed" ? 375 : 533);
  const captureScale = fmt.w / baseW;

  // Auto-fit preview no container
  useEffect(() => {
    function resize() {
      if (!previewContainerRef.current) return;
      const cw = previewContainerRef.current.clientWidth - 60;
      const ch = previewContainerRef.current.clientHeight - 100;
      const s = Math.min(cw / baseW, ch / baseH, 1.6);
      setPreviewScale(s);
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [baseW, baseH]);

  const captureCanvas = useCallback(async (): Promise<Blob> => {
    if (!previewRef.current) throw new Error("Preview não encontrado");
    const canvas = await html2canvas(previewRef.current, {
      scale: captureScale, useCORS: true, backgroundColor: null, width: baseW, height: baseH,
    });
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Falha")), "image/png", 1);
    });
  }, [captureScale, baseW, baseH]);

  async function handleDownload() {
    try {
      setStatus("capturing"); setStatusMsg("Gerando imagem...");
      const blob = await captureCanvas();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${data.destino || "publicacao"}-${format}.png`; a.click();
      URL.revokeObjectURL(url);
      setStatus("idle"); setStatusMsg("");
    } catch { setStatus("error"); setStatusMsg("Erro ao gerar imagem"); }
  }

  async function handlePublish() {
    if (!data.destino) { setStatus("error"); setStatusMsg("Preencha o destino"); return; }
    try {
      setStatus("capturing"); setStatusMsg("Gerando imagem...");
      const blob = await captureCanvas();

      setStatus("uploading"); setStatusMsg("Enviando imagem...");
      const formData = new FormData();
      formData.append("file", blob, `${data.destino}-${format}.png`);
      const uploadRes = await fetch("/api/cloudinary", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error);
      const imageUrl = uploadData.url;

      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json();
      if (!sessionRes.ok) throw new Error("Sessão expirada");
      const user = sessionData.user;

      const caption = data.legenda || `${data.destino} — ${data.parcelas_qtd} R$ ${data.parcela_int},${data.parcela_cent || "00"}`;
      const targetLojas = lojasSelecionadas.length > 0 ? lojasSelecionadas : (user.loja_id ? [user.loja_id] : []);

      let igMediaId = null;
      setMultiResultados(null);

      if (targetLojas.length > 0 && format !== "tv") {
        setStatus("publishing");

        if (targetLojas.length === 1) {
          // Publicação simples
          setStatusMsg("Publicando no Instagram...");
          const pubRes = await fetch("/api/instagram/publish", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ loja_id: targetLojas[0], image_url: imageUrl, caption, formato: format }),
          });
          const pubData = await pubRes.json();
          if (pubRes.status === 403) throw new Error(pubData.error || "Limite de publicações atingido");
          if (pubRes.ok) igMediaId = pubData.ig_media_id;
        } else {
          // Multi-destino
          setStatusMsg(`Publicando em ${targetLojas.length} lojas...`);
          const multiRes = await fetch("/api/instagram/publish-multi", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ loja_ids: targetLojas, image_url: imageUrl, caption, formato: format, legenda: data.legenda }),
          });
          const multiData = await multiRes.json();
          if (multiData.resultados) {
            setMultiResultados(multiData.resultados);
            if (multiData.sucesso > 0) igMediaId = "multi";
          }
        }
      }

      // Salvar postagem (para publicação simples ou TV)
      if (igMediaId !== "multi") {
        setStatus("saving"); setStatusMsg("Salvando...");
        await fetch("/api/postagens", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imagem_url: imageUrl, legenda: data.legenda, formato: format, ig_media_id: igMediaId, status: igMediaId ? "publicado" : "rascunho" }),
        });
      }

      setStatus("done");
      if (igMediaId === "multi" && multiResultados) {
        // Mensagem será exibida pelo painel de resultados
        setStatusMsg("Publicação multi-destino concluída");
      } else {
        setStatusMsg(igMediaId ? "Publicado com sucesso!" : format === "tv" ? "Salvo (TV = download only)" : "Salvo como rascunho");
      }
      // Atualizar cotas após publicação
      fetch("/api/cotas").then(r => r.json()).then(d => { if (d.uso) setCotas(d); }).catch(() => {});
      setTimeout(() => { setStatus("idle"); setStatusMsg(""); }, 4000);
    } catch (err) {
      setStatus("error"); setStatusMsg(err instanceof Error ? err.message : "Erro");
    }
  }

  const busy = !["idle", "done", "error"].includes(status);

  return (
    <div style={{ display: "flex", gap: 0, margin: "-24px", minHeight: "calc(100vh)" }}>

      {/* ===== COLUNA 1: Formulário ===== */}
      <div style={{
        width: 300, padding: "20px 16px", overflowY: "auto",
        borderRight: "1px solid var(--border)", background: "var(--bg-sidebar)",
        display: "flex", flexDirection: "column", flexShrink: 0,
      }}>
        <h1 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 2px", color: "var(--text)" }}>Nova Publicação</h1>
        <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 18px", letterSpacing: 0.5 }}>Pacote Viagem — Template V1</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
          <Field label="Destino" value={data.destino} onChange={v => update("destino", v)} placeholder="Ex: Cancún" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="Ida" value={data.ida} onChange={v => update("ida", v)} placeholder="DD/MM" />
            <Field label="Volta" value={data.volta} onChange={v => update("volta", v)} placeholder="DD/MM" />
          </div>

          <Field label="Noites" value={data.noites} onChange={v => update("noites", v)} placeholder="7" />

          {/* Parcelas — Dropdown customizado */}
          <div>
            <label style={labelStyle}>Parcelas</label>
            <div style={{ display: "flex", gap: 4 }}>
              {PARCELAS_OPTIONS.map(p => (
                <button key={p} onClick={() => update("parcelas_qtd", p)} style={{
                  flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid",
                  borderColor: data.parcelas_qtd === p ? "rgba(212,168,67,0.4)" : "var(--border)",
                  background: data.parcelas_qtd === p ? "rgba(212,168,67,0.12)" : "var(--bg-input)",
                  color: data.parcelas_qtd === p ? "var(--gold)" : "var(--text-muted)",
                  fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
                }}>{p}</button>
              ))}
            </div>
          </div>

          {/* Preço */}
          <div>
            <label style={labelStyle}>Valor da Parcela</label>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ color: "var(--gold)", fontSize: 12, fontWeight: 700 }}>R$</span>
              <input value={data.parcela_int} onChange={e => update("parcela_int", e.target.value)}
                placeholder="890" style={{ ...inputStyle, flex: 1 }} />
              <span style={{ color: "var(--text-muted)", fontWeight: 700, fontSize: 18 }}>,</span>
              <input value={data.parcela_cent} onChange={e => update("parcela_cent", e.target.value)}
                placeholder="00" style={{ ...inputStyle, width: 52 }} maxLength={2} />
            </div>
          </div>

          <Field label="Valor Total" value={data.total} onChange={v => update("total", v)} placeholder="R$ 8.905,00" />
          <Field label="Serviços Inclusos" value={data.servicos} onChange={v => update("servicos", v)} placeholder="Transfer, Meia Pensão, Seguro" />
        </div>
      </div>

      {/* ===== COLUNA 2: Preview Grande ===== */}
      <div ref={previewContainerRef} style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 16,
        background: "var(--bg)", position: "relative", overflow: "hidden",
      }}>
        {/* Checkerboard bg */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.25, pointerEvents: "none",
          backgroundImage: "repeating-conic-gradient(var(--border-light) 0% 25%, transparent 0% 50%)",
          backgroundSize: "16px 16px",
        }} />

        {/* Live indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
          <div style={{ width: 6, height: 6, borderRadius: 3, background: "var(--success)", boxShadow: "0 0 8px var(--success)", animation: "pulse 2s ease-in-out infinite" }} />
          <span style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>Preview ao vivo</span>
        </div>

        {/* Preview card — escalado para ser grande */}
        <div style={{
          transform: `scale(${previewScale})`,
          transformOrigin: "center center",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(59,130,246,0.06)",
        }}>
          <div ref={previewRef} style={{
            width: baseW, height: baseH,
            overflow: "hidden", position: "relative",
            background: "linear-gradient(180deg, #0F2847 0%, #081428 100%)",
          }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 30%, rgba(59,130,246,0.1) 0%, transparent 50%)" }} />

            {data.badge && (
              <div style={{
                position: "absolute", top: 14, right: 14, padding: "4px 10px", borderRadius: 6,
                background: "linear-gradient(135deg, #D4A843, #FF7A1A)",
                fontSize: 8, fontWeight: 700, color: "#0A0F18", letterSpacing: 0.5, textTransform: "uppercase",
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
              <p style={{ fontSize: 8, fontWeight: 700, margin: 0, color: "#D4A843", letterSpacing: 3, textTransform: "uppercase" }}>DESTINO</p>
              <h2 style={{
                fontSize: isTV ? 22 : 20, fontWeight: 800, margin: "4px 0 0",
                textTransform: "uppercase", letterSpacing: -0.5, color: "#FFFFFF",
              }}>{data.destino || "DESTINO"}</h2>

              {data.ida && (
                <p style={{ fontSize: 9, color: "#8DA2C0", margin: "5px 0 0" }}>
                  {data.ida}{data.volta ? ` — ${data.volta}` : ""}{data.noites ? ` · ${data.noites} noites` : ""}
                </p>
              )}

              <div style={{ marginTop: 10, display: "flex", alignItems: "flex-end", gap: 3 }}>
                <span style={{ fontSize: 9, color: "#4E6585", fontWeight: 600, marginBottom: 1 }}>{data.parcelas_qtd}</span>
                <span style={{ fontSize: 8, color: "#D4A843", fontWeight: 600, marginBottom: 1 }}>R$</span>
                <span style={{ fontSize: 26, fontWeight: 800, color: "#F0F4FA", letterSpacing: -1, lineHeight: 1 }}>{data.parcela_int || "0"}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#F0F4FA", marginBottom: 1 }}>,{data.parcela_cent || "00"}</span>
              </div>

              <p style={{ fontSize: 8, color: "#4E6585", margin: "3px 0 0" }}>
                ou R$ {data.total || "0,00"} por pessoa apto. duplo
              </p>

              {data.servicos && (
                <div style={{ marginTop: 5, display: "flex", gap: 3, flexWrap: "wrap" }}>
                  {data.servicos.split(",").map((s, i) => (
                    <span key={i} style={{
                      fontSize: 6, padding: "2px 5px", borderRadius: 3,
                      background: "rgba(59,130,246,0.10)", color: "#6BA3E8",
                      fontWeight: 600, border: "1px solid rgba(59,130,246,0.12)",
                    }}>{s.trim()}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Formato info */}
        <p style={{ fontSize: 10, color: "var(--text-muted)", position: "relative" }}>{fmt.w}×{fmt.h}</p>

        {/* Format switcher */}
        <div style={{
          display: "flex", gap: 3, padding: 4, borderRadius: 12,
          background: "var(--bg-card)", border: "1px solid var(--border)", position: "relative",
        }}>
          {FORMATS.map(f => (
            <button key={f.id} onClick={() => setFormat(f.id)} style={{
              padding: "7px 16px", borderRadius: 9, border: "none",
              background: format === f.id ? "rgba(212,168,67,0.12)" : "transparent",
              color: format === f.id ? "var(--gold)" : "var(--text-muted)",
              fontSize: 11, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
            }}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* ===== COLUNA 3: Config + Ações ===== */}
      <div style={{
        width: 250, padding: "20px 16px", overflowY: "auto",
        borderLeft: "1px solid var(--border)", background: "var(--bg-sidebar)",
        display: "flex", flexDirection: "column", flexShrink: 0,
      }}>
        {/* Badge — dropdown customizado */}
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Badge</label>
          <div style={{ position: "relative" }}>
            <button onClick={() => setBadgeOpen(!badgeOpen)} style={{
              width: "100%", padding: "10px 12px", borderRadius: 10, textAlign: "left",
              border: "1px solid", borderColor: data.badge ? "rgba(212,168,67,0.3)" : "var(--border)",
              background: data.badge ? "rgba(212,168,67,0.06)" : "var(--bg-input)",
              color: data.badge ? "var(--gold)" : "var(--text-muted)",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span>{data.badge || "Selecionar badge..."}</span>
              <span style={{ fontSize: 10, transform: badgeOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
            </button>
            {badgeOpen && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, zIndex: 30,
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: 10, padding: 4, boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              }}>
                {BADGES.map(b => (
                  <button key={b.value} onClick={() => { update("badge", b.value); setBadgeOpen(false); }} style={{
                    display: "block", width: "100%", padding: "9px 12px", borderRadius: 7,
                    border: "none", textAlign: "left", cursor: "pointer",
                    background: data.badge === b.value ? "rgba(212,168,67,0.1)" : "transparent",
                    color: data.badge === b.value ? "var(--gold)" : "var(--text-secondary)",
                    fontSize: 11, fontWeight: data.badge === b.value ? 700 : 500,
                  }}>{b.label}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Legenda IA */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Legenda</label>
              <span style={{ fontSize: 7, padding: "2px 6px", borderRadius: 4, background: "rgba(59,130,246,0.1)", color: "var(--blue)", fontWeight: 700 }}>AI</span>
              {fonteIA && <span style={{ fontSize: 7, padding: "2px 6px", borderRadius: 4, background: "rgba(72,187,120,0.1)", color: "var(--success)", fontWeight: 600 }}>{fonteIA}</span>}
            </div>
            <button
              onClick={async () => {
                if (!data.destino) { setStatusMsg("Preencha o destino primeiro"); setStatus("error"); return; }
                setGerandoIA(true); setFonteIA("");
                try {
                  const res = await fetch("/api/ai/legenda", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      destino: data.destino, ida: data.ida, volta: data.volta, noites: data.noites,
                      servicos: data.servicos, parcelas_qtd: data.parcelas_qtd,
                      parcela_int: data.parcela_int, parcela_cent: data.parcela_cent,
                      total: data.total, badge: data.badge,
                    }),
                  });
                  const result = await res.json();
                  if (result.legenda) {
                    update("legenda", result.legenda);
                    setFonteIA(result.fonte === "claude" ? "Claude" : result.fonte === "ollama" ? "Ollama" : "Template");
                  } else {
                    setStatusMsg(result.error || "Erro ao gerar"); setStatus("error");
                  }
                } catch { setStatusMsg("Erro ao gerar legenda"); setStatus("error"); }
                setGerandoIA(false);
              }}
              disabled={gerandoIA || busy}
              style={{
                padding: "4px 10px", borderRadius: 6, border: "none", cursor: gerandoIA ? "wait" : "pointer",
                background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))",
                color: "var(--blue)", fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                opacity: gerandoIA ? 0.7 : 1,
              }}
            >{gerandoIA ? "Gerando..." : "Gerar com IA"}</button>
          </div>
          <textarea rows={5} value={data.legenda} onChange={e => update("legenda", e.target.value)}
            placeholder="Clique em 'Gerar com IA' ou escreva manualmente..."
            style={{ ...inputStyle, resize: "vertical", fontSize: 11, fontFamily: "inherit", lineHeight: 1.5 }} />
        </div>

        {/* Cotas */}
        {cotas && cotas.plano && (
          <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: "var(--bg-input)", border: "1px solid var(--border)" }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1.2, textTransform: "uppercase" }}>Cotas do Mês</span>
            <CotaBar label="Feed/Reels" usado={cotas.uso.posts_pontos} limite={cotas.uso.posts_limite} unidade="pts" />
            <CotaBar label="Stories" usado={cotas.uso.stories_usados} limite={cotas.uso.stories_limite} unidade="" />
            {cotas.uso.pack_creditos_restantes > 0 && (
              <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Pack extra</span>
                <span style={{ fontSize: 11, color: "var(--gold)", fontWeight: 700 }}>{cotas.uso.pack_creditos_restantes} créditos</span>
              </div>
            )}
            <div style={{ marginTop: 6, fontSize: 9, color: "var(--text-muted)" }}>
              Plano: <strong style={{ color: "var(--gold)" }}>{cotas.plano.nome}</strong>
            </div>
          </div>
        )}

        {/* Formato ativo */}
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: "var(--bg-input)", border: "1px solid var(--border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>Formato</span>
            <span style={{ fontSize: 12, color: "var(--gold)", fontWeight: 700 }}>{fmt.label}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>Tamanho</span>
            <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{fmt.w}×{fmt.h}</span>
          </div>
          {isTV && (
            <p style={{ fontSize: 9, color: "var(--orange)", margin: "8px 0 0", fontWeight: 600 }}>Apenas download — sem publicação IG</p>
          )}
        </div>

        {/* Destinos (multi-loja) */}
        {lojasDisponiveis.length > 1 && !isTV && (
          <div style={{ marginBottom: 16, padding: 12, borderRadius: 10, background: "var(--bg-input)", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1.2, textTransform: "uppercase" }}>Publicar em</span>
              <button onClick={() => {
                if (lojasSelecionadas.length === lojasDisponiveis.length) setLojasSelecionadas([]);
                else setLojasSelecionadas(lojasDisponiveis.map(l => l.id));
              }} style={{
                fontSize: 8, padding: "2px 6px", borderRadius: 4, border: "1px solid var(--border)",
                background: "transparent", color: "var(--blue)", fontWeight: 600, cursor: "pointer",
              }}>{lojasSelecionadas.length === lojasDisponiveis.length ? "Nenhuma" : "Todas"}</button>
            </div>
            {lojasDisponiveis.map(l => {
              const sel = lojasSelecionadas.includes(l.id);
              return (
                <button key={l.id} onClick={() => {
                  setLojasSelecionadas(prev => sel ? prev.filter(id => id !== l.id) : [...prev, l.id]);
                }} style={{
                  display: "flex", alignItems: "center", gap: 6, width: "100%",
                  padding: "6px 8px", marginBottom: 3, borderRadius: 6, border: "1px solid",
                  borderColor: sel ? "rgba(72,187,120,0.3)" : "var(--border)",
                  background: sel ? "rgba(72,187,120,0.06)" : "transparent",
                  cursor: "pointer", textAlign: "left",
                }}>
                  <span style={{
                    width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                    border: sel ? "none" : "1px solid var(--border)",
                    background: sel ? "var(--success)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9, color: "#fff", fontWeight: 700,
                  }}>{sel ? "✓" : ""}</span>
                  <span style={{ fontSize: 11, color: sel ? "var(--text)" : "var(--text-muted)", fontWeight: sel ? 600 : 400 }}>{l.nome}</span>
                  <span style={{ fontSize: 9, color: "var(--text-muted)", marginLeft: "auto" }}>{l.cidade}</span>
                </button>
              );
            })}
            {lojasSelecionadas.length > 1 && (
              <p style={{ fontSize: 9, color: "var(--gold)", margin: "6px 0 0", fontWeight: 600 }}>
                {lojasSelecionadas.length} lojas selecionadas
              </p>
            )}
          </div>
        )}

        {/* Resultados multi-destino */}
        {multiResultados && (
          <div style={{ marginBottom: 12, padding: 10, borderRadius: 10, background: "var(--bg-input)", border: "1px solid var(--border)" }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1, textTransform: "uppercase" }}>Resultados</span>
            {multiResultados.map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>{r.loja_nome}</span>
                <span style={{
                  fontSize: 9, fontWeight: 600,
                  color: r.status === "publicado" ? "var(--success)" : "var(--danger)",
                }}>{r.status === "publicado" ? "OK" : r.erro || "Erro"}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Status */}
        {statusMsg && (
          <div style={{
            padding: "10px 12px", borderRadius: 10, marginBottom: 12, fontSize: 11, fontWeight: 600,
            background: status === "error" ? "rgba(245,101,101,0.1)" : status === "done" ? "rgba(72,187,120,0.1)" : "rgba(59,130,246,0.1)",
            color: status === "error" ? "var(--danger)" : status === "done" ? "var(--success)" : "var(--blue)",
          }}>{statusMsg}</div>
        )}

        {/* Ações */}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handlePublish} disabled={busy} style={{
            flex: 1, padding: "14px 0", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg, var(--gold), var(--orange))",
            color: "#0B1120", fontSize: 13, fontWeight: 700,
            cursor: busy ? "wait" : "pointer",
            boxShadow: "0 4px 20px rgba(212,168,67,0.3)",
            opacity: busy ? 0.7 : 1, transition: "all 0.25s",
          }}>{busy ? "Processando..." : isTV ? "Salvar" : lojasSelecionadas.length > 1 ? `Publicar (${lojasSelecionadas.length})` : "Publicar"}</button>
          <button onClick={handleDownload} disabled={busy} style={{
            padding: "14px 18px", borderRadius: 12,
            border: "1px solid var(--border)", background: "var(--bg-card)",
            color: "var(--text-secondary)", fontSize: 14, fontWeight: 600,
            cursor: busy ? "wait" : "pointer", opacity: busy ? 0.7 : 1,
          }} title="Download PNG">↓</button>
        </div>
      </div>
    </div>
  );
}

/* ===== Components ===== */
const labelStyle: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, color: "var(--text-muted)",
  letterSpacing: 1.2, textTransform: "uppercase",
  display: "block", marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  background: "var(--bg-input)", border: "1px solid var(--border)",
  color: "var(--text)", fontSize: 13, fontWeight: 500,
  outline: "none", transition: "border-color 0.25s", boxSizing: "border-box",
};

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle}
        onFocus={e => e.target.style.borderColor = "rgba(212,168,67,0.4)"}
        onBlur={e => e.target.style.borderColor = "var(--border)"}
      />
    </div>
  );
}

function CotaBar({ label, usado, limite, unidade }: {
  label: string; usado: number; limite: number; unidade: string;
}) {
  const pct = limite > 0 ? Math.min((usado / limite) * 100, 100) : 0;
  const cor = pct >= 90 ? "var(--danger)" : pct >= 70 ? "var(--orange)" : "var(--gold)";
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>{label}</span>
        <span style={{ fontSize: 10, color: pct >= 90 ? "var(--danger)" : "var(--text-muted)", fontWeight: 600 }}>
          {usado}/{limite}{unidade ? ` ${unidade}` : ""}
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)" }}>
        <div style={{ height: 4, borderRadius: 2, background: cor, width: `${pct}%`, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}
