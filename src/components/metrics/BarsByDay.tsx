"use client";

import { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { PublicationRow } from "./types";

interface Props { rows: PublicationRow[]; days: number; }

interface Bucket { date: string; label: string; publicado: number; download: number; }

function buildBuckets(rows: PublicationRow[], days: number): Bucket[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const buckets: Bucket[] = [];
  const map = new Map<string, Bucket>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const b: Bucket = { date: key, label, publicado: 0, download: 0 };
    buckets.push(b);
    map.set(key, b);
  }
  for (const r of rows) {
    const key = r.created_at.slice(0, 10);
    const b = map.get(key);
    if (!b) continue;
    if (r.tipo === "publicado") b.publicado++;
    else if (r.tipo === "download") b.download++;
  }
  return buckets;
}

export default function BarsByDay({ rows, days }: Props) {
  const data = buildBuckets(rows, days);
  const [winW, setWinW] = useState(0);

  // Recharts ResponsiveContainer às vezes segura dimensões antigas dentro de grid/flex
  // quando a janela maximiza/restaura. Ouvimos `resize` com debounce e usamos o valor
  // como `key` pra forçar remount. `minWidth={0}` deixa o SVG encolher no flex/grid.
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
      className="p-6"
      style={{
        background: "var(--input-bg)",
        border: "1px solid var(--bdr2)",
        borderRadius: 20,
      }}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold" style={{ color: "var(--txt)" }}>Publicações e downloads por dia</h3>
        <p className="text-xs" style={{ color: "var(--txt3)" }}>Últimos {days} dias</p>
      </div>
      <div style={{ width: "100%", minWidth: 0 }}>
        <ResponsiveContainer key={winW} width="100%" height={320} minWidth={0} debounce={100}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="fillPublicado" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fillDownload" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF7A1A" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#FF7A1A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--bdr)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "var(--txt3)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--bdr)" }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--txt3)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--bdr)" }}
              allowDecimals={false}
            />
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
              labelStyle={{ color: "var(--txt2)", fontWeight: 600, marginBottom: 4 }}
              cursor={{ stroke: "var(--bdr2)" }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 12, color: "var(--txt2)" }}
              iconType="circle"
            />
            <Area
              type="monotone"
              dataKey="publicado"
              name="Publicado"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="url(#fillPublicado)"
              dot={false}
              activeDot={{ r: 5, stroke: "#3B82F6", strokeWidth: 2, fill: "var(--card-bg)" }}
              style={{ filter: "drop-shadow(0 0 6px #3B82F6)" }}
            />
            <Area
              type="monotone"
              dataKey="download"
              name="Download"
              stroke="#FF7A1A"
              strokeWidth={2}
              fill="url(#fillDownload)"
              dot={false}
              activeDot={{ r: 5, stroke: "#FF7A1A", strokeWidth: 2, fill: "var(--card-bg)" }}
              style={{ filter: "drop-shadow(0 0 6px #FF7A1A)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
