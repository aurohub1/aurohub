"use client";

import { useEffect, useState } from "react";

export interface WeatherState {
  temp: number;
  code: number;
}

/**
 * Hook compartilhado de previsão do tempo via open-meteo.
 * Se `city` for passada, geocoda; caso contrário usa coords default (Rio Preto/SP).
 */
export function useWeather(city?: string | null): { weather: WeatherState | null; cityName: string } {
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [cityName, setCityName] = useState<string>(city?.trim() || "Rio Preto");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let lat = -20.8116, lon = -49.3755;
      const trimmed = city?.trim();

      if (trimmed) {
        setCityName(trimmed);
        try {
          const geo = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(trimmed)}&count=1&language=pt&country=BR`
          );
          if (geo.ok) {
            const g = await geo.json();
            const r = g?.results?.[0];
            if (r?.latitude && r?.longitude) { lat = r.latitude; lon = r.longitude; }
          }
        } catch { /* silent */ }
      }

      try {
        const w = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=America/Sao_Paulo`
        );
        if (!w.ok) return;
        const d = await w.json();
        if (!cancelled && d?.current) {
          setWeather({ temp: Math.round(d.current.temperature_2m), code: d.current.weather_code });
        }
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [city]);

  return { weather, cityName };
}
