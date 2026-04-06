"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErro(data.error || "Erro ao fazer login");
        return;
      }

      router.push("/dashboard");
    } catch {
      setErro("Erro de conexão");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, background: "linear-gradient(135deg, #0E1520 0%, #151E2D 50%, #1A2436 100%)",
    }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <h1 style={{
            fontSize: 36, fontWeight: 800, margin: 0, letterSpacing: -1,
            background: "linear-gradient(135deg, #D4A843 0%, #FF7A1A 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>Aurohub</h1>
          <p style={{ fontSize: 13, color: "#4E6585", marginTop: 8 }}>
            Plataforma de Conteúdo para Instagram
          </p>
        </div>

        {/* Card */}
        <div style={{
          padding: 28, borderRadius: 20,
          background: "rgba(16,28,52,0.65)", border: "1px solid rgba(60,100,170,0.12)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(59,130,246,0.04)",
          backdropFilter: "blur(20px)",
        }}>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{
                display: "block", fontSize: 11, fontWeight: 600, color: "#8DA2C0",
                letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8,
              }}>E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: 12,
                  background: "rgba(16,28,52,0.5)", border: "1px solid rgba(60,100,170,0.12)",
                  color: "#F0F4FA", fontSize: 14, outline: "none",
                  transition: "border-color 0.25s",
                  boxSizing: "border-box",
                }}
                onFocus={e => e.target.style.borderColor = "rgba(212,168,67,0.4)"}
                onBlur={e => e.target.style.borderColor = "rgba(60,100,170,0.12)"}
              />
            </div>

            <div>
              <label style={{
                display: "block", fontSize: 11, fontWeight: 600, color: "#8DA2C0",
                letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 8,
              }}>Senha</label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: 12,
                  background: "rgba(16,28,52,0.5)", border: "1px solid rgba(60,100,170,0.12)",
                  color: "#F0F4FA", fontSize: 14, outline: "none",
                  transition: "border-color 0.25s",
                  boxSizing: "border-box",
                }}
                onFocus={e => e.target.style.borderColor = "rgba(212,168,67,0.4)"}
                onBlur={e => e.target.style.borderColor = "rgba(60,100,170,0.12)"}
              />
            </div>

            {erro && (
              <p style={{
                fontSize: 12, color: "#FC8181", margin: 0,
                padding: "8px 12px", borderRadius: 8, background: "rgba(252,129,129,0.1)",
              }}>{erro}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
                background: "linear-gradient(135deg, #D4A843, #FF7A1A)",
                color: "#0B1120", fontSize: 14, fontWeight: 700, cursor: loading ? "wait" : "pointer",
                boxShadow: "0 4px 20px rgba(212,168,67,0.3)",
                opacity: loading ? 0.7 : 1, transition: "all 0.25s",
              }}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "#4E6585", marginTop: 24 }}>
          Aurohub v2 — Aurovista
        </p>
      </div>
    </div>
  );
}
