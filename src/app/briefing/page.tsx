"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

/* ── Types ─────────────────────────────────────────── */

interface Msg { role: "user" | "assistant"; content: string; }

interface BriefingData {
  id: string;
  token: string;
  status: string;
  messages: Msg[];
  summary: Record<string, unknown> | null;
  consent_accepted_at: string | null;
}

type Screen = "loading" | "not_found" | "consent" | "chat" | "summary" | "done";

/* ── Summary display ───────────────────────────────── */

const SUMMARY_LABELS: Record<string, string> = {
  empresa: "Empresa", cidade: "Cidade", segmento: "Segmento",
  estrutura: "Estrutura", cores: "Cores", logo_descricao: "Logo",
  formatos: "Formatos", estilo_visual: "Estilo Visual",
  produtos_servicos: "Produtos/Serviços", forma_apresentar_preco: "Apresentação de Preço",
  redes_sociais: "Redes Sociais", observacoes: "Observações",
};

function SummaryCard({ summary }: { summary: Record<string, unknown> }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "20px 20px", fontSize: 13 }}>
      {Object.entries(SUMMARY_LABELS).map(([key, label]) => {
        const val = summary[key];
        if (!val || (Array.isArray(val) && val.length === 0)) return null;
        const display = Array.isArray(val) ? (val as string[]).join(", ") : String(val);
        return (
          <div key={key} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-start" }}>
            <span style={{ color: "#6b7fa8", minWidth: 140, flexShrink: 0, fontSize: 12 }}>{label}</span>
            <span style={{ color: "#e2e8f0", lineHeight: 1.5 }}>{display}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Chat bubble ───────────────────────────────────── */

function Bubble({ msg }: { msg: Msg }) {
  const isAI = msg.role === "assistant";
  return (
    <div style={{ display: "flex", justifyContent: isAI ? "flex-start" : "flex-end", marginBottom: 12 }}>
      {isAI && (
        <div style={{
          width: 32, height: 32, borderRadius: "50%", background: "#1A56C4",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0, marginRight: 8, alignSelf: "flex-end",
        }}>A</div>
      )}
      <div style={{
        maxWidth: "76%", padding: "10px 14px", borderRadius: isAI ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
        background: isAI ? "rgba(26,86,196,0.18)" : "rgba(255,255,255,0.1)",
        border: `1px solid ${isAI ? "rgba(26,86,196,0.3)" : "rgba(255,255,255,0.12)"}`,
        fontSize: 14, lineHeight: 1.6, color: "#e2e8f0", whiteSpace: "pre-wrap",
      }}>
        {msg.content}
      </div>
    </div>
  );
}

/* ── Main component (inner) ────────────────────────── */

function BriefingInner() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [screen, setScreen] = useState<Screen>("loading");
  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [savingConsent, setSavingConsent] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [completing, setCompleting] = useState(false);
  const [correcting, setCorreting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load briefing by token
  useEffect(() => {
    if (!token) { setScreen("not_found"); return; }
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/briefings?token=eq.${encodeURIComponent(token)}&select=id,token,status,messages,summary,consent_accepted_at`, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
      },
    })
      .then((r) => r.json())
      .then((rows: BriefingData[]) => {
        if (!rows?.length) { setScreen("not_found"); return; }
        const b = rows[0];
        setBriefing(b);
        if (b.status === "completed") { setScreen("done"); return; }
        if (b.summary && Object.keys(b.summary).length > 0) setSummary(b.summary);
        if (b.messages?.length) {
          setMessages(b.messages);
          setScreen(b.status === "summary_ready" ? "summary" : "chat");
        } else if (b.consent_accepted_at) {
          setScreen("chat");
          startChat([]);
        } else {
          setScreen("consent");
        }
      })
      .catch(() => setScreen("not_found"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  async function handleConsent() {
    if (!accepted || !briefing) return;
    setSavingConsent(true);
    const ip = await fetch("https://api.ipify.org?format=json").then(r => r.json()).then((d: {ip:string}) => d.ip).catch(() => "unknown");
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/briefings?id=eq.${briefing.id}`, {
      method: "PATCH",
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ consent_accepted_at: new Date().toISOString(), consent_ip: ip }),
    });
    setSavingConsent(false);
    setScreen("chat");
    startChat([]);
  }

  async function startChat(history: Msg[]) {
    setTyping(true);
    const res = await fetch("/api/briefing/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, start: true, messages: history }),
    });
    const data = await res.json() as { reply: string; status: string; summary?: Record<string, unknown> };
    setTyping(false);
    const aiMsg: Msg = { role: "assistant", content: data.reply };
    setMessages([aiMsg]);
    if (data.summary) { setSummary(data.summary); setScreen("summary"); }
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || typing) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setTyping(true);

    const res = await fetch("/api/briefing/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, message: text, messages }),
    });
    const data = await res.json() as { reply: string; status: string; summary?: Record<string, unknown> };
    setTyping(false);
    const aiMsg: Msg = { role: "assistant", content: data.reply };
    setMessages([...updated, aiMsg]);
    if (data.summary) {
      setSummary(data.summary);
      setScreen("summary");
    }
  }

  async function handleComplete() {
    setCompleting(true);
    await fetch("/api/briefing/complete", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    setCompleting(false);
    window.location.href = "/briefing/concluido";
  }

  async function handleCorrect() {
    setCorreting(true);
    setScreen("chat");
    const corrMsg: Msg = { role: "user", content: "Quero corrigir algumas informações." };
    const updated = [...messages, corrMsg];
    setMessages(updated);
    setTyping(true);
    const res = await fetch("/api/briefing/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, message: "Quero corrigir algumas informações.", messages }),
    });
    const data = await res.json() as { reply: string; status: string };
    setTyping(false);
    setMessages([...updated, { role: "assistant", content: data.reply }]);
    setCorreting(false);
  }

  /* ── Layout shell ───────────────────────────────── */
  return (
    <div style={{
      minHeight: "100dvh", background: "#060D1A", color: "#e2e8f0",
      fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.02)",
      }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "#1A56C4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800 }}>A</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Briefing Aurovista</div>
          <div style={{ fontSize: 11, color: "#6b7fa8" }}>Configuração da sua conta</div>
        </div>
      </div>

      {/* ── LOADING ─────────────────────────────────── */}
      {screen === "loading" && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 36, height: 36, border: "3px solid rgba(26,86,196,0.3)", borderTopColor: "#1A56C4", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* ── NOT FOUND ───────────────────────────────── */}
      {screen === "not_found" && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Link inválido</h2>
            <p style={{ color: "#6b7fa8", fontSize: 14 }}>Este link de briefing não existe ou expirou.</p>
          </div>
        </div>
      )}

      {/* ── DONE ────────────────────────────────────── */}
      {screen === "done" && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Briefing concluído</h2>
            <p style={{ color: "#6b7fa8", fontSize: 14, marginBottom: 24 }}>Suas informações já foram enviadas à equipe Aurovista.</p>
            <a href="/login" style={{ display: "inline-block", padding: "12px 28px", borderRadius: 10, background: "#1A56C4", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>Acessar minha conta</a>
          </div>
        </div>
      )}

      {/* ── CONSENT ─────────────────────────────────── */}
      {screen === "consent" && (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 480, width: "100%" }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Antes de começar</h1>
            <div style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 14, padding: "20px 22px", marginBottom: 28, fontSize: 14, lineHeight: 1.7, color: "#94a3b8",
            }}>
              As informações coletadas nesta conversa são utilizadas exclusivamente pela equipe Aurovista para configurar sua conta e criar seus templates. Seus dados não serão compartilhados com terceiros, conforme a <strong style={{ color: "#e2e8f0" }}>Cláusula 13</strong> do seu contrato.
            </div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer", marginBottom: 32 }}>
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                style={{ accentColor: "#1A56C4", width: 18, height: 18, marginTop: 2, flexShrink: 0 }}
              />
              <span style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.5 }}>
                Estou ciente e autorizo a Aurovista a utilizar as informações fornecidas neste briefing para fins de implantação da minha conta.
              </span>
            </label>
            <button
              onClick={handleConsent}
              disabled={!accepted || savingConsent}
              style={{
                width: "100%", padding: "14px", borderRadius: 12, border: "none",
                background: accepted ? "#1A56C4" : "rgba(255,255,255,0.06)",
                color: accepted ? "#fff" : "#4a5a78",
                fontSize: 15, fontWeight: 700, cursor: accepted ? "pointer" : "not-allowed",
              }}
            >
              {savingConsent ? "Aguarde..." : "Iniciar briefing →"}
            </button>
          </div>
        </div>
      )}

      {/* ── CHAT ────────────────────────────────────── */}
      {screen === "chat" && (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
            {messages.map((m, i) => <Bubble key={i} msg={m} />)}
            {typing && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#1A56C4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff", flexShrink: 0 }}>A</div>
                <div style={{ display: "flex", gap: 4, padding: "10px 14px", background: "rgba(26,86,196,0.18)", border: "1px solid rgba(26,86,196,0.3)", borderRadius: "4px 16px 16px 16px" }}>
                  {[0, 1, 2].map((i) => (
                    <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#94a3b8", animation: `bounce .8s ${i * 0.15}s ease-in-out infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 10, background: "rgba(255,255,255,0.02)" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Digite sua resposta..."
              disabled={typing}
              style={{
                flex: 1, height: 46, padding: "0 16px", borderRadius: 12,
                border: "1.5px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)",
                color: "#e2e8f0", fontSize: 14, outline: "none",
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || typing}
              style={{
                width: 46, height: 46, borderRadius: 12, background: input.trim() && !typing ? "#1A56C4" : "rgba(255,255,255,0.06)",
                border: "none", cursor: input.trim() && !typing ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
            >
              <svg viewBox="0 0 20 20" fill="none" style={{ width: 18, height: 18 }}>
                <path d="M3 10l14-7-7 14V10H3z" stroke={input.trim() && !typing ? "#fff" : "#4a5a78"} strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <style>{`@keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}`}</style>
        </>
      )}

      {/* ── SUMMARY ─────────────────────────────────── */}
      {screen === "summary" && summary && (
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 16px" }}>
          <div style={{ maxWidth: 560, margin: "0 auto" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Resumo do seu briefing</h2>
            <p style={{ color: "#6b7fa8", fontSize: 14, marginBottom: 24 }}>
              Confira as informações coletadas. Se estiver correto, confirme para enviar.
            </p>
            <SummaryCard summary={summary} />
            <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
              <button
                onClick={handleCorrect}
                disabled={correcting}
                style={{
                  flex: 1, padding: "13px", borderRadius: 12, border: "1.5px solid rgba(255,255,255,0.15)",
                  background: "transparent", color: "#94a3b8", fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}
              >
                Corrigir algo
              </button>
              <button
                onClick={handleComplete}
                disabled={completing}
                style={{
                  flex: 2, padding: "13px", borderRadius: 12, border: "none",
                  background: "#1A56C4", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
                }}
              >
                {completing ? "Enviando..." : "Confirmar e enviar ✓"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Export with Suspense (required for useSearchParams) ── */

export default function BriefingPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100dvh", background: "#060D1A", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 36, height: 36, border: "3px solid rgba(26,86,196,0.3)", borderTopColor: "#1A56C4", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <BriefingInner />
    </Suspense>
  );
}
