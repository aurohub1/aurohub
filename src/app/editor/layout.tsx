"use client";

import { useEffect } from "react";

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const saved = localStorage.getItem("ah_theme") as "dark" | "light" | null;
    document.documentElement.setAttribute("data-theme", saved || "light");
  }, []);

  return (
    <>
      {/* Preload dos pesos mais usados no editor */}
      <link rel="preload" href="https://res.cloudinary.com/dxgj4bcch/raw/upload/HELVETICANEUEBOLD_mzadvj.OTF" as="font" type="font/otf" crossOrigin="anonymous" />
      <link rel="preload" href="https://res.cloudinary.com/dxgj4bcch/raw/upload/HELVETICANEUEHEAVY_q77zuw.OTF" as="font" type="font/otf" crossOrigin="anonymous" />
      <style>{`
        @font-face { font-family: "Helvetica Neue"; font-weight: 100; font-style: normal; src: url("https://res.cloudinary.com/dxgj4bcch/raw/upload/HELVETICANEUETHIN_eio2kz.OTF") format("opentype"); font-display: swap; }
        @font-face { font-family: "Helvetica Neue"; font-weight: 100; font-style: italic; src: url("https://res.cloudinary.com/dxgj4bcch/raw/upload/HELVETICANEUETHINITALIC_vg46ju.OTF") format("opentype"); font-display: swap; }
        @font-face { font-family: "Helvetica Neue"; font-weight: 200; font-style: normal; src: url("https://res.cloudinary.com/dxgj4bcch/raw/upload/HELVETICANEUEULTRALIGHT_asb6mk.OTF") format("opentype"); font-display: swap; }
        @font-face { font-family: "Helvetica Neue"; font-weight: 200; font-style: italic; src: url("https://res.cloudinary.com/dxgj4bcch/raw/upload/HELVETICANEUEULTRALIGHTITALIC_kc8xnm.OTF") format("opentype"); font-display: swap; }
        @font-face { font-family: "Helvetica Neue"; font-weight: 300; font-style: normal; src: url("https://res.cloudinary.com/dxgj4bcch/raw/upload/HELVETICANEUELIGHT_jtornt.OTF") format("opentype"); font-display: swap; }
        @font-face { font-family: "Helvetica Neue"; font-weight: 300; font-style: italic; src: url("https://res.cloudinary.com/dxgj4bcch/raw/upload/HELVETICANEUELIGHTITALIC_s2wsig.OTF") format("opentype"); font-display: swap; }
        @font-face { font-family: "Helvetica Neue"; font-weight: 400; font-style: italic; src: url("https://res.cloudinary.com/dxgj4bcch/raw/upload/HELVETICANEUEITALIC_dav94r.TTF") format("truetype"); font-display: swap; }
        @font-face { font-family: "Helvetica Neue"; font-weight: 500; font-style: normal; src: url("https://res.cloudinary.com/dxgj4bcch/raw/upload/HELVETICANEUEMEDIUM_cseel0.OTF") format("opentype"); font-display: swap; }
        @font-face { font-family: "Helvetica Neue"; font-weight: 500; font-style: italic; src: url("https://res.cloudinary.com/dxgj4bcch/raw/upload/HELVETICANEUEMEDIUMITALIC_zeeleq.OTF") format("opentype"); font-display: swap; }
        @font-face { font-family: "Helvetica Neue"; font-weight: 700; font-style: italic; src: url("https://res.cloudinary.com/dxgj4bcch/raw/upload/HELVETICANEUEBOLDITALIC_qpu01w.OTF") format("opentype"); font-display: swap; }
        @font-face { font-family: "Helvetica Neue"; font-weight: 800; font-style: italic; src: url("https://res.cloudinary.com/dxgj4bcch/raw/upload/HELVETICANEUEHEAVYITALIC_irq69g.OTF") format("opentype"); font-display: optional; }
        @font-face { font-family: "Helvetica Neue"; font-weight: 900; font-style: normal; src: url("https://res.cloudinary.com/dxgj4bcch/raw/upload/HELVETICANEUEBLACK_os5dq7.OTF") format("opentype"); font-display: optional; }
        @font-face { font-family: "Helvetica Neue"; font-weight: 900; font-style: italic; src: url("https://res.cloudinary.com/dxgj4bcch/raw/upload/HELVETICANEUEBLACKITALIC_pd4dtg.OTF") format("opentype"); font-display: optional; }
      `}</style>
      <style>{`
        :root, [data-theme="light"] {
          --ed-bg: #f5f7fa;
          --ed-surface: #ffffff;
          --ed-surface2: #f0f4f8;
          --ed-canvas-bg: #e8ecf0;
          --ed-txt: #1a1a2e;
          --ed-txt2: #57606a;
          --ed-txt3: #8b949e;
          --ed-bdr: #d0d7de;
          --ed-input: #f6f8fa;
          --ed-input-bdr: #d0d7de;
          --ed-hover: #f0f4f8;
          --ed-active: rgba(59,130,246,0.1);
          --ed-active-txt: #3B82F6;
          --ed-accent: #3B82F6;
          --ed-bind: #1E3A6E;
          --ed-orange: #FF7A1A;
          --ed-navy: #1E3A6E;
          --ed-danger: #cf222e;
          --ed-green: #1a7f37;
        }
        [data-theme="dark"] {
          --ed-bg: #0d1117;
          --ed-surface: #161b22;
          --ed-surface2: #1c2128;
          --ed-canvas-bg: #0d1117;
          --ed-txt: #e6edf3;
          --ed-txt2: #8b949e;
          --ed-txt3: #484f58;
          --ed-bdr: #30363d;
          --ed-input: #161b22;
          --ed-input-bdr: #30363d;
          --ed-hover: #1c2128;
          --ed-active: rgba(59,130,246,0.15);
          --ed-active-txt: #3B82F6;
          --ed-accent: #3B82F6;
          --ed-bind: #FFFFFF;
          --ed-orange: #FF7A1A;
          --ed-navy: #1E3A6E;
          --ed-danger: #f85149;
          --ed-green: #3fb950;
        }
.react-colorful { width: 100% !important; height: 120px !important; border-radius: 6px !important; }
        .react-colorful__saturation { border-radius: 6px 6px 0 0 !important; }
        .react-colorful__hue { height: 10px !important; border-radius: 0 0 6px 6px !important; }
        .react-colorful__pointer { width: 14px !important; height: 14px !important; }
      `}</style>
      {children}
    </>
  );
}
