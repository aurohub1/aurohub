"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

type Range = 7 | 30 | 90;

interface DayData {
  label: string;
  count: number;
}

export default function PostsChart() {
  const [range, setRange] = useState<Range>(7);
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const loadData = useCallback(async (days: Range) => {
    setLoading(true);
    try {
      const results: DayData[] = [];
      const now = new Date();

      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split("T")[0];

        const { count } = await supabase
          .from("activity_logs")
          .select("*", { count: "exact", head: true })
          .gte("created_at", `${dateStr}T00:00:00`)
          .lte("created_at", `${dateStr}T23:59:59`);

        results.push({
          label:
            days <= 7
              ? d.toLocaleDateString("pt-BR", { weekday: "short", day: "numeric" })
              : d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }),
          count: count ?? 0,
        });
      }

      setData(results);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(range);
  }, [range, loadData]);

  useEffect(() => {
    if (!canvasRef.current || data.length === 0) return;
    drawChart(canvasRef.current, data);
  }, [data]);

  // Redesenha o canvas quando o container muda de tamanho (janela maximiza/restaura,
  // sidebar abre/fecha). Sem isso, o bitmap interno fica no tamanho antigo e o browser
  // estica a imagem → distorção.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const ro = new ResizeObserver(() => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        if (canvasRef.current && data.length > 0) drawChart(canvasRef.current, data);
      }, 100);
    });
    ro.observe(canvas);
    return () => {
      ro.disconnect();
      if (t) clearTimeout(t);
    };
  }, [data]);

  function handleRange(r: Range) {
    setRange(r);
  }

  return (
    <div className="card-glass flex flex-col p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[13px] font-bold text-[var(--txt)]">Posts por dia</h3>
        <div className="flex gap-1">
          {([7, 30, 90] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => handleRange(r)}
              className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
                range === r
                  ? "bg-[var(--orange3)] text-[var(--orange)]"
                  : "text-[var(--txt3)] hover:text-[var(--txt2)]"
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-[200px] w-full">
        {loading ? (
          <div className="flex h-full items-center justify-center text-[12px] text-[var(--txt3)]">
            Carregando...
          </div>
        ) : data.every((d) => d.count === 0) ? (
          <div className="flex h-full items-center justify-center text-[12px] text-[var(--txt3)]">
            Nenhum post no periodo
          </div>
        ) : (
          <canvas ref={canvasRef} className="h-full w-full" />
        )}
      </div>
    </div>
  );
}

/* ── Canvas chart renderer ───────────────────────── */

function drawChart(canvas: HTMLCanvasElement, data: DayData[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const cs = getComputedStyle(document.documentElement);
  const colorTxt3 = cs.getPropertyValue("--txt3").trim() || "#4A5878";
  const colorBg = cs.getPropertyValue("--bg").trim() || "#060B16";
  const colorBdr = cs.getPropertyValue("--bdr").trim() || "rgba(255,255,255,0.04)";

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const padTop = 10;
  const padBottom = 30;
  const padLeft = 30;
  const padRight = 10;

  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;

  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const points = data.map((d, i) => ({
    x: padLeft + (i / (data.length - 1 || 1)) * chartW,
    y: padTop + chartH - (d.count / maxVal) * chartH,
  }));

  ctx.clearRect(0, 0, w, h);

  // Grid lines
  ctx.strokeStyle = colorBdr;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padTop + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(w - padRight, y);
    ctx.stroke();
  }

  // Y-axis labels
  ctx.fillStyle = colorTxt3;
  ctx.font = "11px 'DM Sans', sans-serif";
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const val = Math.round((maxVal / 4) * (4 - i));
    const y = padTop + (chartH / 4) * i;
    ctx.fillText(String(val), padLeft - 6, y + 4);
  }

  // Gradient fill
  const gradient = ctx.createLinearGradient(0, padTop, 0, h - padBottom);
  gradient.addColorStop(0, "rgba(255,122,26,0.25)");
  gradient.addColorStop(1, "rgba(255,122,26,0)");

  ctx.beginPath();
  ctx.moveTo(points[0].x, h - padBottom);
  points.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, h - padBottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    ctx.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y);
  }
  ctx.strokeStyle = "#FF7A1A";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Points
  points.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#FF7A1A";
    ctx.fill();
    ctx.strokeStyle = colorBg;
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // X-axis labels
  ctx.fillStyle = colorTxt3;
  ctx.font = "11px 'DM Sans', sans-serif";
  ctx.textAlign = "center";
  const step = data.length <= 10 ? 1 : Math.ceil(data.length / 8);
  data.forEach((d, i) => {
    if (i % step === 0 || i === data.length - 1) {
      ctx.fillText(d.label, points[i].x, h - 8);
    }
  });
}
