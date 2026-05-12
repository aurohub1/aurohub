"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export interface DestinationItem {
  name: string;
  lat?: number;
  lon?: number;
  country?: string;
}

interface Suggestion {
  city: string;
  state: string;
  country: string;
  lat: number;
  lon: number;
}

const GKEY = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY ?? "";

interface CitySearchProps {
  placeholder?: string;
  onSelect: (item: DestinationItem) => void;
  inputStyle?: React.CSSProperties;
}

export function CitySearch({ placeholder = "ex: Lisboa, Portugal", onSelect, inputStyle }: CitySearchProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (!GKEY || q.length < 2) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    try {
      const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(q)}&type=city&lang=pt&limit=6&apiKey=${GKEY}`;
      const res = await fetch(url);
      const json = await res.json() as { features?: Array<{ properties: Record<string, unknown> }> };
      const items: Suggestion[] = (json.features ?? []).map(f => ({
        city: ((f.properties.city ?? f.properties.name) as string) || "",
        state: (f.properties.state as string) || "",
        country: (f.properties.country as string) || "",
        lat: (f.properties.lat as number) || 0,
        lon: (f.properties.lon as number) || 0,
      }));
      setSuggestions(items);
      setOpen(items.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleChange(v: string) {
    setQuery(v);
    if (debRef.current) clearTimeout(debRef.current);
    debRef.current = setTimeout(() => search(v), 300);
  }

  function commit(name: string, s?: Suggestion) {
    if (!name.trim()) return;
    onSelect({ name: name.trim(), lat: s?.lat, lon: s?.lon, country: s?.country });
    setQuery("");
    setSuggestions([]);
    setOpen(false);
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={wrapRef} style={{ position: "relative", flex: 1 }}>
      <style>{`@keyframes cs-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{ position: "relative" }}>
        <input
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={e => { if (e.key === "Enter") commit(query); }}
          placeholder={placeholder}
          style={inputStyle}
          autoComplete="off"
        />
        {loading && (
          <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
            <svg viewBox="0 0 24 24" fill="none" style={{ width: 14, height: 14, animation: "cs-spin 0.7s linear infinite" }}>
              <circle cx="12" cy="12" r="10" stroke="var(--bdr)" strokeWidth="3"/>
              <path d="M12 2a10 10 0 0110 10" stroke="var(--orange)" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 200,
          background: "var(--bg1)", border: "1px solid var(--bdr)", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)", overflow: "hidden",
        }}>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onMouseDown={e => { e.preventDefault(); commit([s.city, s.country].filter(Boolean).join(", "), s); }}
              style={{
                width: "100%", padding: "9px 14px", textAlign: "left", background: "none",
                border: "none", cursor: "pointer", display: "flex", flexDirection: "column", gap: 2,
                borderBottom: i < suggestions.length - 1 ? "1px solid var(--bdr)" : "none",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--bg2)")}
              onMouseLeave={e => (e.currentTarget.style.background = "none")}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--txt)" }}>{s.city}</span>
              <span style={{ fontSize: 11, color: "var(--txt3)" }}>{[s.state, s.country].filter(Boolean).join(", ")}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
