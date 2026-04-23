"use client";
import { useRef, useEffect } from "react";

interface Tab { id: string; label: string; color: string; }

interface Props {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
}

export default function SlidingTabs({ tabs, active, onChange }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  function movePill(btn: HTMLButtonElement) {
    const wrap = wrapRef.current;
    const pill = pillRef.current;
    if (!wrap || !pill) return;
    const wr = wrap.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    pill.style.left = (br.left - wr.left + wrap.scrollLeft) + "px";
    pill.style.width = br.width + "px";
  }

  useEffect(() => {
    setTimeout(() => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const btn = wrap.querySelector(`button[data-active="true"]`) as HTMLButtonElement;
      if (btn) {
        movePill(btn);
        if (barRef.current) {
          const t = tabs.find(t => t.id === active);
          if (t) barRef.current.style.background = t.color;
        }
      }
    }, 300);
  }, [active]);

  return (
    <div
      ref={wrapRef}
      style={{
        position: "relative",
        background: "color-mix(in srgb, var(--brand-primary) 8%, var(--bg2))",
        borderRadius: "12px",
        padding: "3px",
        display: "flex",
        gap: 0,
        overflowX: "auto",
        scrollbarWidth: "none",
        flex: 1,
        boxShadow: "inset 0 1px 3px rgba(0,0,0,0.08),inset 0 0 0 1px rgba(0,0,0,0.05)",
      }}
    >
      <div
        ref={pillRef}
        style={{
          position: "absolute", top: "3px", height: "calc(100% - 6px)",
          background: "linear-gradient(180deg,rgba(0,0,0,0.0) 0%,var(--bg1) 100%)",
          borderRadius: "9px",
          boxShadow: "0 0 0 0.5px var(--bdr),inset 0 1px 0 rgba(255,255,255,0.9),inset 0 -1px 0 rgba(0,0,0,0.04),0 1px 3px rgba(0,0,0,0.1)",
          transition: "left .28s cubic-bezier(.4,0,.2,1), width .28s cubic-bezier(.4,0,.2,1)",
          pointerEvents: "none", zIndex: 0, overflow: "hidden",
        }}
      >
        <div ref={barRef} style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2.5px", borderRadius: "2px 2px 0 0", transition: "background .28s" }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "55%", background: "rgba(0,0,0,0.03)", borderRadius: "9px 9px 0 0", pointerEvents: "none" }} />
      </div>

      {tabs.map(t => (
        <button
          key={t.id}
          data-active={active === t.id ? "true" : "false"}
          onClick={(e) => {
            onChange(t.id);
            movePill(e.currentTarget);
            if (barRef.current) barRef.current.style.background = t.color;
          }}
          style={{
            position: "relative", zIndex: 1,
            padding: "5px 13px", borderRadius: "9px", border: "none",
            background: "transparent",
            fontSize: "11px",
            fontWeight: active === t.id ? 600 : 500,
            letterSpacing: ".05em", textTransform: "uppercase",
            color: active === t.id ? "var(--txt1)" : "var(--txt3)",
            cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap",
            transition: "color .2s, font-weight .1s",
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
