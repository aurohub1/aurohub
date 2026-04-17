"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { PublicationRow, TIPO_COLOR } from "./types";

interface Props {
  rows: PublicationRow[];
  days: number;
}

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
  return (
    <div className="rounded-xl shadow-sm bg-white border border-slate-100 p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-800">Publicações e downloads por dia</h3>
        <p className="text-xs text-slate-500">Últimos {days} dias</p>
      </div>
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748B" }} />
            <YAxis tick={{ fontSize: 11, fill: "#64748B" }} allowDecimals={false} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
            <Bar dataKey="publicado" name="Publicado" fill={TIPO_COLOR.publicado} radius={[4, 4, 0, 0]} />
            <Bar dataKey="download" name="Download" fill={TIPO_COLOR.download} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
