"use client";
import { useState } from "react";
import SplashScreen, { type SplashEffect } from "@/components/splash/SplashScreen";

const LOGO = "https://res.cloudinary.com/dxgj4bcch/image/upload/page/page/logo_aurovista.png";

const EFFECTS: SplashEffect[] = [
  "particles","cinematic","slideup","scalefade","fadesuave",
  "ondas","flutuacao","scanner","holofote","chuvapontos",
  "gradiente","dissolve","bigbang","aurora","tinta","vagalumes",
  "aurora_espacial","universo","galaxia","vidro",
];

export default function SplashPreview() {
  const [current, setCurrent] = useState<SplashEffect | null>(null);

  return (
    <div className="min-h-screen bg-[#0E1520] p-8">
      <h1 className="text-white text-2xl font-bold mb-6">Preview — 19 Efeitos Splash</h1>
      <div className="grid grid-cols-4 gap-3">
        {EFFECTS.map((ef) => (
          <button key={ef} onClick={() => setCurrent(ef)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[12px] font-semibold text-white hover:bg-white/10 transition-all">
            {ef}
          </button>
        ))}
      </div>
      {current && (
        <SplashScreen
          logoUrl={LOGO}
          effect={current}
          cor1="#FF7A1A" cor2="#D4A843" cor3="#1E3A6E"
          corFundo="#0E1520"
          onDone={() => setCurrent(null)}
        />
      )}
    </div>
  );
}
