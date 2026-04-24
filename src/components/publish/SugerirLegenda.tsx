"use client";

import { useState } from "react";
import { Sparkles, Copy, Check, Loader2, X } from "lucide-react";

interface SugerirLegendaProps {
  destino: string;
  tipoArte: string;
  formato: string;
  nomeLoja?: string;
  onSelect: (legenda: string) => void;
  disabled?: boolean;
}

export default function SugerirLegenda({
  destino,
  tipoArte,
  formato,
  nomeLoja,
  onSelect,
  disabled,
}: SugerirLegendaProps) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [legendas, setLegendas] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tom, setTom] = useState<"animado" | "profissional" | "casual">("profissional");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  async function gerarLegendas() {
    if (!destino.trim()) return;

    setShowModal(true);
    setLoading(true);
    setError(null);
    setLegendas([]);

    try {
      const response = await fetch("/api/legenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destino,
          tipoArte,
          formato,
          nomeLoja,
          tom,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao gerar legendas");
      }

      const data = await response.json();
      setLegendas(data.legendas || []);
    } catch (err) {
      console.error("[SugerirLegenda] Erro:", err);
      setError(err instanceof Error ? err.message : "Erro ao gerar legendas");
    } finally {
      setLoading(false);
    }
  }

  function usarLegenda(legenda: string) {
    onSelect(legenda);
    setShowModal(false);
  }

  async function copiarLegenda(legenda: string, index: number) {
    try {
      await navigator.clipboard.writeText(legenda);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error("[SugerirLegenda] Erro ao copiar:", err);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={gerarLegendas}
        disabled={disabled || !destino.trim()}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all"
        style={{
          background: disabled || !destino.trim() ? "var(--bg2)" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: disabled || !destino.trim() ? "var(--txt3)" : "#fff",
          border: "1px solid",
          borderColor: disabled || !destino.trim() ? "var(--bdr)" : "transparent",
          cursor: disabled || !destino.trim() ? "not-allowed" : "pointer",
          opacity: disabled || !destino.trim() ? 0.5 : 1,
        }}
      >
        <Sparkles size={14} />
        Sugerir legenda
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0, 0, 0, 0.6)" }}
          onClick={() => !loading && setShowModal(false)}
        >
          <div
            className="relative rounded-2xl shadow-2xl max-w-2xl w-full mx-4"
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--bdr)",
              maxHeight: "90vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between p-5 border-b"
              style={{ borderColor: "var(--bdr)" }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
                >
                  <Sparkles size={20} color="#fff" />
                </div>
                <div>
                  <h3 className="text-base font-bold" style={{ color: "var(--txt)" }}>
                    Sugestões de Legenda com IA
                  </h3>
                  <p className="text-xs" style={{ color: "var(--txt3)" }}>
                    {destino}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="h-8 w-8 rounded-full flex items-center justify-center transition-colors"
                style={{
                  background: "transparent",
                  color: "var(--txt3)",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Tom selector */}
            {!loading && !error && legendas.length === 0 && (
              <div className="p-5 border-b" style={{ borderColor: "var(--bdr)" }}>
                <label className="text-xs font-semibold mb-2 block" style={{ color: "var(--txt2)" }}>
                  Tom da legenda:
                </label>
                <div className="flex gap-2">
                  {(["animado", "profissional", "casual"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTom(t)}
                      className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: tom === t ? "var(--brand-primary)" : "var(--bg2)",
                        color: tom === t ? "#fff" : "var(--txt2)",
                        border: "1px solid",
                        borderColor: tom === t ? "var(--brand-primary)" : "var(--bdr)",
                      }}
                    >
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Content */}
            <div className="p-5">
              {loading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="animate-spin mb-4" size={32} style={{ color: "var(--brand-primary)" }} />
                  <p className="text-sm" style={{ color: "var(--txt2)" }}>
                    Gerando legendas criativas...
                  </p>
                </div>
              )}

              {error && (
                <div
                  className="rounded-xl p-4 text-center"
                  style={{ background: "rgb(254, 242, 242)", border: "1px solid rgb(252, 165, 165)" }}
                >
                  <p className="text-sm font-medium" style={{ color: "rgb(127, 29, 29)" }}>
                    {error}
                  </p>
                </div>
              )}

              {!loading && !error && legendas.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm mb-4" style={{ color: "var(--txt3)" }}>
                    Clique em "Gerar" para criar 3 sugestões de legenda
                  </p>
                  <button
                    type="button"
                    onClick={gerarLegendas}
                    className="px-6 py-3 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "#fff",
                    }}
                  >
                    Gerar Legendas
                  </button>
                </div>
              )}

              {!loading && !error && legendas.length > 0 && (
                <div className="flex flex-col gap-3">
                  {legendas.map((legenda, index) => (
                    <div
                      key={index}
                      className="rounded-xl p-4 transition-all"
                      style={{
                        background: "var(--bg2)",
                        border: "1px solid var(--bdr)",
                      }}
                    >
                      <p className="text-sm mb-3" style={{ color: "var(--txt)", lineHeight: 1.6 }}>
                        {legenda}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => usarLegenda(legenda)}
                          className="flex-1 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
                          style={{
                            background: "var(--brand-primary)",
                            color: "#fff",
                          }}
                        >
                          Usar esta
                        </button>
                        <button
                          type="button"
                          onClick={() => copiarLegenda(legenda, index)}
                          className="px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2"
                          style={{
                            background: "var(--bg1)",
                            color: "var(--txt2)",
                            border: "1px solid var(--bdr)",
                          }}
                        >
                          {copiedIndex === index ? (
                            <>
                              <Check size={14} style={{ color: "var(--green)" }} />
                              Copiado
                            </>
                          ) : (
                            <>
                              <Copy size={14} />
                              Copiar
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={gerarLegendas}
                    className="mt-2 px-4 py-2 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: "var(--bg1)",
                      color: "var(--txt2)",
                      border: "1px solid var(--bdr)",
                    }}
                  >
                    Gerar novas sugestões
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
