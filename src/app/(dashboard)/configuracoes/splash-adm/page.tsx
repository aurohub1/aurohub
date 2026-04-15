"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { uploadToCloudinary } from "@/lib/cloudinary";
import SplashScreen, { type SplashEffect, type TextoEfeito } from "@/components/splash/SplashScreen";

const TEXTO_EFEITO_OPTIONS: { value: TextoEfeito; label: string }[] = [
  { value: "typewriter", label: "Typewriter (digitando)" },
  { value: "fadein", label: "Fade in" },
  { value: "slideup", label: "Slide up" },
  { value: "glitch", label: "Glitch" },
  { value: "reveal", label: "Reveal (cortina)" },
  { value: "blurtosharp", label: "Blur → Sharp" },
  { value: "scalein", label: "Scale in" },
];

type ConfigMap = Record<string, string>;

const EFFECT_OPTIONS: { value: SplashEffect; label: string }[] = [
  { value: "aurovista_adm", label: "✨ Aurovista ADM (exclusivo)" },
  { value: "particles", label: "Partículas" },
  { value: "cinematic", label: "Cinemático" },
  { value: "slideup", label: "Slide Up" },
  { value: "scalefade", label: "Scale Fade" },
  { value: "fadesuave", label: "Fade Suave" },
  { value: "ondas", label: "Ondas" },
  { value: "flutuacao", label: "Flutuação" },
  { value: "scanner", label: "Scanner" },
  { value: "holofote", label: "Holofote" },
  { value: "chuvapontos", label: "Chuva de Pontos" },
  { value: "gradiente", label: "Gradiente" },
  { value: "dissolve", label: "Dissolve" },
  { value: "bigbang", label: "Big Bang" },
  { value: "aurora", label: "Aurora Boreal" },
  { value: "tinta", label: "Tinta" },
  { value: "vagalumes", label: "Vagalumes" },
  { value: "aurora_espacial", label: "Aurora Espacial" },
  { value: "galaxia", label: "🌀 Galáxia" },
  { value: "vidro_janela", label: "🪟 Vidro Janela" },
  { value: "vidro_liquido", label: "💧 Vidro Líquido" },
];

/* ── Page ─────────────────────────────────────── */

export default function SplashAdmPage() {
  const [config, setConfig] = useState<ConfigMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "som" | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const somRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("system_config")
        .select("key, value")
        .like("key", "adm_splash_%");
      const map: ConfigMap = {};
      (data ?? []).forEach((r: { key: string; value: string }) => { map[r.key] = r.value; });
      setConfig(map);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = (k: string, v: string) => { setConfig((p) => ({ ...p, [k]: v })); setSaved(false); };
  const getNum = (k: string, def: number): number => {
    const v = Number(config[k]);
    return Number.isFinite(v) && v > 0 ? v : def;
  };

  async function save() {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(config)) {
        await supabase
          .from("system_config")
          .upsert({ key, value: value ?? "", updated_at: new Date().toISOString() }, { onConflict: "key" });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  async function uploadFile(file: File, folder: string, key: string, kind: "logo" | "som") {
    setUploading(kind);
    try {
      const url = await uploadToCloudinary(file, folder);
      set(key, url);
    } catch (err) {
      console.error("[SplashAdm] upload", err);
    } finally {
      setUploading(null);
    }
  }

  if (loading) return <div className="p-6 text-[13px] text-[var(--txt3)]">Carregando…</div>;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--bdr)] pb-4">
        <div className="flex items-center gap-3">
          <Link href="/configuracoes" className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--bdr)] text-[var(--txt2)] hover:bg-[var(--hover-bg)]">
            <ArrowLeft size={14} />
          </Link>
          <div>
            <h2 className="text-[20px] font-bold tracking-tight text-[var(--txt)]">Splash ADM</h2>
            <p className="mt-0.5 text-[12px] text-[var(--txt3)]">Animação exclusiva do login do ADM raiz. Salva em <code className="font-mono text-[11px]">system_config</code> (keys <code className="font-mono text-[11px]">adm_splash_*</code>).</p>
          </div>
        </div>
        <button onClick={save} disabled={saving} className="rounded-lg bg-[var(--txt)] px-5 py-2 text-[12px] font-semibold text-[var(--bg)] transition-opacity hover:opacity-90 disabled:opacity-60">
          {saving ? "Salvando…" : saved ? "Salvo!" : "Salvar alterações"}
        </button>
      </div>

      {/* Grid: preview + controls */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_1fr]">
        {/* Preview */}
        <div>
          <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-[var(--txt3)]">Preview ao vivo</label>
          <div className="overflow-hidden rounded-xl border border-[var(--bdr)]">
            <SplashScreen
              key={`adm-${JSON.stringify(config)}`}
              logoUrl={config.adm_splash_logo || ""}
              effect={(config.adm_splash_effect as SplashEffect) || "aurovista_adm"}
              cor1={config.adm_splash_cor1 || "#FF7A1A"}
              cor2={config.adm_splash_cor2 || "#D4A843"}
              cor3={config.adm_splash_cor3 || "#1E3A6E"}
              cor4={config.adm_splash_cor4 || "#3B82F6"}
              cor5={config.adm_splash_cor5 || "#F472B6"}
              corFundo={config.adm_splash_cor_fundo || "#0E1520"}
              velocidade={getNum("adm_splash_velocidade", 5)}
              quantidade={getNum("adm_splash_quantidade", 5)}
              tamanho={getNum("adm_splash_tamanho", 5)}
              raioOrbital={getNum("adm_splash_raio_orbital", 5)}
              nebulosa={getNum("adm_splash_nebulosa", 6)}
              opacidade={getNum("adm_splash_opacidade", 8)}
              dispersao={getNum("adm_splash_dispersao", 4)}
              velocidadeTexto={getNum("adm_splash_velocidade_texto", 5)}
              textoEfeito={(config.adm_splash_texto_efeito as TextoEfeito) || "typewriter"}
              userName="Duane"
              embedded={{ width: 420, height: 280 }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-5 rounded-xl border border-[var(--bdr)] p-5" style={{ background: "var(--card-bg)" }}>
          {/* Efeito */}
          <div>
            <Label>Efeito</Label>
            <select
              value={config.adm_splash_effect ?? "aurovista_adm"}
              onChange={(e) => set("adm_splash_effect", e.target.value)}
              className="h-9 w-full max-w-[320px] rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none"
            >
              {EFFECT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Cores — 5 quadrados clicáveis */}
          <div>
            <Label>Cores (clique o quadrado para abrir o picker)</Label>
            <div className="flex flex-wrap gap-3">
              <ColorSquare label="Cor 1" value={config.adm_splash_cor1 || "#FF7A1A"} onChange={(v) => set("adm_splash_cor1", v)} />
              <ColorSquare label="Cor 2" value={config.adm_splash_cor2 || "#D4A843"} onChange={(v) => set("adm_splash_cor2", v)} />
              <ColorSquare label="Cor 3" value={config.adm_splash_cor3 || "#1E3A6E"} onChange={(v) => set("adm_splash_cor3", v)} />
              <ColorSquare label="Cor 4" value={config.adm_splash_cor4 || "#3B82F6"} onChange={(v) => set("adm_splash_cor4", v)} />
              <ColorSquare label="Cor 5" value={config.adm_splash_cor5 || "#F472B6"} onChange={(v) => set("adm_splash_cor5", v)} />
              <ColorSquare label="Fundo" value={config.adm_splash_cor_fundo || "#0E1520"} onChange={(v) => set("adm_splash_cor_fundo", v)} />
            </div>
          </div>

          {/* 8 sliders */}
          <div className="grid grid-cols-2 gap-4">
            <Slider label="Velocidade" value={getNum("adm_splash_velocidade", 5)} onChange={(v) => set("adm_splash_velocidade", String(v))} />
            <Slider label="Quantidade (partículas)" value={getNum("adm_splash_quantidade", 5)} onChange={(v) => set("adm_splash_quantidade", String(v))} />
            <Slider label="Tamanho" value={getNum("adm_splash_tamanho", 5)} onChange={(v) => set("adm_splash_tamanho", String(v))} />
            <Slider label="Raio orbital" value={getNum("adm_splash_raio_orbital", 5)} onChange={(v) => set("adm_splash_raio_orbital", String(v))} />
            <Slider label="Nebulosa (pulso)" value={getNum("adm_splash_nebulosa", 6)} onChange={(v) => set("adm_splash_nebulosa", String(v))} min={0} />
            <Slider label="Opacidade geral" value={getNum("adm_splash_opacidade", 8)} onChange={(v) => set("adm_splash_opacidade", String(v))} />
            <Slider label="Dispersão" value={getNum("adm_splash_dispersao", 4)} onChange={(v) => set("adm_splash_dispersao", String(v))} min={0} />
            <Slider label="Velocidade do texto" value={getNum("adm_splash_velocidade_texto", 5)} onChange={(v) => set("adm_splash_velocidade_texto", String(v))} />
          </div>

          {/* Efeito do texto */}
          <div>
            <Label>Efeito do texto</Label>
            <select
              value={config.adm_splash_texto_efeito ?? "typewriter"}
              onChange={(e) => set("adm_splash_texto_efeito", e.target.value)}
              className="h-9 w-full max-w-[320px] rounded-lg border border-[var(--bdr)] bg-transparent px-3 text-[13px] text-[var(--txt)] outline-none"
            >
              {TEXTO_EFEITO_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Logo */}
          <div>
            <Label>Logo</Label>
            <div className="flex items-center gap-3">
              {config.adm_splash_logo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={config.adm_splash_logo} alt="Logo" className="h-12 w-12 rounded-lg border border-[var(--bdr)] bg-[var(--bg2)] object-contain" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--bg3)] text-[16px] font-bold text-[var(--txt2)]">A</div>
              )}
              <input ref={logoRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, "aurohubv2/splash", "adm_splash_logo", "logo"); }} className="hidden" />
              <button onClick={() => logoRef.current?.click()} disabled={uploading === "logo"} className="rounded-lg border border-[var(--bdr)] px-3 py-1.5 text-[12px] font-medium text-[var(--txt2)] hover:text-[var(--txt)] disabled:opacity-50">
                {uploading === "logo" ? "Enviando…" : "Upload logo"}
              </button>
              <input type="text" value={config.adm_splash_logo ?? ""} onChange={(e) => set("adm_splash_logo", e.target.value)} placeholder="ou cole URL" className="h-8 flex-1 rounded border border-[var(--bdr)] bg-transparent px-2 text-[11px] text-[var(--txt)] outline-none" />
            </div>
          </div>

          {/* Som */}
          <div>
            <Label>Som do splash</Label>
            <div className="flex items-center gap-3">
              {config.adm_splash_som ? (
                <audio src={config.adm_splash_som} controls className="h-10" />
              ) : (
                <div className="flex h-10 items-center justify-center rounded-lg bg-[var(--bg2)] px-3 text-[11px] text-[var(--txt3)]">Sem som</div>
              )}
              <input ref={somRef} type="file" accept="audio/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f, "aurohubv2/splash-som", "adm_splash_som", "som"); }} className="hidden" />
              <button onClick={() => somRef.current?.click()} disabled={uploading === "som"} className="rounded-lg border border-[var(--bdr)] px-3 py-1.5 text-[12px] font-medium text-[var(--txt2)] hover:text-[var(--txt)] disabled:opacity-50">
                {uploading === "som" ? "Enviando…" : "Upload som"}
              </button>
              {config.adm_splash_som && (
                <button onClick={() => set("adm_splash_som", "")} className="text-[11px] text-[var(--red)] hover:underline">Remover</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Sub-components ─────────────────────────────── */

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-[11px] font-medium text-[var(--txt3)]">{children}</label>;
}

function Slider({ label, value, onChange, min = 1, max = 10 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="text-[var(--txt3)]">{label}</span>
        <span className="font-mono text-[var(--txt2)]">{value}</span>
      </div>
      <input type="range" min={min} max={max} step="1" value={value} onChange={(e) => onChange(parseInt(e.target.value))} className="w-full accent-[var(--orange)]" />
    </div>
  );
}

function ColorSquare({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex cursor-pointer flex-col items-center gap-1.5">
      <div className="relative h-11 w-11 overflow-hidden rounded-lg border border-[var(--bdr)] shadow-inner" style={{ background: value }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
      </div>
      <span className="text-[10px] font-medium text-[var(--txt3)]">{label}</span>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="h-6 w-20 rounded border border-[var(--bdr)] bg-transparent px-1.5 text-center font-mono text-[10px] text-[var(--txt2)] outline-none" />
    </label>
  );
}
