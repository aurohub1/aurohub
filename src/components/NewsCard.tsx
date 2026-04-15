'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Newspaper } from 'lucide-react';

interface News {
  title: string;
  image?: string | null;
  source?: string;
  url: string;
  id?: string;
}

const BRAND_GRADIENT = 'linear-gradient(135deg, #1E3A6E 0%, #3B82F6 50%, #1E3A6E 100%)';

export function NewsCard({ news, loading }: { news: News[]; loading?: boolean; height?: number }) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const total = news.length;
  const canNavigate = total > 1;

  useEffect(() => {
    if (!canNavigate || paused) return;
    const t = setTimeout(() => setCurrent((c) => (c + 1) % total), 6000);
    return () => clearTimeout(t);
  }, [current, total, canNavigate, paused]);

  /* ── Loading skeleton — h fixa ───────────────── */
  if (loading && !total) {
    return (
      <div className="relative aspect-[4/3] max-h-[280px] w-full overflow-hidden rounded-xl bg-[var(--bg2)] shadow-lg">
        <div className="absolute inset-0 animate-pulse bg-[var(--bg3)]" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4">
          <div className="h-4 w-20 rounded-full bg-[var(--bg2)]/60" />
          <div className="h-4 w-3/4 rounded bg-[var(--bg2)]/60" />
          <div className="h-4 w-1/2 rounded bg-[var(--bg2)]/60" />
        </div>
      </div>
    );
  }

  /* ── Empty state — h fixa ────────────────────── */
  if (!total) {
    return (
      <div className="relative aspect-[4/3] max-h-[280px] w-full overflow-hidden rounded-xl shadow-lg">
        <div className="absolute inset-0" style={{ background: BRAND_GRADIENT }} />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.35) 100%)' }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.14)',
              border: '1px solid rgba(255,255,255,0.22)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            <Newspaper size={22} className="text-white" />
          </div>
          <div className="text-[13px] font-semibold text-white drop-shadow-sm">Nenhuma notícia disponível</div>
          <div className="text-[11px] text-white/75">As notícias do setor aparecem aqui quando disponíveis.</div>
        </div>
      </div>
    );
  }

  const item = news[current];
  const go = (n: number) => setCurrent(((n % total) + total) % total);

  return (
    <div
      className="group relative aspect-[4/3] max-h-[280px] w-full overflow-hidden rounded-xl shadow-lg"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <style>{`
        @keyframes nc-fade {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes nc-fade-img {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* Base camada — imagem OU gradiente de fallback (sempre ocupa 100% do card) */}
      {item.image ? (
        <Image
          key={`img-${current}`}
          src={item.image}
          alt={item.title}
          fill
          className="object-cover"
          style={{ animation: 'nc-fade-img 0.5s ease-out' }}
          unoptimized
        />
      ) : (
        <div
          key={`fallback-${current}`}
          className="absolute inset-0"
          style={{ background: BRAND_GRADIENT, animation: 'nc-fade-img 0.5s ease-out' }}
        />
      )}

      {/* Gradient overlay para legibilidade do título */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.45) 72%, rgba(0,0,0,0.85) 100%)',
        }}
      />

      {/* Dots — topo */}
      {canNavigate && (
        <div className="absolute inset-x-0 top-3 z-10 flex justify-center gap-1.5">
          {news.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`Ir para notícia ${i + 1}`}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === current ? 22 : 6,
                background: i === current ? '#3B82F6' : 'rgba(255,255,255,0.55)',
                boxShadow: i === current ? '0 0 0 1px rgba(255,255,255,0.2)' : undefined,
              }}
            />
          ))}
        </div>
      )}

      {/* Arrows frosted-glass — hover */}
      {canNavigate && (
        <>
          <button
            type="button"
            onClick={() => go(current - 1)}
            aria-label="Anterior"
            className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 text-white opacity-0 transition-all duration-200 hover:scale-105 hover:bg-white/25 group-hover:opacity-100"
            style={{
              background: 'rgba(255,255,255,0.14)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            }}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => go(current + 1)}
            aria-label="Próximo"
            className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 text-white opacity-0 transition-all duration-200 hover:scale-105 hover:bg-white/25 group-hover:opacity-100"
            style={{
              background: 'rgba(255,255,255,0.14)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            }}
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}

      {/* Título + source + Leia — overlay inferior */}
      <div
        key={`content-${current}`}
        className="absolute inset-x-0 bottom-0 z-[5] flex flex-col gap-2 p-4"
        style={{ animation: 'nc-fade 0.5s ease-out' }}
      >
        {item.source && (
          <span
            className="inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white shadow-sm"
            style={{ background: '#3B82F6' }}
          >
            {item.source}
          </span>
        )}
        <div className="flex items-end justify-between gap-3">
          <h3 className="line-clamp-2 text-[14px] font-bold leading-snug text-white drop-shadow-sm">
            {item.title}
          </h3>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-white/25"
            style={{
              background: 'rgba(255,255,255,0.14)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
            }}
          >
            Leia →
          </a>
        </div>
      </div>
    </div>
  );
}
