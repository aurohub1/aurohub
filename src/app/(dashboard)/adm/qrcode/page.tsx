"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, RotateCcw } from "lucide-react";

type ErrorLevel = "L" | "M" | "Q" | "H";

const LEVEL_DESC: Record<ErrorLevel, string> = {
  L: "Baixa (~7%)",
  M: "Média (~15%)",
  Q: "Quartil (~25%)",
  H: "Alta (~30%)",
};

export default function QrCodePage() {
  const [text, setText] = useState("https://aurovista.com.br");
  const [dark, setDark] = useState("#000000");
  const [light, setLight] = useState("#FFFFFF");
  const [transparent, setTransparent] = useState(false);
  const [size, setSize] = useState(320);
  const [margin, setMargin] = useState(2);
  const [level, setLevel] = useState<ErrorLevel>("M");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generate = useCallback(async () => {
    if (!text.trim()) {
      setPreviewUrl("");
      return;
    }
    try {
      const url = await QRCode.toDataURL(text, {
        errorCorrectionLevel: level,
        margin,
        width: size,
        color: {
          dark,
          light: transparent ? "#0000" : light,
        },
      });
      setPreviewUrl(url);
    } catch (err) {
      console.error("[QRCode]", err);
      setPreviewUrl("");
    }
  }, [text, dark, light, transparent, size, margin, level]);

  useEffect(() => {
    generate();
  }, [generate]);

  async function downloadPng() {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = `qrcode-${Date.now()}.png`;
    a.click();
  }

  async function downloadSvg() {
    if (!text.trim()) return;
    try {
      const svg = await QRCode.toString(text, {
        type: "svg",
        errorCorrectionLevel: level,
        margin,
        width: size,
        color: {
          dark,
          light: transparent ? "#0000" : light,
        },
      });
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qrcode-${Date.now()}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[QRCode SVG]", err);
    }
  }

  function reset() {
    setText("https://aurovista.com.br");
    setDark("#000000");
    setLight("#FFFFFF");
    setTransparent(false);
    setSize(320);
    setMargin(2);
    setLevel("M");
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-end justify-between pb-4" style={{ borderBottom: "1px solid var(--bdr)" }}>
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--txt)" }}>Gerador de QR Code</h2>
          <p className="mt-0.5 text-sm" style={{ color: "var(--txt2)" }}>
            Gere QR codes personalizados — escolha cores, tamanho e nível de correção. Baixe em PNG ou SVG.
          </p>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-semibold"
          style={{ background: "var(--bg2)", color: "var(--txt2)", border: "1px solid var(--bdr)" }}
        >
          <RotateCcw size={13} /> Resetar
        </button>
      </div>

      {/* Conteúdo */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Preview */}
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--bdr)] p-6"
          style={{ background: "var(--bg1)", minHeight: 480 }}>
          {previewUrl ? (
            <>
              <div className="rounded-xl p-4"
                style={{
                  background: transparent
                    ? "repeating-conic-gradient(var(--bdr) 0% 25%, transparent 0% 50%) 0 0/16px 16px"
                    : "transparent",
                }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="QR Code preview"
                  style={{ width: size, height: size, display: "block" }}
                />
              </div>
              <div className="mt-4 text-[11px] tabular-nums" style={{ color: "var(--txt3)" }}>
                {size}×{size}px • Correção {level} ({LEVEL_DESC[level]})
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={downloadPng}
                  className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[12px] font-semibold text-white shadow-lg"
                  style={{ background: "linear-gradient(135deg, var(--orange), #D4A843)" }}
                >
                  <Download size={14} /> PNG
                </button>
                <button
                  onClick={downloadSvg}
                  className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[12px] font-semibold"
                  style={{ background: "var(--bg2)", color: "var(--txt)", border: "1px solid var(--bdr)" }}
                >
                  <Download size={14} /> SVG
                </button>
              </div>
            </>
          ) : (
            <div className="text-center" style={{ color: "var(--txt3)" }}>
              <div className="text-[14px] font-semibold">Sem conteúdo</div>
              <div className="mt-1 text-[12px]">Digite uma URL ou texto à direita para gerar o QR code.</div>
            </div>
          )}
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </div>

        {/* Configurações */}
        <div className="flex flex-col gap-4 rounded-2xl border border-[var(--bdr)] p-5"
          style={{ background: "var(--bg1)" }}>
          {/* URL/texto */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--txt3)" }}>
              URL ou texto
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="https://exemplo.com"
              rows={3}
              className="rounded-lg border border-[var(--bdr)] px-3 py-2 text-[12px] outline-none focus:border-[var(--orange)] resize-y"
              style={{ background: "var(--bg2)", color: "var(--txt)", minHeight: 60 }}
            />
          </div>

          {/* Cores */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--txt3)" }}>
                Cor do QR
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={dark}
                  onChange={(e) => setDark(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-lg border border-[var(--bdr)] bg-transparent"
                />
                <input
                  type="text"
                  value={dark}
                  onChange={(e) => setDark(e.target.value)}
                  className="flex-1 rounded-lg border border-[var(--bdr)] px-2 py-2 text-[11px] outline-none focus:border-[var(--orange)] tabular-nums"
                  style={{ background: "var(--bg2)", color: "var(--txt)" }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--txt3)" }}>
                Cor do fundo
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={light}
                  onChange={(e) => setLight(e.target.value)}
                  disabled={transparent}
                  className="h-9 w-12 cursor-pointer rounded-lg border border-[var(--bdr)] bg-transparent disabled:opacity-40"
                />
                <input
                  type="text"
                  value={light}
                  onChange={(e) => setLight(e.target.value)}
                  disabled={transparent}
                  className="flex-1 rounded-lg border border-[var(--bdr)] px-2 py-2 text-[11px] outline-none focus:border-[var(--orange)] tabular-nums disabled:opacity-40"
                  style={{ background: "var(--bg2)", color: "var(--txt)" }}
                />
              </div>
            </div>
          </div>

          {/* Transparente */}
          <label className="flex items-center gap-2 cursor-pointer" style={{ color: "var(--txt2)" }}>
            <input
              type="checkbox"
              checked={transparent}
              onChange={(e) => setTransparent(e.target.checked)}
              className="h-4 w-4 cursor-pointer"
              style={{ accentColor: "var(--orange)" }}
            />
            <span className="text-[12px]">Fundo transparente</span>
          </label>

          {/* Tamanho */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--txt3)" }}>
                Tamanho
              </label>
              <span className="text-[11px] tabular-nums" style={{ color: "var(--txt2)" }}>{size}px</span>
            </div>
            <input
              type="range"
              min={128}
              max={512}
              step={16}
              value={size}
              onChange={(e) => setSize(+e.target.value)}
              className="w-full cursor-pointer"
              style={{ accentColor: "var(--orange)" }}
            />
          </div>

          {/* Margem */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--txt3)" }}>
                Margem
              </label>
              <span className="text-[11px] tabular-nums" style={{ color: "var(--txt2)" }}>{margin}</span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              step={1}
              value={margin}
              onChange={(e) => setMargin(+e.target.value)}
              className="w-full cursor-pointer"
              style={{ accentColor: "var(--orange)" }}
            />
          </div>

          {/* Correção de erro */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--txt3)" }}>
              Correção de erro
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(["L", "M", "Q", "H"] as const).map(lvl => {
                const active = level === lvl;
                return (
                  <button
                    key={lvl}
                    onClick={() => setLevel(lvl)}
                    title={LEVEL_DESC[lvl]}
                    className="rounded-lg py-2 text-[12px] font-bold"
                    style={active
                      ? { background: "var(--orange)", color: "#fff" }
                      : { background: "var(--bg2)", color: "var(--txt2)", border: "1px solid var(--bdr)" }}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] mt-1" style={{ color: "var(--txt3)" }}>
              {LEVEL_DESC[level]} — níveis maiores deixam o QR mais resistente a danos, mas geram códigos maiores.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
