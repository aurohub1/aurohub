"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile, type FullProfile } from "@/lib/auth";
import { Send, Bell, Sun, CloudSun, Cloud, CloudRain, CloudFog, CloudLightning, CloudSnow } from "lucide-react";

function WeatherIcon({ code, size = 22 }: { code: number | null; size?: number }) {
  const color = "#FF7A1A";
  if (code === null) return <Cloud size={size} color={color} />;
  if (code === 0) return <Sun size={size} color={color} />;
  if (code <= 3) return <CloudSun size={size} color={color} />;
  if (code <= 48) return <CloudFog size={size} color={color} />;
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return <CloudRain size={size} color={color} />;
  if (code >= 71 && code <= 77) return <CloudSnow size={size} color={color} />;
  if (code >= 95) return <CloudLightning size={size} color={color} />;
  return <Cloud size={size} color={color} />;
}

export default function VendedorInicioPage() {
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [postsHoje, setPostsHoje] = useState<number>(0);
  const [lembretes, setLembretes] = useState<number>(0);
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=-20.8116&longitude=-49.3755&current=temperature_2m,weather_code&timezone=America/Sao_Paulo")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.current) setWeather({ temp: Math.round(d.current.temperature_2m), code: d.current.weather_code }); })
      .catch(() => { /* silent */ });
  }, []);

  useEffect(() => {
    (async () => {
      const p = await getProfile(supabase);
      setProfile(p);
      const inicioDia = new Date();
      inicioDia.setHours(0, 0, 0, 0);
      const [postsRes, lembRes] = await Promise.all([
        supabase.from("activity_logs").select("id", { count: "exact", head: true }).gte("created_at", inicioDia.toISOString()).eq("event_type", "post_instagram"),
        supabase.from("scheduled_posts").select("id", { count: "exact", head: true }).gte("scheduled_for", new Date().toISOString()),
      ]);
      setPostsHoje(postsRes.count ?? 0);
      setLembretes(lembRes.count ?? 0);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-[13px] text-[var(--txt3)]">Carregando...</div>;

  return (
    <>
      <div className="card-glass relative overflow-hidden px-8 py-7">
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ background: "linear-gradient(135deg, #1E3A6E 0%, #FF7A1A 50%, #D4A843 100%)" }} />
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#FF7A1A]">Painel do Vendedor</p>
            <h1 className="mt-1.5 font-[family-name:var(--font-dm-serif)] text-[24px] font-bold leading-tight text-[var(--txt)]">
              Olá, {profile?.name?.split(" ")[0] || "vendedor"}
            </h1>
            <p className="mt-1 text-[13px] text-[var(--txt3)]">{profile?.store?.name || "—"}</p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-[var(--bdr)] px-4 py-2.5" style={{ background: "linear-gradient(135deg, rgba(255,122,26,0.08), rgba(59,130,246,0.05))", backdropFilter: "blur(10px)" }}>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "linear-gradient(135deg, rgba(255,122,26,0.18), rgba(30,58,110,0.14))", border: "1px solid rgba(255,255,255,0.08)" }}>
              <WeatherIcon code={weather?.code ?? null} />
            </div>
            <div>
              <div className="font-[family-name:var(--font-dm-serif)] text-[22px] font-bold leading-none text-[var(--txt)] tabular-nums">
                {weather ? `${weather.temp}°` : "—"}
              </div>
              <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--txt3)]">Rio Preto</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard icon={<Send size={22} />} label="Posts do dia" value={String(postsHoje)} hint="Publicações hoje" />
        <StatCard icon={<Bell size={22} />} label="Lembretes" value={String(lembretes)} hint="Agendados futuros" />
        <StatCard icon={<Sun size={22} />} label="Calendário turismo" value="—" hint="Datas da semana" />
      </div>
    </>
  );
}

function StatCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="card-glass flex items-start gap-4 px-5 py-5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[#FF7A1A]" style={{ background: "linear-gradient(135deg, rgba(255,122,26,0.18), rgba(30,58,110,0.12))", border: "1px solid rgba(255,255,255,0.08)" }}>
        {icon}
      </div>
      <div>
        <div className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-[var(--txt3)]">{label}</div>
        <div className="font-[family-name:var(--font-dm-serif)] text-[1.5rem] font-bold leading-none text-[var(--txt)]">{value}</div>
        {hint && <div className="mt-1 text-[11px] text-[var(--txt3)]">{hint}</div>}
      </div>
    </div>
  );
}
