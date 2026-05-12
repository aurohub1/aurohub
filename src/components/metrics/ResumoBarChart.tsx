"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ChartEntry {
  name: string;
  stories?: number;
  feed?: number;
  reels?: number;
  tv?: number;
  download?: number;
  [key: string]: string | number | undefined;
}

interface ResumoBarChartProps {
  data: ChartEntry[];
  colors: Record<string, string>;
}

export default function ResumoBarChart({ data, colors }: ResumoBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--bdr)" />
        <XAxis dataKey="name" stroke="var(--txt2)" />
        <YAxis stroke="var(--txt2)" />
        <Tooltip contentStyle={{ background: "var(--card-bg)", border: "1px solid var(--bdr)" }} />
        <Legend />
        <Bar dataKey="stories"  name="Stories"  fill={colors.stories} />
        <Bar dataKey="feed"     name="Feed"     fill={colors.feed} />
        <Bar dataKey="reels"    name="Reels"    fill={colors.reels} />
        <Bar dataKey="tv"       name="TV"       fill={colors.tv} />
        <Bar dataKey="download" name="Download" fill={colors.download} />
      </BarChart>
    </ResponsiveContainer>
  );
}
