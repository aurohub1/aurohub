"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sparkles, ArrowLeft, ArrowRight, X, Check } from "lucide-react";

/* ── Tipos ───────────────────────────────────────── */

export interface TourStep {
  title: string;
  description: string;
  /** Seletor CSS do elemento a destacar. Se omitido, mostra card centralizado. */
  targetSelector?: string;
}

type TourRole = "vendedor" | "cliente" | "unidade";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/* ── Steps por role ──────────────────────────────── */

const VENDEDOR_STEPS: TourStep[] = [
  {
    title: "Bem-vindo ao Aurohub!",
    description: "Seu parceiro de vendas no dia a dia. Vou te guiar rapidamente pelas funcionalidades principais.",
  },
  {
    title: "Publicar",
    description: "Aqui você cria e publica suas artes. Escolha um template, preencha os dados e publique no Instagram com um clique.",
    targetSelector: 'a[href="/vendedor/publicar"]',
  },
  {
    title: "Calendário",
    description: "Acompanhe feriados e datas importantes para o turismo. Planeje suas campanhas com antecedência.",
    targetSelector: 'a[href="/vendedor/calendario"]',
  },
  {
    title: "Lembretes",
    description: "Anote lembretes de clientes para não perder nenhuma venda. Marque follow-ups e combine com o calendário.",
    targetSelector: 'a[href="/vendedor/lembretes"]',
  },
  {
    title: "Seu painel",
    description: "O dashboard mostra tudo que você precisa saber hoje: atividades, metas e próximos lembretes.",
    targetSelector: 'a[href="/vendedor/inicio"]',
  },
];

const CLIENTE_STEPS: TourStep[] = [
  {
    title: "Bem-vindo à sua central!",
    description: "Aqui você controla tudo do seu negócio no Aurohub. Vou te mostrar os pontos principais.",
  },
  {
    title: "Templates",
    description: "Acesse os modelos de artes criados para a sua agência. É a biblioteca usada pelas unidades e consultores.",
    targetSelector: 'a[href="/cliente/templates"]',
  },
  {
    title: "Unidades",
    description: "Gerencie suas filiais. Cadastre novas lojas, atualize cidade e Instagram, veja os consultores vinculados.",
    targetSelector: 'a[href="/cliente/unidades"]',
  },
  {
    title: "Usuários",
    description: "Controle quem tem acesso ao sistema. Crie gerentes de unidade e consultores dentro do limite do seu plano.",
    targetSelector: 'a[href="/cliente/usuarios"]',
  },
];

const UNIDADE_STEPS: TourStep[] = [
  {
    title: "Bem-vindo à sua unidade!",
    description: "Esta é a central da sua loja. Daqui você publica, cuida da equipe e acompanha os templates liberados.",
  },
  {
    title: "Publicar",
    description: "Crie e publique artes no Instagram da unidade. Basta escolher um template, preencher e enviar.",
    targetSelector: 'a[href="/unidade/publicar"]',
  },
  {
    title: "Consultores",
    description: "Gerencie sua equipe: crie consultores, acompanhe posts do dia e ative/desative acessos.",
    targetSelector: 'a[href="/unidade/vendedores"]',
  },
  {
    title: "Templates",
    description: "Veja os modelos disponíveis para a sua unidade — criados pelo administrador para o seu cliente.",
    targetSelector: 'a[href="/unidade/templates"]',
  },
];

const STEPS_BY_ROLE: Record<TourRole, TourStep[]> = {
  vendedor: VENDEDOR_STEPS,
  cliente:  CLIENTE_STEPS,
  unidade:  UNIDADE_STEPS,
};

/* ── Storage ─────────────────────────────────────── */

export function tourDoneKey(role: TourRole): string {
  return `ah_tour_${role}_done`;
}

/** Marca manualmente o tour como concluído (ex.: logout / reset). */
export function setTourDone(role: TourRole, done: boolean) {
  if (done) localStorage.setItem(tourDoneKey(role), "1");
  else localStorage.removeItem(tourDoneKey(role));
}

/* ── Componente ──────────────────────────────────── */

export default function WelcomeTour({ role }: { role: TourRole }) {
  const steps = useMemo(() => STEPS_BY_ROLE[role] ?? [], [role]);
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  // Detecta primeira visita
  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem(tourDoneKey(role));
    if (!done) {
      // Pequeno delay pra sidebar renderizar antes
      const t = setTimeout(() => setOpen(true), 450);
      return () => clearTimeout(t);
    }
  }, [role]);

  const currentStep = steps[idx];

  // Calcula bounding rect do target
  const updateRect = useCallback(() => {
    if (!currentStep?.targetSelector) { setRect(null); return; }
    const el = document.querySelector(currentStep.targetSelector) as HTMLElement | null;
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [currentStep]);

  useEffect(() => {
    if (!open) return;
    updateRect();
    const onResize = () => updateRect();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    // Re-check após pequeno delay (DOM pode estar montando)
    const t = setTimeout(updateRect, 150);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
      clearTimeout(t);
    };
  }, [open, updateRect]);

  function next() {
    if (idx < steps.length - 1) setIdx(idx + 1);
    else finish();
  }

  function prev() {
    if (idx > 0) setIdx(idx - 1);
  }

  function finish() {
    setTourDone(role, true);
    setOpen(false);
  }

  if (!open || !currentStep) return null;

  // Posicionamento do card
  const sidebarWidth = 220;
  const cardWidth = 340;
  const gap = 20;

  let cardStyle: React.CSSProperties;
  if (rect) {
    // Card à direita do spotlight, alinhado ao topo
    const left = Math.min(rect.left + rect.width + gap, window.innerWidth - cardWidth - 20);
    const top = Math.max(16, Math.min(rect.top, window.innerHeight - 260));
    cardStyle = { top, left, width: cardWidth };
  } else {
    // Centralizado (steps intro/sem target)
    cardStyle = {
      top: "50%",
      left: `calc(50% + ${sidebarWidth / 2}px)`,
      transform: "translate(-50%, -50%)",
      width: cardWidth,
    };
  }

  const isFirst = idx === 0;
  const isLast = idx === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[9500]">
      {/* Overlay com spotlight */}
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-xl border-2 border-[#FF7A1A] transition-all duration-300"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgba(6, 11, 22, 0.78), 0 0 24px rgba(255, 122, 26, 0.55)",
          }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: "rgba(6, 11, 22, 0.78)" }} />
      )}

      {/* Botão Pular */}
      <button
        onClick={finish}
        className="absolute right-5 top-5 z-10 flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/40 px-3 py-1.5 text-[11px] font-semibold text-white/80 backdrop-blur-sm transition-colors hover:border-white/40 hover:text-white"
      >
        <X size={12} /> Pular tour
      </button>

      {/* Card de instrução */}
      <div
        className="absolute z-10 flex flex-col gap-3 rounded-2xl border border-white/15 bg-[#0B1220] p-5 shadow-2xl"
        style={{ ...cardStyle, boxShadow: "0 24px 60px -10px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,122,26,0.18)" }}
      >
        {/* Eyebrow */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#FF7A1A]"
              style={{
                background: "linear-gradient(135deg, rgba(255,122,26,0.22), rgba(30,58,110,0.14))",
                border: "1px solid rgba(255,122,26,0.3)",
              }}
            >
              <Sparkles size={13} />
            </div>
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#FF7A1A]">
              Passo {idx + 1} de {steps.length}
            </span>
          </div>
          {/* Progress dots */}
          <div className="flex items-center gap-1">
            {steps.map((_, i) => (
              <span
                key={i}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === idx ? 18 : 6,
                  background: i <= idx ? "#FF7A1A" : "rgba(255,255,255,0.22)",
                }}
              />
            ))}
          </div>
        </div>

        {/* Título + descrição */}
        <div>
          <h3 className="font-[family-name:var(--font-dm-serif)] text-[20px] font-bold leading-tight text-white">
            {currentStep.title}
          </h3>
          <p className="mt-1.5 text-[12px] leading-relaxed text-white/70">
            {currentStep.description}
          </p>
        </div>

        {/* Botões */}
        <div className="mt-1 flex items-center justify-between gap-2">
          <button
            onClick={prev}
            disabled={isFirst}
            className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-[11px] font-semibold text-white/70 transition-colors hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-white/15 disabled:hover:text-white/70"
          >
            <ArrowLeft size={12} /> Anterior
          </button>
          <button
            onClick={next}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-[11px] font-bold text-white shadow-lg transition-transform hover:scale-[1.03]"
            style={{ background: "linear-gradient(135deg, #FF7A1A, #D4A843)" }}
          >
            {isLast ? (<><Check size={12} /> Entendi!</>) : (<>Próximo <ArrowRight size={12} /></>)}
          </button>
        </div>
      </div>
    </div>
  );
}
