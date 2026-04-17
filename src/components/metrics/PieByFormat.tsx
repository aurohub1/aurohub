"use client";

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

  return (
    <div className="rounded-xl shadow-sm bg-white border border-slate-100 p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-800">Distribuição por formato</h3>
        <p className="text-xs text-slate-500">Total de registros do período</p>
      </div>
      <div style={{ width: "100%", height: 280 }}>
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Sem dados no período.
          </div>
        ) : (
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                {data.map((d) => (
                  <Cell key={d.key} fill={FORMATO_COLOR[d.key as Formato]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
