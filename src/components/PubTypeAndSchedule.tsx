"use client";

import { ChevronDown } from "lucide-react";

type PubType = "stories" | "feed" | "reels" | "carrossel";
type ScheduleMode = "now" | "schedule";

const PUB_TYPES: { key: PubType; label: string; desc: string }[] = [
  { key: "stories", label: "Stories", desc: "9:16" },
  { key: "feed", label: "Feed", desc: "1:1" },
  { key: "reels", label: "Reels", desc: "Vídeo 9:16" },
  { key: "carrossel", label: "Carrossel", desc: "Múltiplas" },
];

interface Props {
  pubType: PubType;
  onPubTypeChange: (t: PubType) => void;
  scheduleMode: ScheduleMode;
  onScheduleModeChange: (m: ScheduleMode) => void;
  scheduledAt: string;
  onScheduledAtChange: (v: string) => void;
}

export default function PubTypeAndSchedule({
  pubType, onPubTypeChange,
  scheduleMode, onScheduleModeChange,
  scheduledAt, onScheduledAtChange,
}: Props) {
  return (
    <>
      {/* Tipo de Publicação */}
      <div className="border-t border-[var(--bdr)] pt-4">
        <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-[var(--txt3)]">
          Tipo de Publicação
        </label>
        <div className="flex flex-wrap gap-1.5">
          {PUB_TYPES.map(t => {
            const active = pubType === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => onPubTypeChange(t.key)}
                className="rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition-colors"
                style={active
                  ? { borderColor: "var(--orange)", background: "rgba(255,122,26,0.08)", color: "var(--orange)" }
                  : { borderColor: "var(--bdr)", color: "var(--txt3)" }
                }
              >
                {t.label}
                <span className="ml-1 text-[8px] opacity-60">{t.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Agendamento */}
      <div className="border-t border-[var(--bdr)] pt-4">
        <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-[var(--txt3)]">
          Quando publicar
        </label>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onScheduleModeChange("now")}
            className="flex-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition-colors"
            style={scheduleMode === "now"
              ? { borderColor: "var(--orange)", background: "rgba(255,122,26,0.08)", color: "var(--orange)" }
              : { borderColor: "var(--bdr)", color: "var(--txt3)" }
            }
          >
            Agora
          </button>
          <button
            type="button"
            onClick={() => onScheduleModeChange("schedule")}
            className="flex-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold transition-colors"
            style={scheduleMode === "schedule"
              ? { borderColor: "var(--orange)", background: "rgba(255,122,26,0.08)", color: "var(--orange)" }
              : { borderColor: "var(--bdr)", color: "var(--txt3)" }
            }
          >
            Agendar
          </button>
        </div>
        {scheduleMode === "schedule" && (
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => onScheduledAtChange(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="mt-2 w-full rounded-lg border border-[var(--bdr)] bg-[var(--bg1)] px-3 py-1.5 text-[11px] text-[var(--txt)] focus:border-[var(--orange)] focus:outline-none"
          />
        )}
      </div>
    </>
  );
}

export type { PubType, ScheduleMode };
