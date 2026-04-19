"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { PublicationRow, Formato, FORMATO_LABEL, FORMATO_COLOR } from "./types";

interface Props { rows: PublicationRow[]; }

export default function PieByFormat({ rows }: Props) {
  const counts: Record<Formato, number> = { stories: 0, reels: 0, feed: 0, tv: 0 };
  for (const r of rows) {
    if (r.formato in counts) counts[r.formato]++;
  }
  const data = (Object.keys(counts) as Formato[])
    .map(k => ({ name: FORMATO_LABEL[k], value: counts[k], key: k }))
    .filter(d => d.value > 0);

  const [winW, setWinW] = useState(0);
  // Mesmo fix do BarsByDay: ResponsiveContainer segura dimensões antigas dentro de grid/flex
  // quando a janela maximiza/restaura. `key={winW}` força remount; `minWidth={0}` deixa
  // o SVG encolher. Debounce no listener pra não re-renderizar a cada pixel.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => setWinW(window.innerWidth), 150);
    };
    setWinW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (t) clearTimeout(t);
    };
  }, []);

  return (
    <div
      className="p-5"
      style={{
        background: "var(--input-bg)",
        border: "1px solid var(--bdr2)",
        borderRadius: 20,
      }}
    >
      <div className="mb-3">
        <h3 className="text-sm font-semibold" style={{ color: "var(--txt)" }}>Distribuição por formato</h3>
        <p className="text-xs" style={{ color: "var(--txt3)" }}>Total do período</p>
      </div>
      <div style={{ width: "100%", minWidth: 0, height: 200 }}>
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm" style={{ color: "var(--txt3)" }}>
            Sem dados no período.
          </div>
        ) : (
          <ResponsiveContainer key={winW} width="100%" height="100%" minWidth={0} debounce={100}>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={3} stroke="none">
                {data.map((d) => (
                  <Cell key={d.key} fill={FORMATO_COLOR[d.key as Formato]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--card-bg)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid var(--bdr2)",
                  borderRadius: 10,
                  fontSize: 12,
                  color: "var(--txt)",
                  boxShadow: "var(--sh2)",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: "var(--txt2)" }}
                iconType="circle"
                iconSize={8}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
